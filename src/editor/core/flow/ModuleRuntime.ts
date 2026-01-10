import type {
  ModuleGraph,
  ModuleFlowNode,
  ModuleConditionNode,
  ModuleLiteral,
  ModuleEdge,
} from "../../types/Module";
import { ActionRegistry, type ActionContext } from "../events/ActionRegistry";

type ModuleStatus = "running" | "success" | "failed";

export type ModuleResult =
  | { status: "success" }
  | { status: "failed"; errorCode: string; nodeId: string };

export type ModuleRuntimeEntity = {
  id: string;
  x?: number;
  y?: number;
  rotationZ?: number;
  variables?: Array<{ name: string; value: unknown }>;
};

export type ModuleRuntimeHooks = {
  getEntity: (id: string) => ModuleRuntimeEntity | undefined;
  setVar: (entityId: string, name: string, value: ModuleLiteral) => void;
  getActionContext: (entityId: string, dt: number) => ActionContext;
};

type ModuleInstance = {
  id: string;
  entityId: string;
  moduleId: string;
  graph: ModuleGraph;
  cursorNodeId: string;
  status: ModuleStatus;
  error?: { code: string; nodeId: string };
  nodeState: Record<string, Record<string, unknown>>;
  valueSnapshots: Map<string, ModuleLiteral>;
  moduleVariables: Map<string, ModuleLiteral>;
};

const MAX_STEPS_PER_TICK = 64;

export class ModuleRuntime {
  private hooks: ModuleRuntimeHooks;
  private instances: ModuleInstance[] = [];

  constructor(hooks: ModuleRuntimeHooks) {
    this.hooks = hooks;
  }

  startModule(entityId: string, module: ModuleGraph): ModuleInstance | null {
    const entry = module.nodes.find((n) => n.id === module.entryNodeId && n.kind === "Entry");
    if (!entry) {
      console.error("[ModuleRuntime] Missing entry node", { entityId, moduleId: module.id });
      return null;
    }
    const cycle = this.detectCycle(module);
    if (cycle) {
      console.error("[ModuleRuntime] Cycle detected", { entityId, moduleId: module.id });
      this.instances.push({
        id: crypto.randomUUID(),
        entityId,
        moduleId: module.id,
        graph: module,
        cursorNodeId: module.entryNodeId,
        status: "failed",
        error: { code: "CycleDetected", nodeId: module.entryNodeId },
        nodeState: {},
        valueSnapshots: new Map(),
        moduleVariables: new Map(
          (module.variables ?? []).map((v) => [v.name, (v.value as ModuleLiteral) ?? null])
        ),
      });
      return null;
    }

    const instance: ModuleInstance = {
      id: crypto.randomUUID(),
      entityId,
      moduleId: module.id,
      graph: module,
      cursorNodeId: module.entryNodeId,
      status: "running",
      nodeState: {},
      valueSnapshots: new Map(),
      moduleVariables: new Map(
        (module.variables ?? []).map((v) => [v.name, (v.value as ModuleLiteral) ?? null])
      ),
    };
    this.instances.push(instance);
    return instance;
  }

  removeEntity(entityId: string) {
    this.instances = this.instances.filter((inst) => inst.entityId !== entityId);
  }

  clear() {
    this.instances = [];
  }

  update(_time: number, dt: number): ModuleResult[] {
    const results: ModuleResult[] = [];
    const active: ModuleInstance[] = [];

    for (const instance of this.instances) {
      if (instance.status !== "running") {
        if (instance.status === "failed" && instance.error) {
          results.push({ status: "failed", errorCode: instance.error.code, nodeId: instance.error.nodeId });
        } else if (instance.status === "success") {
          results.push({ status: "success" });
        }
        continue;
      }

      const result = this.stepInstance(instance, dt);
      if (result?.status === "failed") {
        results.push(result);
        continue;
      }
      if (result?.status === "success") {
        results.push(result);
        continue;
      }
      active.push(instance);
    }

    this.instances = active;
    return results;
  }

