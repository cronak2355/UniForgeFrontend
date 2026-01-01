import type { EditorVariable } from "./Variable";
import type { EditorEvent } from "./Event";
import type { EditorComponent } from "./Component";

export type EditorEntity = {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    variables: EditorVariable[];
    events: EditorEvent[];
    components: EditorComponent[];
};