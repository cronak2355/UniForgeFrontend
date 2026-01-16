import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { EditorVariable } from "../types/Variable";
import type {
  ModuleEdge,
  ModuleGraph,
  ModuleNode,
  ModuleFlowNode,
  ModuleConditionNode,
  ModuleVariable,
  ModuleNodeKind,
  ModuleSwitchNode,
  ModuleLiteral,
} from "../types/Module";
import { colors } from "../constants/colors";
import { ActionRegistry } from "../core/events/ActionRegistry";
import { useEditorCoreSnapshot } from "../../contexts/EditorCoreContext";
import { ActionEditor } from "../inspector/ActionEditor";
import type { Asset } from "../types/Asset";

type Props = {
  module: ModuleGraph;
  variables: EditorVariable[];
  modules: ModuleGraph[];
  onCreateVariable?: (name: string, value: unknown, type?: EditorVariable["type"]) => void;
  onUpdateVariable?: (name: string, value: unknown, type?: EditorVariable["type"]) => void;
  actionLabels?: Record<string, string>;
  onChange: (next: ModuleGraph) => void;
};

type PortKind = "flow" | "value";
type PortDir = "in" | "out";
type PortMeta = { id: string; label: string; kind: PortKind; dir: PortDir; offsetY: number };

const NODE_WIDTH = 200;
const SWITCH_CASE_START = 106;
const SWITCH_CASE_ROW_HEIGHT = 30;
const SWITCH_PORT_SPACING = 37;
const SWITCH_ADD_ROW_HEIGHT = 30;

const CONDITION_LABELS: Record<string, string> = {
  IfVariableEquals: "==",
  IfVariableGreaterThan: ">",
  IfVariableLessThan: "<",
  IfVariableChanged: "Changed",
};