  private stepInstance(instance: ModuleInstance, dt: number): ModuleResult | null {
    let safety = 0;
    while (instance.status === "running" && safety < MAX_STEPS_PER_TICK) {
      safety += 1;
      const node = instance.graph.nodes.find((n) => n.id === instance.cursorNodeId);
      if (!node) {
        return this.fail(instance, "NodeNotFound", instance.cursorNodeId);
      }

      if (node.kind === "Entry") {
        const next = this.getNextNodeId(instance.graph, node.id, "out");
        if (!next) return this.fail(instance, "MissingNext", node.id);
        instance.cursorNodeId = next;
        continue;
      }

      if (node.kind === "Merge") {
        const next = this.getNextNodeId(instance.graph, node.id, "out");
        if (!next) return this.fail(instance, "MissingNext", node.id);
        instance.cursorNodeId = next;
        continue;
      }

      if (node.kind === "Stop") {
        if (node.result === "Failed") {
          return this.fail(instance, node.errorCode ?? "Failed", node.id);
        }
        instance.status = "success";
        return { status: "success" };
      }

      if (node.kind === "Condition") {
        const passed = this.evaluateCondition(instance, node);
        const port = passed ? "true" : "false";
        const next = this.getNextNodeId(instance.graph, node.id, port);
        if (!next) return this.fail(instance, "MissingBranch", node.id);
        instance.cursorNodeId = next;
        continue;
      }

      if (node.kind === "Flow") {
        const flowResult = this.executeFlow(instance, node, dt);
        if (flowResult === "waiting") {
          return null;
        }
        if (flowResult === "failed") {
          return this.fail(instance, "FlowFailed", node.id);
        }
        const next = this.getNextNodeId(instance.graph, node.id, "out");
        if (!next) return this.fail(instance, "MissingNext", node.id);
        instance.cursorNodeId = next;
        continue;
      }

      return this.fail(instance, "InvalidNode", node.id);
    }
    return null;
  }

  private executeFlow(instance: ModuleInstance, node: ModuleFlowNode, dt: number): "done" | "waiting" | "failed" {
    if (node.flowType === "Instant") {
      return this.executeInstant(instance, node, dt) ? "done" : "failed";
    }
    return this.executeAsync(instance, node, dt);
  }

  private executeInstant(instance: ModuleInstance, node: ModuleFlowNode, dt: number): boolean {
    const ctx = this.hooks.getActionContext(instance.entityId, dt);
    switch (node.blockType) {
      case "SetVariable": {
        const target = String(node.params.target ?? "").trim();
        if (!target) return false;
        const value = this.resolveValueInput(instance, node.id, "value", node.params.value ?? null);
        if (instance.moduleVariables.has(target)) {
          instance.moduleVariables.set(target, value);
        } else {
          this.hooks.setVar(instance.entityId, target, value);
        }
        return true;
      }
      default: {
        const actionName = String(node.blockType ?? "").trim();
        if (!actionName) return false;
        const params = { ...(node.params ?? {}) } as Record<string, ModuleLiteral>;
        if (actionName === "SetVar") {
          const name = String(params.name ?? "").trim();
          params.value = this.resolveValueInput(instance, node.id, "value", params.value ?? null);
          if (name && instance.moduleVariables.has(name)) {
            instance.moduleVariables.set(name, params.value ?? null);
            return true;
          }
        }
        ActionRegistry.run(actionName, ctx, params as Record<string, unknown>);
        return true;
      }
    }
  }

