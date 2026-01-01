import { EditorMode, CameraMode } from "./editorMode/editorModes";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";

export interface EditorContext {
    currentMode: EditorMode;
    currentSelectedAsset?: Asset;
    currentDraggingAsset?: Asset;
    currentSelecedEntity?: EditorEntity;
    mouse: "mousedown" | "mouseup" | "mousemove" | "click";
}

export class EditorState {
    private assets: Asset[] = [];
    private entities: Map<string, EditorEntity> = new Map();
    private tiles: Map<number, any> = new Map();

    private selectedAsset: Asset | null = null;
    private draggedAsset: Asset | null = null;
    private selectedEntity: EditorEntity | null = null;

    private editorMode: EditorMode = new CameraMode();

    private listeners: (() => void)[] = [];

    constructor() {
        // Initialize with some mock data if needed
        this.assets = [
            { id: 1, name: 'Grass', tag: 'Tile', color: '#4ade80', idx: 0, url: '' },
            { id: 2, name: 'Water', tag: 'Tile', color: '#60a5fa', idx: 1, url: '' },
            { id: 3, name: 'Stone', tag: 'Tile', color: '#9ca3af', idx: 2, url: '' },
            { id: 4, name: 'Player', tag: 'Character', url: '/cube.svg', idx: 3, color: '' },
            { id: 5, name: 'Enemy', tag: 'Character', url: '/cube.svg', idx: 4, color: '' },
        ];
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    // Getters
    getAssets() { return this.assets; }
    getEntities() { return this.entities; }
    getTiles() { return this.tiles; }
    getSelectedAsset() { return this.selectedAsset; }
    getDraggedAsset() { return this.draggedAsset; }
    getSelectedEntity() { return this.selectedEntity; }
    getEditorMode() { return this.editorMode; }

    // Setters
    setSelectedAsset(asset: Asset | null) {
        this.selectedAsset = asset;
        this.notify();
    }

    setDraggedAsset(asset: Asset | null) {
        this.draggedAsset = asset;
        this.notify();
    }

    setSelectedEntity(entity: EditorEntity | null) {
        this.selectedEntity = entity;
        this.notify();
    }

    addEntity(entity: EditorEntity) {
        if (!entity.id) {
            entity.id = Date.now().toString();
        }
        this.entities.set(entity.id, entity);
        this.notify();
    }

    sendContextToEditorModeStateMachine(ctx: EditorContext) {
        if (ctx.currentMode && ctx.currentMode !== this.editorMode) {
            this.editorMode = ctx.currentMode;
            this.notify();
        }
    }
}

export const editorCore = new EditorState();
