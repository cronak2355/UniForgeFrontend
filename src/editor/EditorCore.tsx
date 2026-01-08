import { EditorMode, CameraMode } from "./editorMode/editorModes";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";
import type { IGameState } from "./core/IGameState";
import { ensureEntityLogic, syncLegacyFromLogic } from "./utils/entityLogic";
import { buildLogicItems } from "./types/Logic";

export interface EditorContext {
    currentMode: EditorMode;
    currentSelectedAsset?: Asset;
    currentDraggingAsset?: Asset;
    currentSelecedEntity?: EditorEntity;
    mouse: "mousedown" | "mouseup" | "mousemove" | "click";
}

export type TilePlacement = {
    x: number;
    y: number;
    tile: number;
};

export class EditorState implements IGameState {
    private assets: Asset[] = [];
    private entities: Map<string, EditorEntity> = new Map();
    private tiles: Map<string, TilePlacement> = new Map();

    private selectedAsset: Asset | null = null;
    private draggedAsset: Asset | null = null;
    private selectedEntity: EditorEntity | null = null;

    private editorMode: EditorMode = new CameraMode();

    private listeners: (() => void)[] = [];

    constructor() {
        const assetUrl = (fileName: string) => {
            const base =
                (import.meta as { env?: { BASE_URL?: string } })?.env?.BASE_URL || "/";
            const normalizedBase = base.endsWith("/") ? base : `${base}/`;
            return new URL(`${normalizedBase}${fileName}`, window.location.origin).toString();
        };
        this.assets = [
            { id: "1", name: "test1", tag: "Tile", url: assetUrl("TestAsset.webp"), idx: -1 },
            { id: "2", name: "test2", tag: "Tile", url: assetUrl("TestAsset2.webp"), idx: -1 },
            { id: "3", name: "test3", tag: "Tile", url: assetUrl("TestAsset3.webp"), idx: -1 },
            { id: "4", name: "dragon", tag: "Character", url: assetUrl("RedDragon.webp"), idx: -1 },
        ];
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach((l) => l());
    }

    getAssets() { return this.assets; }
    getEntities() { return this.entities; }
    getEntity(id: string) { return this.entities.get(id); }
    hasEntity(id: string) { return this.entities.has(id); }
    getTiles() { return this.tiles; }
    getSelectedAsset() { return this.selectedAsset; }
    getDraggedAsset() { return this.draggedAsset; }
    getSelectedEntity() { return this.selectedEntity; }
    getEditorMode() { return this.editorMode; }

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

    addAsset(asset: Asset) {
        this.assets.push(asset);
        this.notify();
    }

    addEntity(entity: EditorEntity) {
        if (!entity.id) {
            entity.id = Date.now().toString();
        }
        // [User Request] Default depth 10 for testing
        if (entity.z === undefined) {
            entity.z = 10;
        }
        const normalized = syncLegacyFromLogic(ensureEntityLogic(entity));
        this.entities.set(entity.id, normalized);
        if (this.selectedEntity?.id === entity.id) {
            this.selectedEntity = normalized;
        }
        this.notify();
    }

    setTile(x: number, y: number, tile: number) {
        const key = `${x},${y}`;
        this.tiles.set(key, { x, y, tile });
        this.notify();
    }

    removeTile(x: number, y: number) {
        const key = `${x},${y}`;
        if (this.tiles.delete(key)) {
            this.notify();
        }
    }

    removeEntity(id: string) {
        if (this.entities.delete(id)) {
            if (this.selectedEntity?.id === id) {
                this.selectedEntity = null;
            }
            this.notify();
        }
    }

    clear() {
        this.entities.clear();
        this.tiles.clear();
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


