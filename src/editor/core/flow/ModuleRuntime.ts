import type {
  ModuleGraph,
  ModuleFlowNode,
  ModuleConditionNode,
  ModuleSwitchNode,
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

type WaitNodeState = {
  timerId?: ReturnType<typeof setTimeout>;
  resolved?: boolean;
};

export type ModuleRuntimeHooks = {
  getEntity: (id: string) => ModuleRuntimeEntity | undefined;
  setVar: (entityId: string, name: string, value: ModuleLiteral) => void;
  getActionContext: (entityId: string, dt: number) => ActionContext;
  onModuleVarChange?: (entityId: string, moduleId: string, name: string, value: ModuleLiteral) => void;
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

  startModule(entityId: string, module: ModuleGraph, initialVariables?: Record<string, any>): ModuleInstance | null {
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

    const entity = this.hooks.getEntity(entityId);

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
        (module.variables ?? []).map((v) => {
          // 1. Explicit Override
          const override = initialVariables?.[v.name];
          if (override !== undefined) {
            return [v.name, override as ModuleLiteral];
          }

          // 2. Entity Variable (Implicit Binding)
          const entityVar = entity?.variables?.find(ev => ev.name === v.name);
          if (entityVar) {
            return [v.name, entityVar.value as ModuleLiteral];
          }

          // 3. Modue Default
          return [v.name, (v.value as ModuleLiteral) ?? null];
        })
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
        if (!next) {
          // Implicit Stop
          instance.status = "success";
          return { status: "success" };
        }
        instance.cursorNodeId = next;
        continue;
      }

      if (node.kind === "Merge") {
        const next = this.getNextNodeId(instance.graph, node.id, "out");
        if (!next) {
          instance.status = "success";
          return { status: "success" };
        }
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
        if (!next) {
          instance.status = "success";
          return { status: "success" };
        }
        instance.cursorNodeId = next;
        continue;
      }

      if (node.kind === "Switch") {
        const next = this.evaluateSwitch(instance, node);
        if (!next) {
          instance.status = "success";
          return { status: "success" };
        }
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
        if (!next) {
          instance.status = "success";
          return { status: "success" };
        }
        instance.cursorNodeId = next;
        continue;
      }

      return this.fail(instance, "InvalidNode", node.id);
    }
    return null;
  }

  private executeFlow(instance: ModuleInstance, node: ModuleFlowNode, dt: number): "done" | "waiting" | "failed" {
    const flowType = node.blockType === "Wait" ? "Async" : node.flowType;
    if (flowType === "Instant") {
      return this.executeInstant(instance, node, dt) ? "done" : "failed";
    }
    return this.executeAsync(instance, node, dt);
  }

  private executeInstant(instance: ModuleInstance, node: ModuleFlowNode, dt: number): boolean {
    const ctx = this.hooks.getActionContext(instance.entityId, dt);
    ctx.scope = instance.moduleVariables;
    switch (node.blockType) {
      case "SetVariable": {
        const target = String(node.params.target ?? "").trim();
        if (!target) return false;
        // [FIX] Resolve the input value (Handles Edge Connection) AND then Resolve the Value Source (Handles Raw Params)
        const rawValue = this.resolveValueInput(instance, node.id, "value", node.params.value ?? null);
        const value = this.resolveValue(ctx, rawValue);


        const entity = this.hooks.getEntity(instance.entityId);
        const hasEntityVar = Boolean(entity?.variables?.some((v) => v.name === target));

        // [FIX] Priority: Entity (Global) > Module (Local) to ensure external updates are reflected
        if (hasEntityVar) {
          this.hooks.setVar(instance.entityId, target, value);
        } else if (instance.moduleVariables.has(target)) {
          this.setModuleVariable(instance, target, value);
        } else {
          // [FIX] Fallback: Create/Set on Entity even if not exists (Upsert)
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

          // [FIX] Support Enhanced SetVar (Operations)
          // 1. Resolve Operands
          let result: any = null;

          // Check for Operation Mode
          if (params.operation || params.operand1 !== undefined) {
            const op = String(params.operation ?? "Set");
            const rawOp1 = this.resolveValueInput(instance, node.id, "operand1", params.operand1 ?? null);
            const rawOp2 = this.resolveValueInput(instance, node.id, "operand2", params.operand2 ?? null);

            const val1 = this.resolveValue(ctx, rawOp1) ?? 0;
            const val2 = this.resolveValue(ctx, rawOp2) ?? 0;

            const v1 = Number(val1);
            const v2 = Number(val2);

            // Simple Math Implementation (Parallels DefaultActions.ts)
            switch (op) {
              case "Add": result = v1 + v2; break;
              case "Sub": result = v1 - v2; break;
              case "Multiply": result = v1 * v2; break;
              case "Divide": result = v1 / (v2 !== 0 ? v2 : 1); break;
              case "Set": default: result = val1; break;
            }
          } else {
            // Simple Mode
            const rawValue = this.resolveValueInput(instance, node.id, "value", params.value ?? null);
            result = this.resolveValue(ctx, rawValue);
          }

          params.value = result;

          if (name) {
            const entity = this.hooks.getEntity(instance.entityId);
            const hasEntityVar = Boolean(entity?.variables?.some((v) => v.name === name));

            console.log(`[ModuleRuntime] SetVar Action: name='${name}' result=`, result, "hasEntityVar:", hasEntityVar);

            // [FIX] Priority: Entity (Global) > Module (Local)
            if (hasEntityVar) {
              this.hooks.setVar(instance.entityId, name, result);
              return true;
            }
            if (instance.moduleVariables.has(name)) {
              this.setModuleVariable(instance, name, result);
              return true;
            }
            // [FIX] Fallback: Create/Set on Entity
            this.hooks.setVar(instance.entityId, name, result);
            return true;
          }
        }
        ActionRegistry.run(actionName, ctx, params as Record<string, unknown>);
        return true;
      }
    }
  }

  private resolveValue(ctx: ActionContext, val: unknown): any {
    if (val === null || val === undefined) return 0;
    if (typeof val !== "object") return val;

    const src = val as any;
    if (src.type === "literal") return src.value;

    // [FIX] Enhanced Variable Resolution
    if (src.type === "variable") {
      if (!src.name) return 0;
      // 1. Module Scope
      if (ctx.scope?.has(src.name)) return ctx.scope.get(src.name);

      // 2. System Scope
      if (src.name === "Mouse") return ctx.input;
      if (src.name === "Time") return (ctx.eventData as any) ?? { dt: 0 };

      // 3. Entity Scope
      const entity = this.hooks.getEntity(ctx.entityId);
      const output = entity?.variables?.find(v => v.name === src.name)?.value;
      return output ?? 0;
    }

    // [FIX] Mouse Resolution
    if (src.type === "mouse") {
      const input = ctx.input;
      let x = input?.mouseX ?? 0;
      let y = input?.mouseY ?? 0;

      if (src.mode === "screen") {
        x = input?.mouseScreenX ?? 0;
        y = input?.mouseScreenY ?? 0;
      } else if (src.mode === "relative") {
        const entity = this.hooks.getEntity(ctx.entityId);
        if (entity) {
          x -= (entity.x ?? 0);
          y -= (entity.y ?? 0);
        }
      }

      if (src.axis === "x") return x;
      if (src.axis === "y") return y;
      return { x, y };
    }

    // [FIX] Property Resolution
    if (src.type === "property") {
      const entity = this.hooks.getEntity(ctx.entityId);
      if (!entity || !src.property) return 0;
      if (src.property === "position") return { x: entity.x ?? 0, y: entity.y ?? 0 };
      // Basic properties
      if (src.property in entity) return (entity as any)[src.property];
      return 0;
    }

    // Simple property/vector support if needed
    if ('x' in src && 'y' in src) return src;

    return val;
  }

  private getResolvedParam(instance: ModuleInstance, nodeId: string, paramName: string, fallbackName?: string): any {
    const node = instance.graph.nodes.find(n => n.id === nodeId);
    if (!node) return 0;

    const params = (node as any).params ?? {};
    const fallbackVal = params[paramName] ?? (fallbackName ? params[fallbackName] : undefined);

    const val = this.resolveValueInput(instance, nodeId, paramName, fallbackVal as ModuleLiteral);

    const ctx = this.hooks.getActionContext(instance.entityId, 0);
    ctx.scope = instance.moduleVariables;

    return this.resolveValue(ctx, val);
  }

  private executeAsync(instance: ModuleInstance, node: ModuleFlowNode, dt: number): "done" | "waiting" | "failed" {
    const state = this.getNodeState(instance, node.id);
    const ctx = this.hooks.getActionContext(instance.entityId, dt);
    ctx.scope = instance.moduleVariables;

    switch (node.blockType) {
      case "Wait": {
        let seconds = 0;
        // Priority: seconds -> duration -> time
        if (node.params.seconds !== undefined || this.findValueEdge(instance.graph, node.id, "seconds")) {
          seconds = Number(this.getResolvedParam(instance, node.id, "seconds"));
        } else if (node.params.duration !== undefined || this.findValueEdge(instance.graph, node.id, "duration")) {
          seconds = Number(this.getResolvedParam(instance, node.id, "duration"));
        } else {
          seconds = Number(this.getResolvedParam(instance, node.id, "time"));
        }

        if (seconds <= 0) {
          return "done";
        }
        const waitState = state as WaitNodeState;
        if (waitState.resolved) {
          waitState.resolved = false;
          return "done";
        }
        if (waitState.timerId === undefined) {
          waitState.timerId = setTimeout(() => {
            waitState.resolved = true;
            waitState.timerId = undefined;
          }, seconds * 1000);
        }
        return "waiting";
      }
      case "MoveTo": {
        const targetX = Number(this.getResolvedParam(instance, node.id, "x"));
        const targetY = Number(this.getResolvedParam(instance, node.id, "y"));
        const speed = Number(this.getResolvedParam(instance, node.id, "speed") || 100);

        const entity = this.hooks.getEntity(instance.entityId);
        if (!entity) return "failed";
        ActionRegistry.run("MoveToward", ctx, { x: targetX, y: targetY, speed });
        const dx = (entity.x ?? 0) - targetX;
        const dy = (entity.y ?? 0) - targetY;
        const distSq = dx * dx + dy * dy;
        return distSq <= 25 ? "done" : "waiting";
      }
      case "PlayAnimation": {
        const pSeconds = this.getResolvedParam(instance, node.id, "seconds");
        const pDuration = this.getResolvedParam(instance, node.id, "duration");
        const seconds = Number(pSeconds || pDuration || 0.5);

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
    const ctx = this.hooks.getActionContext(instance.entityId, 0); // dt is 0 for condition check usually
    // Ensure module variables are available in context so resolveNamedValue works if checking entity vars
    // But resolveNamedValue is internal.
    // We need to resolve left/right values first for Var* conditions.

    // Helper to resolve a variable name to its value (from Module or Entity)
    const resolveVar = (name?: string) => name ? this.resolveNamedValue(instance, name) : undefined;

    // Resolve Left/Right for Var* conditions
    const leftFallback = (node.leftVariable ? resolveVar(node.leftVariable) : node.leftLiteral) ?? null;
    const left = this.resolveValueInput(instance, node.id, "left", leftFallback);

    const rightFallback = (node.rightVariable ? resolveVar(node.rightVariable) : node.rightLiteral) ?? null;
    const right = this.resolveValueInput(instance, node.id, "right", rightFallback);

    switch (node.condition) {
      case "IfVariableEquals":
      case "VarEquals":
        return this.areValuesEqual(left, right);
      case "VarNotEquals":
        return !this.areValuesEqual(left, right);
      case "IfVariableGreaterThan":
      case "VarGreaterThan":
        return Number(left ?? 0) > Number(right ?? 0);
      case "VarGreaterOrEqual":
        return Number(left ?? 0) >= Number(right ?? 0);
      case "IfVariableLessThan":
      case "VarLessThan":
        return Number(left ?? 0) < Number(right ?? 0);
      case "VarLessOrEqual":
        return Number(left ?? 0) <= Number(right ?? 0);

      case "IfVariableChanged": {
        const key = `${node.id}:left`;
        const prev = instance.valueSnapshots.get(key);
        instance.valueSnapshots.set(key, left ?? null);
        return prev !== undefined && !this.areValuesEqual(prev, left);
      }

      // -- Input Conditions --
      case "InputKey": {
        const key = node.key ?? "";
        if (!key) return false;
        // Check input from context
        if (ctx.input?.keys?.[key] === true) return true;
        // Check legacy mapping if needed (simplified here)
        return false;
      }
      case "InputDown": {
        const key = node.key ?? "";
        if (!key) return false;
        return ctx.input?.keysDown?.[key] === true;
      }

      // -- Tag / Signal --
      case "CompareTag": {
        const targetTag = node.tag ?? "";
        if (!targetTag) return false;
        // Tag comparison logic relies on event data which might not be present in a simple polling condition
        // Unless this module flow was triggered by an Event.
        // If triggered by event, ctx.eventData should be populated.
        const eventData = ctx.eventData as any;
        if (eventData) {
          if (eventData.tag === targetTag) return true;
          if (eventData.otherTag === targetTag) return true;
        }
        return false;
      }

      case "SignalKeyEquals": {
        const expected = node.signalKey ?? node.key ?? "";
        if (!expected) return true;
        return ctx.eventData?.signal === expected;
      }

      // -- Status --
      case "IsGrounded":
        return ctx.entityContext?.collisions.grounded === true;
      case "IsAlive":
        const hp = this.resolveNamedValue(instance, "hp");
        return Number(hp ?? 0) > 0;

      // -- Distance --
      case "DistanceLessThan":
      case "DistanceGreaterThan": {
        const targetId = String(left ?? "");
        if (!targetId) return false;

        const self = this.hooks.getEntity(instance.entityId);
        const target = this.hooks.getEntity(targetId);

        if (!self || !target || self.x === undefined || self.y === undefined || target.x === undefined || target.y === undefined) {
          return false;
        }

        const dx = self.x - target.x;
        const dy = self.y - target.y;
        const distSq = dx * dx + dy * dy;
        const threshold = Number(right ?? 0);
        const limitSq = threshold * threshold;

        if (node.condition === "DistanceLessThan") return distSq < limitSq;
        return distSq > limitSq;
      }


      default:
        return false;
    }
  }

  private areValuesEqual(a: any, b: any): boolean {
    if (a === b) return true;

    // Convert boolean-like strings if comparing with boolean
    if (typeof a === "boolean" && typeof b === "string") {
      return (b === "true" && a === true) || (b === "false" && a === false);
    }
    if (typeof b === "boolean" && typeof a === "string") {
      return (a === "true" && b === true) || (a === "false" && b === false);
    }

    // Loose equality for numbers/strings
    // eslint-disable-next-line eqeqeq
    return a == b;
  }

  private evaluateSwitch(instance: ModuleInstance, node: ModuleSwitchNode): string | null {
    const name = node.variableName?.trim();
    if (!name) {
      return this.getNextNodeId(instance.graph, node.id, "default");
    }
    const value = this.resolveNamedValue(instance, name);
    const matched = node.cases.find((caseItem) => this.caseMatches(value, caseItem.value));
    const port = matched ? matched.id : "default";
    return this.getNextNodeId(instance.graph, node.id, port);
  }

  private resolveNamedValue(instance: ModuleInstance, name: string): ModuleLiteral {
    // [FIX] System Variables (Top Priority)
    if (name === "Mouse") {
      const ctx = this.hooks.getActionContext(instance.entityId, 0);
      return ctx.input as any;
    }
    if (name === "Time") {
      const ctx = this.hooks.getActionContext(instance.entityId, 0);
      return (ctx.eventData as any) ?? { dt: 0 };
    }

    // [FIX] Priority: Entity (Global) > Module (Local)
    // This allows "Live" updates from Entity variables to be seen by the module
    const entity = this.hooks.getEntity(instance.entityId);
    const variable = entity?.variables?.find((v) => v.name === name);
    if (variable) {
      return (variable.value as ModuleLiteral) ?? null;
    }

    if (instance.moduleVariables.has(name)) {
      // console.log(`[ModuleRuntime] Resolved '${name}' from Module:`, instance.moduleVariables.get(name));
      return instance.moduleVariables.get(name) ?? null;
    }

    console.warn(`[ModuleRuntime] Failed to resolve variable: '${name}'`);
    return null;
  }

  private caseMatches(input: ModuleLiteral, expected: ModuleLiteral): boolean {
    if (input === null || input === undefined) return false;
    if (typeof input === "number") {
      const num = typeof expected === "number" ? expected : Number(expected);
      return !Number.isNaN(num) && input === num;
    }
    if (typeof input === "boolean") {
      if (typeof expected === "boolean") return input === expected;
      if (typeof expected === "string") {
        const lowered = expected.toLowerCase();
        if (lowered === "true" || lowered === "false") {
          return input === (lowered === "true");
        }
      }
      return false;
    }
    return String(input) === String(expected ?? "");
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
    if (!valueNode || valueNode.kind !== "Value") return fallback;

    // [FIX] Use unified resolver
    const resolved = this.resolveNamedValue(instance, valueNode.variableName);
    if (resolved !== null) return resolved;

    return null;
  }

  private setModuleVariable(instance: ModuleInstance, name: string, value: ModuleLiteral) {
    instance.moduleVariables.set(name, value);
    if (instance.graph.variables) {
      const idx = instance.graph.variables.findIndex((v) => v.name === name);
      if (idx >= 0) {
        instance.graph.variables[idx] = { ...instance.graph.variables[idx], value };
      }
    }
    this.hooks.onModuleVarChange?.(instance.entityId, instance.moduleId, name, value);
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
