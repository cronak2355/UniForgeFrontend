import type { EditorVariable } from "./Variable";
import type { EditorEvent } from "./Event";
import type { EditorComponent } from "./Component";
import type { EditorModule } from "./Module";

export type EditorEntity = {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    z: number;  // 기본값 0, Phaser에서는 depth로 사용
    variables: EditorVariable[];
    events: EditorEvent[];
    components: EditorComponent[];
    modules: EditorModule[];  // StatusModule, KineticModule 등
};