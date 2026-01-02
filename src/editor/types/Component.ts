import type { Trigger } from "./Trigger";
import type { Condition } from "./Condition";

/* ================= Component Type ================= */

export type ComponentType =
  | "Transform"
  | "Render"
  | "Variables";

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

/* ================= Variables ================= */

export interface VariablesComponent extends BaseComponent {
  type: "Variables";
  values: Record<string, number | boolean | string>;
}

/* ================= Union ================= */

export type EditorComponent =
  | TransformComponent
  | RenderComponent
  | VariablesComponent;

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

  Variables: {
    type: "Variables",
    values: {},

    trigger: { type: "OnStart" },
    condition: { type: "Always" },
  },
};
