import type { EditorVariable } from "./Variable";
import type { EditorEvent } from "./Event";

export type EditorEntity = {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    variables: EditorVariable[];
   events: EditorEvent[];
};