  private executeAsync(instance: ModuleInstance, node: ModuleFlowNode, dt: number): "done" | "waiting" | "failed" {
    const state = this.getNodeState(instance, node.id);
    const ctx = this.hooks.getActionContext(instance.entityId, dt);

    switch (node.blockType) {
      case "Wait": {
        const seconds = Number(node.params.seconds ?? 0);
        if (!state.startedAt) {
          state.startedAt = performance.now();
        }
        const elapsed = (performance.now() - (state.startedAt as number)) / 1000;
        return elapsed >= seconds ? "done" : "waiting";
      }
      case "MoveTo": {
        const targetX = Number(node.params.x ?? 0);
        const targetY = Number(node.params.y ?? 0);
        const speed = Number(node.params.speed ?? 100);
        const entity = this.hooks.getEntity(instance.entityId);
        if (!entity) return "failed";
        ActionRegistry.run("MoveToward", ctx, { x: targetX, y: targetY, speed });
        const dx = (entity.x ?? 0) - targetX;
        const dy = (entity.y ?? 0) - targetY;
        const distSq = dx * dx + dy * dy;
        return distSq <= 25 ? "done" : "waiting";
      }
      case "PlayAnimation": {
        const seconds = Number(node.params.seconds ?? node.params.duration ?? 0.5);
        if (!state.startedAt) {
          state.startedAt = performance.now();
        }
        const elapsed = (performance.now() - (state.startedAt as number)) / 1000;
        return elapsed >= seconds ? "done" : "waiting";
      }
      default:
        return "failed";
    }
  }

  private evaluateCondition(instance: ModuleInstance, node: ModuleConditionNode): boolean {
    const left = this.resolveValueInput(instance, node.id, "left", node.leftLiteral);
    const right = this.resolveValueInput(instance, node.id, "right", node.rightLiteral);

    switch (node.condition) {
      case "IfVariableEquals":
        return left === right;
      case "IfVariableGreaterThan":
        return Number(left ?? 0) > Number(right ?? 0);
      case "IfVariableLessThan":
        return Number(left ?? 0) < Number(right ?? 0);
      case "IfVariableChanged": {
        const key = `${node.id}:left`;
        const prev = instance.valueSnapshots.get(key);
        instance.valueSnapshots.set(key, left ?? null);
        return prev !== undefined && prev !== left;
      }
      default:
        return false;
    }
  }

  private resolveValueInput(
    instance: ModuleInstance,
    nodeId: string,
    port: string,
    fallback: ModuleLiteral
  ): ModuleLiteral {
    const edge = this.findValueEdge(instance.graph, nodeId, port);
    if (!edge) return fallback;
    const valueNode = instance.graph.nodes.find((n) => n.id === edge.fromNodeId);
    if (!valueNode || valueNode.kind !== "Value") return fallback;
    if (instance.moduleVariables.has(valueNode.variableName)) {
      return instance.moduleVariables.get(valueNode.variableName) ?? null;
    }
    const entity = this.hooks.getEntity(instance.entityId);
    const variable = entity?.variables?.find((v) => v.name === valueNode.variableName);
    return (variable?.value as ModuleLiteral) ?? null;
  }

  private findValueEdge(graph: ModuleGraph, nodeId: string, port: string): ModuleEdge | undefined {
    return graph.edges.find(
      (edge) => edge.type === "value" && edge.toNodeId === nodeId && edge.toPort === port
    );
  }

  private getNextNodeId(graph: ModuleGraph, nodeId: string, port: string): string | null {
    const edge = graph.edges.find(
      (e) => e.type === "flow" && e.fromNodeId === nodeId && e.fromPort === port
    );
    return edge ? edge.toNodeId : null;
  }

  private getNodeState(instance: ModuleInstance, nodeId: string): Record<string, unknown> {
    if (!instance.nodeState[nodeId]) {
      instance.nodeState[nodeId] = {};
    }
    return instance.nodeState[nodeId];
  }

  private fail(instance: ModuleInstance, code: string, nodeId: string): ModuleResult {
    instance.status = "failed";
    instance.error = { code, nodeId };
    console.error("[ModuleRuntime] Module failed", {
      moduleId: instance.moduleId,
      entityId: instance.entityId,
      nodeId,
      code,
    });
    return { status: "failed", errorCode: code, nodeId };
  }

  private detectCycle(graph: ModuleGraph): boolean {
    const nodes = new Set(graph.nodes.map((n) => n.id));
    const edges = graph.edges.filter((e) => e.type === "flow");
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (!nodes.has(nodeId)) return false;
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visiting.add(nodeId);
      for (const edge of edges) {
        if (edge.fromNodeId !== nodeId) continue;
        if (visit(edge.toNodeId)) return true;
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    return visit(graph.entryNodeId);
  }
}
