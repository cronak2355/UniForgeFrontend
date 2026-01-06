export type VariableType = "int" | "float" | "string" | "bool";

export interface EditorVariable {
  id: string;
  name: string;
  type: VariableType;
  value: number | string | boolean;
}
