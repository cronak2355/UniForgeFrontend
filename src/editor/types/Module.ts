export type ModuleLiteral = number | string | boolean | null;

export type ModuleFlowType = "Instant" | "Async";

export type ModuleFlowBlockType =
  | "SetVariable"
  | "Rotate"
  | "PlaySound"
  | "Wait"
  | "MoveTo"
  | "PlayAnimation";

export type ModuleConditionType =
  | "IfVariableEquals"
  | "IfVariableGreaterThan"
  | "IfVariableLessThan"
  | "IfVariableChanged";

export type ModuleNodeKind =
  | "Entry"
  | "Flow"
  | "Condition"
  | "Merge"
  | "Stop"
  | "Value";

export type ModuleEdgeType = "flow" | "value";

export interface ModuleEdge {
  id: string;
  type: ModuleEdgeType;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
}

export interface ModuleNodeBase {
  id: string;
  kind: ModuleNodeKind;
  x: number;
  y: number;
}

export interface ModuleEntryNode extends ModuleNodeBase {
  kind: "Entry";
}

export interface ModuleFlowNode extends ModuleNodeBase {
  kind: "Flow";
  flowType: ModuleFlowType;
  blockType: ModuleFlowBlockType;
  params: Record<string, ModuleLiteral>;
}

export interface ModuleConditionNode extends ModuleNodeBase {
  kind: "Condition";
  condition: ModuleConditionType;
  leftLiteral: ModuleLiteral;
  rightLiteral: ModuleLiteral;
}

export interface ModuleMergeNode extends ModuleNodeBase {
  kind: "Merge";
}

export interface ModuleStopNode extends ModuleNodeBase {
  kind: "Stop";
  result: "Success" | "Failed";
  errorCode?: string;
}

export interface ModuleValueNode extends ModuleNodeBase {
  kind: "Value";
  variableName: string;
}

export type ModuleNode =
  | ModuleEntryNode
  | ModuleFlowNode
  | ModuleConditionNode
  | ModuleMergeNode
  | ModuleStopNode
  | ModuleValueNode;

export interface ModuleGraph {
  id: string;
  name: string;
  entryNodeId: string;
  nodes: ModuleNode[];
  edges: ModuleEdge[];
}

export function createDefaultModuleGraph(): ModuleGraph {
  const entryId = crypto.randomUUID();
  const stopId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    name: "Main",
    entryNodeId: entryId,
    nodes: [
      { id: entryId, kind: "Entry", x: 120, y: 120 },
      { id: stopId, kind: "Stop", x: 360, y: 120, result: "Success" },
    ],
    edges: [
      {
        id: crypto.randomUUID(),
        type: "flow",
        fromNodeId: entryId,
        fromPort: "out",
        toNodeId: stopId,
        toPort: "in",
      },
    ],
  };
}
