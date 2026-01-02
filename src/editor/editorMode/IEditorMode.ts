export interface IEditorMode<TScene = unknown, TPointer = unknown> {
    enter(scene: TScene): void;
    exit(scene: TScene): void;
    onPointerDown(scene: TScene, p: TPointer): void;
    onPointerMove(scene: TScene, p: TPointer): void;
    onPointerUp(scene: TScene, p: TPointer): void;
    onScroll(scene: TScene, deltaY: number): void;
    update(scene: TScene, dt: number): void;
}
