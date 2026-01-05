export type VariableType = "int" | "float" | "string";

export interface EditorVariable {
  id: string;
  name: string;
  type: VariableType;
  value: number | string;
}
