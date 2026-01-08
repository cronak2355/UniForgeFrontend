import type { Trigger } from "./Trigger";
import type { Condition } from "./Condition";

/* ================= Component Type ================= */

export type ComponentType =
  | "Transform"
  | "Render"
  | "Signal"
  | "Logic";

/* ================= Base ================= */

export interface BaseComponent {
  id: string;
  type: ComponentType;

  /**
   * 언제 실행될지 (OnStart, OnUpdate, OnTriggerEnter 등)
   */
  trigger?: Trigger;

  /**
   * 실행 조건 (Always, VariableEquals 등)
   */
  condition?: Condition;
}

/* ================= Transform ================= */

export interface TransformComponent extends BaseComponent {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/* ================= Render ================= */

export interface RenderComponent extends BaseComponent {
  type: "Render";
  spriteId: string;
}


/* ================= Logic ================= */

export type LogicCondition = { type: string; [key: string]: unknown };
export type LogicAction = { type: string; [key: string]: unknown };

export interface LogicComponent extends BaseComponent {
  type: "Logic";
  event: string;
  eventParams?: Record<string, unknown>;
  conditions?: LogicCondition[];
  conditionLogic?: "AND" | "OR";
  actions: LogicAction[];
}

/* ================= Signal ================= */

export type SignalValue =
  | { kind: "Literal"; value: number | string | boolean | null }
  | { kind: "EntityVariable"; name: string };

export interface SignalComponent extends BaseComponent {
  type: "Signal";
  targetEntityId?: string;
  signalKey: string;
  signalValue: SignalValue;
}

/* ================= Union ================= */

export type EditorComponent =
  | TransformComponent
  | RenderComponent
  | SignalComponent
  | LogicComponent;

/* ================= Defaults ================= */

export type ComponentDefault = {
  [K in ComponentType]: Omit<
    Extract<EditorComponent, { type: K }>,
    "id"
  >;
};

export const ComponentDefaults: ComponentDefault = {
  Transform: {
    type: "Transform",
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    trigger: { type: "OnUpdate" },
    condition: { type: "Always" },
  },

  Render: {
    type: "Render",
    spriteId: "",

    trigger: { type: "OnStart" },
    condition: { type: "Always" },
  },


  Logic: {
    type: "Logic",
    event: "OnUpdate",
    eventParams: {},
    conditions: [],
    conditionLogic: "AND",
    actions: [],
  },

  Signal: {
    type: "Signal",
    targetEntityId: "",
    signalKey: "STATE_CHANGED",
    signalValue: { kind: "Literal", value: null },

    trigger: { type: "OnUpdate" },
    condition: { type: "Always" },
  },
};