export function ModuleGraphEditor({
  module,
  variables,
  modules,
  onCreateVariable,
  onUpdateVariable,
  actionLabels,
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { entities: allEntities, assets } = useEditorCoreSnapshot();
  const connectingRef = useRef<{
    nodeId: string;
    portId: string;
    kind: PortKind;
    dir: PortDir;
  } | null>(null);
  const [connecting, setConnecting] = useState<{
    nodeId: string;
    portId: string;
    kind: PortKind;
    dir: PortDir;
  } | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<EditorVariable["type"]>("int");
  const [newVarValue, setNewVarValue] = useState("0");
  const [newVarX, setNewVarX] = useState("0");
  const [newVarY, setNewVarY] = useState("0");
  const moduleVariables = module.variables ?? [];
  const combinedVariables = useMemo(() => {
    const moduleVars = moduleVariables.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      value: v.value,
    }));
    const moduleNames = new Set(moduleVars.map((v) => v.name));
    const entityOnly = variables.filter((v) => !moduleNames.has(v.name));
    return [...moduleVars, ...entityOnly];
  }, [moduleVariables, variables]);

  const syncModuleVariable = (name: string, value: unknown, explicitType?: EditorVariable["type"]) => {
    if (!name) return;
    let nextType: EditorVariable["type"] = explicitType ?? "string";
    let nextValue: number | string | boolean | { x: number; y: number } = "";
    if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value) {
      nextType = "vector2";
      nextValue = value as { x: number; y: number };
    } else if (typeof value === "boolean") {
      nextType = "bool";
      nextValue = value;
    } else if (typeof value === "number" && !Number.isNaN(value)) {
      nextType = nextType === "int" || nextType === "float" ? nextType : (Number.isInteger(value) ? "int" : "float");
      nextValue = value;
    } else if (value === undefined || value === null) {
      nextType = explicitType ?? "int";
      nextValue = nextType === "vector2" ? { x: 0, y: 0 } : 0;
    } else {
      nextValue = String(value);
    }

    updateModule((graph) => {
      const currentVars = graph.variables ?? [];
      const existing = currentVars.find((v) => v.name === name);
      let nextVars: ModuleVariable[];
      if (existing) {
        nextVars = currentVars.map((v) =>
          v.id === existing.id ? { ...v, type: nextType, value: nextValue } : v
        );
      } else {
        nextVars = [
          ...currentVars,
          { id: crypto.randomUUID(), name, type: nextType, value: nextValue },
        ];
      }
      return { ...graph, variables: nextVars };
    });
  };

  const updateConnecting = (next: typeof connecting) => {
    connectingRef.current = next;
    setConnecting(next);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragging.offsetX;
      const y = e.clientY - rect.top - dragging.offsetY;
      updateNode(dragging.nodeId, { x, y });
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, module]);

  useEffect(() => {
    const onUp = (e: MouseEvent) => {
      const current = connectingRef.current;
      if (!current) return;
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const portEl = target?.closest?.("[data-port-node]") as HTMLElement | null;
      if (!portEl) return;
      const nodeId = portEl.dataset.portNode;
      const portId = portEl.dataset.portId;
      const kind = portEl.dataset.portKind as PortKind | undefined;
      const dir = portEl.dataset.portDir as PortDir | undefined;
      if (!nodeId || !portId || !kind || !dir) return;
      tryConnect(nodeId, { id: portId, label: portId, kind, dir, offsetY: 0 });
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [module]);

  const nodesById = useMemo(() => {
    const map = new Map<string, ModuleNode>();
    module.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [module.nodes]);

  const availableActions = useMemo(() => ActionRegistry.getAvailableActions(), []);
  const entityOptions = useMemo(
    () =>
      Array.from(allEntities.values()).map((e) => ({
        id: e.id,
        name: e.name,
      })),
    [allEntities]
  );

  const hasValueEdge = (nodeId: string, portId: string) =>
    module.edges.some((edge) => edge.type === "value" && edge.toNodeId === nodeId && edge.toPort === portId);

  const updateModule = (updater: (graph: ModuleGraph) => ModuleGraph) => {
    onChange(updater(module));
  };

  const updateNode = (nodeId: string, patch: Partial<ModuleNode>) => {
    updateModule((graph) => ({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === nodeId ? ({ ...n, ...patch } as ModuleNode) : n)),
    }));
  };

  const removeNode = (nodeId: string) => {
    const node = nodesById.get(nodeId);
    if (!node || node.kind === "Entry") return;
    updateModule((graph) => ({
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      edges: graph.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
    }));
  };

  const addNode = (kind: ModuleNodeKind) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const baseX = rect ? rect.width / 2 - NODE_WIDTH / 2 : 120;
    const baseY = rect ? rect.height / 2 - 60 : 120;
    const id = crypto.randomUUID();
    let node: ModuleNode;

    switch (kind) {
      case "Flow":
        node = {
          id,
          kind: "Flow",
          x: baseX,
          y: baseY,
          blockType: availableActions[0] ?? "SetVar",
          flowType: "Instant",
          params: {},
        };
        break;
      case "Condition":
        node = {
          id,
          kind: "Condition",
          x: baseX,
          y: baseY,
          condition: "IfVariableEquals",
          leftLiteral: 0,
          rightLiteral: 0,
        };
        break;
      case "Switch":
        node = {
          id,
          kind: "Switch",
          x: baseX,
          y: baseY,
          cases: [
            { id: crypto.randomUUID(), value: 0 },
            { id: crypto.randomUUID(), value: 1 },
          ],
          variableName: combinedVariables[0]?.name ?? "",
        };
        break;
      case "Stop":
        node = { id, kind: "Stop", x: baseX, y: baseY, result: "Success" };
        break;
      default:
        return;
    }

    updateModule((graph) => ({ ...graph, nodes: [...graph.nodes, node] }));
  };

  const updateEdge = (edge: ModuleEdge) => {
    updateModule((graph) => {
      const nextEdges = graph.edges.filter((e) => {
        if (e.type !== edge.type) return true;
        if (e.fromNodeId === edge.fromNodeId && e.fromPort === edge.fromPort) return false;
        if (e.toNodeId === edge.toNodeId && e.toPort === edge.toPort) return false;
        return true;
      });
      nextEdges.push(edge);
      return { ...graph, edges: nextEdges };
    });
  };

  const removeEdge = (nodeId: string, portId: string, kind: PortKind) => {
    updateModule((graph) => ({
      ...graph,
      edges: graph.edges.filter((edge) => !(edge.type === kind && edge.toNodeId === nodeId && edge.toPort === portId)),
    }));
  };

  const tryConnect = (nodeId: string, port: PortMeta) => {
    const current = connectingRef.current;
    if (!current) return;
    if (current.nodeId === nodeId && current.portId === port.id) return;
    if (current.kind !== port.kind) return;

    if (current.dir === "out" && port.dir === "in") {
      updateEdge({
        id: crypto.randomUUID(),
        type: current.kind,
        fromNodeId: current.nodeId,
        fromPort: current.portId,
        toNodeId: nodeId,
        toPort: port.id,
      });
      updateConnecting(null);
      return;
    }

    if (current.dir === "in" && port.dir === "out") {
      updateEdge({
        id: crypto.randomUUID(),
        type: current.kind,
        fromNodeId: nodeId,
        fromPort: port.id,
        toNodeId: current.nodeId,
        toPort: current.portId,
      });
      updateConnecting(null);
      return;
    }
  };

  const onPortMouseDown = (nodeId: string, port: PortMeta) => {
    if (connectingRef.current) {
      tryConnect(nodeId, port);
      return;
    }
    updateConnecting({ nodeId, portId: port.id, kind: port.kind, dir: port.dir });
  };

  const getPorts = (node: ModuleNode): { inputs: PortMeta[]; outputs: PortMeta[] } => {
    switch (node.kind) {
      case "Entry":
        return { inputs: [], outputs: [{ id: "out", label: "out", kind: "flow", dir: "out", offsetY: 24 }] };
      case "Flow": {
        const inputs: PortMeta[] = [{ id: "in", label: "in", kind: "flow", dir: "in", offsetY: 24 }];
        if (node.blockType === "SetVar" || node.blockType === "SetVariable") {
          inputs.push({ id: "value", label: "value", kind: "value", dir: "in", offsetY: 60 });
        }
        return {
          inputs,
          outputs: [{ id: "out", label: "out", kind: "flow", dir: "out", offsetY: 24 }],
        };
      }
      case "Condition":
        return {
          inputs: [
            { id: "in", label: "in", kind: "flow", dir: "in", offsetY: 24 },
            { id: "left", label: "left", kind: "value", dir: "in", offsetY: 60 },
            { id: "right", label: "right", kind: "value", dir: "in", offsetY: 90 },
          ],
          outputs: [
            { id: "true", label: "true", kind: "flow", dir: "out", offsetY: 52 },
            { id: "false", label: "false", kind: "flow", dir: "out", offsetY: 82 },
          ],
        };
      case "Switch": {
        const inputs: PortMeta[] = [
          { id: "in", label: "in", kind: "flow", dir: "in", offsetY: 24 },
        ];
        const outputs: PortMeta[] = node.cases.map((caseItem, idx) => ({
          id: caseItem.id,
          label: String(caseItem.value),
          kind: "flow",
          dir: "out",
          offsetY: SWITCH_CASE_START + idx * SWITCH_PORT_SPACING + SWITCH_CASE_ROW_HEIGHT / 2,
        }));
        outputs.push({
          id: "default",
          label: "default",
          kind: "flow",
          dir: "out",
          offsetY: SWITCH_CASE_START + node.cases.length * SWITCH_PORT_SPACING + SWITCH_CASE_ROW_HEIGHT / 2,
        });
        return { inputs, outputs };
      }
      case "Merge":
        return {
          inputs: [{ id: "in", label: "in", kind: "flow", dir: "in", offsetY: 24 }],
          outputs: [{ id: "out", label: "out", kind: "flow", dir: "out", offsetY: 24 }],
        };
      case "Stop":
        return { inputs: [{ id: "in", label: "in", kind: "flow", dir: "in", offsetY: 24 }], outputs: [] };
      case "Value":
        return { inputs: [], outputs: [{ id: "value", label: "value", kind: "value", dir: "out", offsetY: 24 }] };
      default:
        return { inputs: [], outputs: [] };
    }
  };

  const getPortPosition = (node: ModuleNode, port: PortMeta) => {
    const x = port.dir === "out" ? node.x + NODE_WIDTH : node.x;
    const y = node.y + port.offsetY;
    return { x, y };
  };

  const edges = useMemo(() => module.edges, [module.edges]);

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <div style={{ width: 180, padding: "12px", borderRight: `1px solid ${colors.borderColor}` }}>
        <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Nodes</div>
        <button style={paletteButton} onClick={() => addNode("Flow")}>+ Flow</button>
        <button style={paletteButton} onClick={() => addNode("Condition")}>+ Condition</button>
        <button style={paletteButton} onClick={() => addNode("Switch")}>+ Switch</button>
        <button style={paletteButton} onClick={() => addNode("Stop")}>+ Stop</button>
        {(onCreateVariable || onUpdateVariable) && (
          <>
            <div style={{ marginTop: 12, fontSize: 12, color: colors.textSecondary }}>Variables</div>
            <input
              placeholder="name"
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              style={sidebarInput}
            />
            <select
              value={newVarType}
              onChange={(e) => setNewVarType(e.target.value as EditorVariable["type"])}
              style={sidebarInput}
            >
              <option value="int">int</option>
              <option value="float">float</option>
              <option value="string">string</option>
              <option value="bool">bool</option>
              <option value="vector2">vector2</option>
            </select>
            {newVarType === "vector2" ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  placeholder="X"
                  value={newVarX}
                  onChange={(e) => setNewVarX(e.target.value)}
                  style={{ ...sidebarInput, width: "50%" }}
                />
                <input
                  placeholder="Y"
                  value={newVarY}
                  onChange={(e) => setNewVarY(e.target.value)}
                  style={{ ...sidebarInput, width: "50%" }}
                />
              </div>
            ) : (
              <input
                placeholder="value"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                style={sidebarInput}
              />
            )}
            <button
              style={paletteButton}
              onClick={() => {
                const name = newVarName.trim();
                if (!name) return;
                let value: unknown = newVarValue;
                if (newVarType === "int" || newVarType === "float") {
                  const num = Number(newVarValue);
                  value = Number.isNaN(num) ? 0 : num;
                } else if (newVarType === "bool") {
                  value = newVarValue.toLowerCase() === "true" || newVarValue === "1";
                } else if (newVarType === "vector2") {
                  const x = Number(newVarX) || 0;
                  const y = Number(newVarY) || 0;
                  value = { x, y };
                }
                const entityVarExists = variables.some((v) => v.name === name);
                syncModuleVariable(name, value, newVarType);

                if (entityVarExists && onUpdateVariable) {
                  onUpdateVariable(name, value, newVarType);
                }
                setNewVarName("");
                setNewVarValue("0");
                setNewVarX("0");
                setNewVarY("0");
              }}
            >
              + Add Variable
            </button>
            <div style={{ marginTop: 8, fontSize: 11, color: colors.textSecondary }}>
              {moduleVariables.length === 0 ? (
                <div>No module variables yet.</div>
              ) : (
                moduleVariables.map((v) => (
                  <div key={v.id}>
                    {v.name} ({v.type}):{" "}
                    {typeof v.value === "object" && v.value !== null && "x" in v.value
                      ? `(${(v.value as any).x}, ${(v.value as any).y})`
                      : String(v.value)}
                  </div>
                ))
              )}
            </div>
          </>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: colors.textMuted }}>
          Edges: {module.edges.length}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: colors.textMuted }}>
          Click output then input to connect. Click input to clear.
        </div>
      </div>

      <div
        ref={canvasRef}
        style={{
          flex: 1,
          position: "relative",
          background: colors.bgViewport,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          overflow: "hidden",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            updateConnecting(null);
          }
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
        >
          {edges.map((edge) => {
            const fromNode = nodesById.get(edge.fromNodeId);
            const toNode = nodesById.get(edge.toNodeId);
            if (!fromNode || !toNode) return null;
            const fromPort = getPorts(fromNode).outputs.find((p) => p.id === edge.fromPort);
            const toPort = getPorts(toNode).inputs.find((p) => p.id === edge.toPort);
            if (!fromPort || !toPort) return null;
            const start = getPortPosition(fromNode, fromPort);
            const end = getPortPosition(toNode, toPort);
            const midX = (start.x + end.x) / 2;
            const color = edge.type === "flow" ? colors.accentLight : colors.warning;
            return (
              <path
                key={edge.id}
                d={`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`}
                stroke={color}
                strokeWidth={2}
                fill="none"
              />
            );
          })}
        </svg>

        {module.nodes.map((node) => {
          const { inputs, outputs } = getPorts(node);
          const switchHeight =
            node.kind === "Switch"
              ? SWITCH_CASE_START + node.cases.length * SWITCH_PORT_SPACING + SWITCH_ADD_ROW_HEIGHT + 40
              : 0;
          const nodeHeight = Math.max(
            80,
            Math.max(
              ...[...inputs, ...outputs].map((p) => p.offsetY + 16),
              node.kind === "Condition" ? 120 : 0,
              switchHeight
            )
          );

          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: node.x,
                top: node.y,
                width: NODE_WIDTH,
                height: nodeHeight,
                background: colors.bgSecondary,
                border: `1px solid ${colors.borderColor}`,
                borderRadius: 8,
                boxShadow: "0 8px 16px rgba(0,0,0,0.35)",
                color: colors.textPrimary,
                fontSize: 11,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 8px",
                  cursor: "grab",
                  borderBottom: `1px solid ${colors.borderColor}`,
                  background: colors.bgTertiary,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
                onMouseDown={(e) => {
                  if (!canvasRef.current) return;
                  const rect = canvasRef.current.getBoundingClientRect();
                  setDragging({ nodeId: node.id, offsetX: e.clientX - rect.left - node.x, offsetY: e.clientY - rect.top - node.y });
                }}
              >
                <span>{node.kind}</span>
                {node.kind !== "Entry" && (
                  <button
                    style={closeButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNode(node.id);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div style={{ padding: "8px", display: "grid", gap: 6 }}>
                {node.kind === "Flow" && (
                  <FlowNodeEditor
                    node={node}
                    availableActions={availableActions}
                    variables={combinedVariables}
                    entities={entityOptions}
                    modules={modules}
                    actionLabels={actionLabels}
                    assets={assets}
                    onCreateVariable={(name, value, type) => {
                      syncModuleVariable(name, value, type);
                      onCreateVariable?.(name, value, type);
                    }}
                    onUpdate={(patch) => updateNode(node.id, patch)}
                  />
                )}
                {node.kind === "Condition" && (
                  <ConditionNodeEditor
                    node={node}
                    hasValueEdge={(portId) => hasValueEdge(node.id, portId)}
                    onUpdate={(patch) => updateNode(node.id, patch)}
                  />
                )}
                {node.kind === "Switch" && (
                  <SwitchNodeEditor
                    node={node}
                    variables={combinedVariables}
                    onUpdate={(patch) => updateNode(node.id, patch)}
                  />
                )}
                {node.kind === "Value" && (
                  <ValueNodeEditor node={node} variables={combinedVariables} onUpdate={(patch) => updateNode(node.id, patch)} />
                )}
                {node.kind === "Stop" && (
                  <StopNodeEditor node={node} onUpdate={(patch) => updateNode(node.id, patch)} />
                )}
              </div>

              {[...inputs, ...outputs].map((port) => {
                const x = port.dir === "out" ? NODE_WIDTH - 6 : -6;
                return (
                  <div
                    key={`${node.id}-${port.id}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onPortMouseDown(node.id, port);
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      tryConnect(node.id, port);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    title={port.label}
                    data-port-node={node.id}
                    data-port-id={port.id}
                    data-port-kind={port.kind}
                    data-port-dir={port.dir}
                    style={{
                      position: "absolute",
                      left: x,
                      top: port.offsetY - 4,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: port.kind === "flow" ? colors.accentLight : colors.warning,
                      border: connecting && connecting.nodeId === node.id && connecting.portId === port.id ? `2px solid ${colors.textPrimary}` : "none",
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowNodeEditor({
  node,
  availableActions,
  variables,
  entities,
  modules,
  actionLabels,
  assets,
  onCreateVariable,
  onUpdate,
}: {
  node: ModuleFlowNode;
  availableActions: string[];
  variables: EditorVariable[];
  entities: { id: string; name: string }[];
  modules: ModuleGraph[];
  actionLabels?: Record<string, string>;
  assets?: Asset[];
  onCreateVariable?: (name: string, value: unknown, type?: EditorVariable["type"]) => void;
  onUpdate: (patch: Partial<ModuleFlowNode>) => void;
}) {
  const selectedAction = node.blockType || availableActions[0] || "";
  const action = useMemo(() => ({ type: selectedAction, ...(node.params ?? {}) }), [selectedAction, node.params]);

  useEffect(() => {
    if (node.blockType === "Wait" && node.params?.seconds === undefined) {
      onUpdate({ blockType: "Wait", flowType: "Async", params: { ...(node.params ?? {}), seconds: 1 } });
    }
  }, [node.blockType, node.params?.seconds, onUpdate]);

  return (
    <>
      <ActionEditor
        action={action}
        availableActions={availableActions}
        actionLabels={actionLabels}
        variables={variables}
        entities={entities}
        modules={modules}
        assets={assets}
        onCreateVariable={onCreateVariable}
        onUpdate={(next) => {
          const { type, ...params } = next;
          const nextFlowType = type === "Wait" ? "Async" : "Instant";
          onUpdate({ blockType: type, flowType: nextFlowType, params });
        }}
        onRemove={() => undefined}
        showRemove={false}
      />
    </>
  );
}

function ConditionNodeEditor({
  node,
  hasValueEdge,
  onUpdate,
}: {
  node: ModuleConditionNode;
  hasValueEdge: (portId: string) => boolean;
  onUpdate: (patch: Partial<ModuleConditionNode>) => void;
}) {
  const rightDisabled = node.condition === "IfVariableChanged" || hasValueEdge("right");
  const leftDisabled = hasValueEdge("left");
  return (
    <>
      <label style={labelStyle}>Condition</label>
      <select
        value={node.condition}
        onChange={(e) => onUpdate({ condition: e.target.value as ModuleConditionNode["condition"] })}
        style={selectStyle}
      >
        {Object.entries(CONDITION_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <label style={labelStyle}>
        left
        <input
          type="number"
          value={node.leftLiteral ?? 0}
          disabled={leftDisabled}
          onChange={(e) => onUpdate({ leftLiteral: Number(e.target.value) })}
          style={{ ...inputStyle, opacity: leftDisabled ? 0.6 : 1 }}
        />
      </label>
      {node.condition !== "IfVariableChanged" && (
        <label style={labelStyle}>
          right
          <input
            type="number"
            value={node.rightLiteral ?? 0}
            disabled={rightDisabled}
            onChange={(e) => onUpdate({ rightLiteral: Number(e.target.value) })}
            style={{ ...inputStyle, opacity: rightDisabled ? 0.6 : 1 }}
          />
        </label>
      )}
    </>
  );
}

function SwitchNodeEditor({
  node,
  variables,
  onUpdate,
}: {
  node: ModuleSwitchNode;
  variables: EditorVariable[];
  onUpdate: (patch: Partial<ModuleSwitchNode>) => void;
}) {
  const updateCase = (id: string, value: string) => {
    let parsed: ModuleLiteral = value;
    if (value === "true" || value === "false") {
      parsed = value === "true";
    } else if (value !== "" && !Number.isNaN(Number(value))) {
      parsed = Number(value);
    }
    const nextCases = node.cases.map((c) => (c.id === id ? { ...c, value: parsed } : c));
    onUpdate({ cases: nextCases });
  };

  const removeCase = (id: string) => {
    onUpdate({ cases: node.cases.filter((c) => c.id !== id) });
  };

  return (
    <>
      <label style={labelStyle}>Switch</label>
      <label style={labelStyle}>
        variable
        <select
          value={node.variableName ?? ""}
          onChange={(e) => onUpdate({ variableName: e.target.value })}
          style={selectStyle}
        >
          <option value="">(value input)</option>
          {variables.map((v) => (
            <option key={v.id} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "grid", gap: 6 }}>
        {node.cases.map((caseItem) => (
          <div
            key={caseItem.id}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              height: SWITCH_CASE_ROW_HEIGHT,
            }}
          >
            <input
              type="text"
              value={caseItem.value !== undefined ? String(caseItem.value) : ""}
              onChange={(e) => updateCase(caseItem.id, e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={() => removeCase(caseItem.id)} style={closeButton}>
              x
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            onUpdate({
              cases: [...node.cases, { id: crypto.randomUUID(), value: "" }],
            })
          }
          style={{ ...addCaseButton, height: SWITCH_ADD_ROW_HEIGHT }}
        >
          + Add Case
        </button>
      </div>
    </>
  );
}

function ValueNodeEditor({
  node,
  variables,
  onUpdate,
}: {
  node: Extract<ModuleNode, { kind: "Value" }>;
  variables: EditorVariable[];
  onUpdate: (patch: Partial<ModuleNode>) => void;
}) {
  return (
    <label style={labelStyle}>
      variable
      <select
        value={node.variableName}
        onChange={(e) => onUpdate({ variableName: e.target.value })}
        style={selectStyle}
      >
        <option value="">(variable)</option>
        {variables.map((v) => (
          <option key={v.id} value={v.name}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function StopNodeEditor({
  node,
  onUpdate,
}: {
  node: Extract<ModuleNode, { kind: "Stop" }>;
  onUpdate: (patch: Partial<ModuleNode>) => void;
}) {
  return (
    <>
      <label style={labelStyle}>
        result
        <select value={node.result} onChange={(e) => onUpdate({ result: e.target.value as "Success" | "Failed" })} style={selectStyle}>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
        </select>
      </label>
      {node.result === "Failed" && (
        <label style={labelStyle}>
          errorCode
          <input
            type="text"
            value={node.errorCode ?? ""}
            onChange={(e) => onUpdate({ errorCode: e.target.value })}
            style={inputStyle}
          />
        </label>
      )}
    </>
  );
}

const paletteButton: CSSProperties = {
  width: "100%",
  background: colors.bgTertiary,
  border: `1px solid ${colors.borderColor}`,
  color: colors.textPrimary,
  padding: "6px 8px",
  marginBottom: 6,
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
};

const sidebarInput: CSSProperties = {
  width: "100%",
  background: colors.bgPrimary,
  border: `1px solid ${colors.borderColor}`,
  color: colors.textPrimary,
  padding: "6px 8px",
  marginBottom: 6,
  borderRadius: 6,
  fontSize: 12,
};

const closeButton: CSSProperties = {
  background: "transparent",
  border: "none",
  color: colors.textSecondary,
  cursor: "pointer",
  fontSize: 12,
};

const addCaseButton: CSSProperties = {
  width: "100%",
  background: colors.bgTertiary,
  border: `1px solid ${colors.borderColor}`,
  color: colors.textPrimary,
  padding: "4px 6px",
  borderRadius: 6,
  fontSize: 11,
  cursor: "pointer",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  color: colors.textSecondary,
  fontSize: 10,
};

const inputStyle: CSSProperties = {
  background: colors.bgPrimary,
  border: `1px solid ${colors.borderColor}`,
  borderRadius: 4,
  color: colors.textPrimary,
  padding: "4px 6px",
  fontSize: 11,
};

const selectStyle: CSSProperties = {
  background: colors.bgPrimary,
  border: `1px solid ${colors.borderColor}`,
  borderRadius: 4,
  color: colors.textPrimary,
  padding: "4px 6px",
  fontSize: 11,
};
