export type VariableType = "int" | "float" | "string" | "bool" | "vector2";

export interface EditorVariable {
  id: string;
  name: string;
  type: VariableType;
  value: number | string | boolean | { x: number; y: number };
}
