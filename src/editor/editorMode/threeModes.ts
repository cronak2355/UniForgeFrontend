import type { EditorEntity } from "../types/Entity";
import type { IEditorMode } from "./IEditorMode";

export type ThreePointer = {
    clientX: number;
    clientY: number;
};

export interface ThreeEditorScene {
    pickEntityId(pointer: ThreePointer): string | null;
    getEntityById(id: string): EditorEntity | undefined;
    setSelectedEntity(entity: EditorEntity | null): void;
    attachTransformTo(id: string | null): void;
}

export class ThreeCameraMode implements IEditorMode<ThreeEditorScene, ThreePointer> {
    enter(_scene: ThreeEditorScene): void { }
    exit(_scene: ThreeEditorScene): void { }
    onPointerDown(scene: ThreeEditorScene, p: ThreePointer): void {
        const id = scene.pickEntityId(p);
        if (!id) {
            scene.setSelectedEntity(null);
            scene.attachTransformTo(null);
            return;
        }

        const entity = scene.getEntityById(id);
        if (!entity) return;
        scene.setSelectedEntity(entity);
        scene.attachTransformTo(id);
    }
    onPointerMove(_scene: ThreeEditorScene, _p: ThreePointer): void { }
    onPointerUp(_scene: ThreeEditorScene, _p: ThreePointer): void { }
    onScroll(_scene: ThreeEditorScene, _deltaY: number): void { }
    update(_scene: ThreeEditorScene, _dt: number): void { }
}
