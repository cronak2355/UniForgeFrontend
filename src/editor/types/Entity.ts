import type { EditorVariable } from "./Variable";
import type { EditorEvent } from "./Event";
import type { EditorComponent } from "./Component";
import type { GameRule } from "../core/events/RuleEngine";
import type { EditorLogicItem } from "./Logic";

export interface EditorEntity {
  id: string;
  type: "sprite" | "container" | "nineSlice";
  name: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX: number;
  scaleY: number;
  role: string;
  texture?: string;
  variables: EditorVariable[];
  events: EditorEvent[];

  // Unified logic list (components/rules)
  logic: EditorLogicItem[];

  // Legacy fields kept for backward compatibility
  components?: EditorComponent[];
  rules?: GameRule[];
}
