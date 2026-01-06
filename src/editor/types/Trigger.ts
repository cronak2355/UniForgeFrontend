export type TriggerType =
  | "OnStart"
  | "OnUpdate"
  | "OnKeyDown"
  | "OnClick"
  | "VariableOnChanged";

export interface Trigger {
  radius: any;
  once: boolean;
  id: unknown;
  type: TriggerType;
  params?: Record<string, any>;
}
