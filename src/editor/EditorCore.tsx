import { EditorMode, CameraMode } from "./editorMode/editorModes";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";
import type { IGameState } from "./core/IGameState";
import { ensureEntityLogic, ensureEntityModules, syncLegacyFromLogic } from "./utils/entityLogic";
import { buildLogicItems } from "./types/Logic";
import type { ModuleGraph } from "./types/Module";

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

// NEW: Scene Data Structure
export interface SceneData {
    id: string;
    name: string;
    entities: Map<string, EditorEntity>;
    tiles: Map<string, TilePlacement>;
}

export class EditorState implements IGameState {
    private assets: Asset[] = [];
    private modules: ModuleGraph[] = [];
    private entities: Map<string, EditorEntity> = new Map();
    private tiles: Map<string, TilePlacement> = new Map();

    // Multi-scene support
    private scenes: Map<string, SceneData> = new Map();
    private currentSceneId: string = "default";

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
            { id: "4", name: "tree", tag: "Character", url: assetUrl("GreenTree.webp"), idx: -1 },
        ];

        // Initialize default scene
        this.createScene("Scene 1", "default");
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

    // --- Scene Management ---
    getScenes() { return this.scenes; }
    getCurrentSceneId() { return this.currentSceneId; }
    getCurrentScene() { return this.scenes.get(this.currentSceneId); }

    createScene(name: string, id?: string): string {
        const newId = id || crypto.randomUUID();
        this.scenes.set(newId, {
            id: newId,
            name,
            entities: new Map(),
            tiles: new Map()
        });
        this.currentSceneId = newId; // Auto-switch to new scene
        this.notify();
        return newId;
    }

    switchScene(id: string) {
        if (this.scenes.has(id)) {
            this.currentSceneId = id;
            this.selectedEntity = null; // Deselect on switch
            this.notify();
        }
    }

    renameScene(id: string, newName: string) {
        const scene = this.scenes.get(id);
        if (scene) {
            scene.name = newName;
            this.notify();
        }
    }

    removeScene(id: string) {
        if (this.scenes.size <= 1) {
            console.warn("Cannot remove the last scene.");
            return;
        }

        const scene = this.scenes.get(id);
        if (scene) {
            // Explicitly clear data (as requested/implied for safety)
            scene.entities.clear();
            scene.tiles.clear();

            if (this.scenes.delete(id)) {
                if (this.currentSceneId === id) {
                    // Switch to first available scene
                    const next = this.scenes.keys().next().value;
                    if (next) {
                        this.currentSceneId = next;
                        this.selectedEntity = null;
                    }
                }
                this.notify();
            }
        }
    }

    // --- Asset Management (Global) ---
    getAssets() { return this.assets; }
    getModules() { return this.modules; }
    getEntities() { return this.entities; }
    getEntity(id: string) { return this.entities.get(id); }
    hasEntity(id: string) { return this.entities.has(id); }
    getTiles() { return this.tiles; }
    getSelectedAsset() { return this.selectedAsset; }
    getDraggedAsset() { return this.draggedAsset; }

    addModule(module: ModuleGraph) {
        this.modules.push(module);
        this.notify();
    }

    updateModule(module: ModuleGraph) {
        const idx = this.modules.findIndex((m) => m.id === module.id);
        if (idx === -1) return;
        this.modules[idx] = module;
        this.notify();
    }

    removeModule(moduleId: string) {
        this.modules = this.modules.filter((m) => m.id !== moduleId);
        this.notify();
    }

    setModules(modules: ModuleGraph[]) {
        this.modules = modules;
        this.notify();
    }

    setSelectedAsset(asset: Asset | null) {
        this.selectedAsset = asset;
        this.notify();
    }

    setDraggedAsset(asset: Asset | null) {
        this.draggedAsset = asset;
        this.notify();
    }

    // --- Entity & Tile Management (Scene Specific) ---
    getEntities() {
        return this.getCurrentScene()?.entities || new Map();
    }

    getEntity(id: string) {
        return this.getCurrentScene()?.entities.get(id);
    }

    hasEntity(id: string) {
        return this.getCurrentScene()?.entities.has(id) || false;
    }

    getTiles() {
        return this.getCurrentScene()?.tiles || new Map();
    }

    getSelectedEntity() { return this.selectedEntity; }
    getEditorMode() { return this.editorMode; }

    setSelectedEntity(entity: EditorEntity | null) {
        this.selectedEntity = entity;
        this.notify();
    }

    addAsset(asset: Asset) {
        this.assets.push(asset);
        this.notify();
    }

    addEntity(entity: EditorEntity) {
        const scene = this.getCurrentScene();
        if (!scene) return;

        if (!entity.id) {
            entity.id = crypto.randomUUID();
        }
        // [User Request] Default depth 10 for testing
        if (entity.z === undefined) {
            entity.z = 10;
        }
        const normalized = syncLegacyFromLogic(ensureEntityLogic(entity));
        scene.entities.set(entity.id, normalized);
        if (this.selectedEntity?.id === entity.id) {
            this.selectedEntity = normalized;
        }
        this.notify();
    }

    setTile(x: number, y: number, tile: number) {
        const scene = this.getCurrentScene();
        if (!scene) return;

        const key = `${x},${y}`;
        scene.tiles.set(key, { x, y, tile });
        this.notify();
    }

    removeTile(x: number, y: number) {
        const scene = this.getCurrentScene();
        if (!scene) return;

        const key = `${x},${y}`;
        if (scene.tiles.delete(key)) {
            this.notify();
        }
    }

    removeEntity(id: string) {
        const scene = this.getCurrentScene();
        if (!scene) return;

        if (scene.entities.delete(id)) {
            if (this.selectedEntity?.id === id) {
                this.selectedEntity = null;
            }
            this.notify();
        }
    }

    clear() {
        // Only clear current scene
        const scene = this.getCurrentScene();
        if (scene) {
            scene.entities.clear();
            scene.tiles.clear();
            this.notify();
        }
    }

    // Clear ALL scenes (for project load)
    clearAll() {
        this.scenes.clear();
        this.assets = [];
        this.createScene("Scene 1", "default");
        this.notify();
    }

    // Completely empty state (for deserialization)
    reset() {
        this.scenes.clear();
        this.assets = [];
        this.selectedEntity = null;
        this.draggedAsset = null;
        this.selectedAsset = null;
        this.currentSceneId = ""; // No scene active
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


