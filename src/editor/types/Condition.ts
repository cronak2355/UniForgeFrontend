export type ConditionType =
  | "Always"
  | "VariableEquals";

export interface Condition {
  type: ConditionType;

  /**
   * 조건별 파라미터
   * VariableEquals →
   * { name: "isMoving", value: true }
   */
  params?: Record<string, any>;
}