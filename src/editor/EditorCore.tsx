import { EditorMode, CameraMode } from "./editorMode/editorModes";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";
import type { EditorVariable } from "./types/Variable";
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

    // Global entities (scene-independent)
    private globalEntities: Map<string, EditorEntity> = new Map();

    private aspectRatio: string = "1280x720"; // Default Aspect Ratio

    private selectedAsset: Asset | null = null;
    private draggedAsset: Asset | null = null;
    private selectedEntity: EditorEntity | null = null;

    // History System
    private history: string[] = [];
    private historyIndex: number = -1;
    private readonly MAX_HISTORY = 50;

    // Clipboard System
    private clipboard: EditorEntity | null = null;

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

        // DEV: localStorage에서 로컬 에셋 불러오기
        if (import.meta.env.DEV || window.location.hostname === 'localhost') {
            try {
                const LOCAL_ASSETS_KEY = 'uniforge_local_assets';
                const localAssets = JSON.parse(localStorage.getItem(LOCAL_ASSETS_KEY) || '[]');
                for (const asset of localAssets) {
                    this.assets.push({
                        id: asset.id,
                        name: asset.name,
                        tag: asset.tag,
                        url: asset.url,
                        idx: -1,
                        metadata: asset.metadata
                    });
                }
                if (localAssets.length > 0) {
                    console.log(`[EditorCore] Loaded ${localAssets.length} local assets from localStorage`);
                }
            } catch (e) {
                console.warn("[EditorCore] Failed to load local assets:", e);
            }
        }

        // Initialize default GameState global entity
        this.createGlobalEntity("GameState", [
            { id: crypto.randomUUID(), name: "playerHP", type: "float", value: 100 },
            { id: crypto.randomUUID(), name: "playerMaxHP", type: "float", value: 100 },
            { id: crypto.randomUUID(), name: "score", type: "int", value: 0 },
        ]);

        // Initialize default scene
        this.createScene("Scene 1", "default");
        this.loadDemoScene();

        // Initial snapshot
        this.snapshot();
    }

    // --- History System ---
    private snapshot() {
        // Serialize current scene data (only entities and tiles for now as they are scene-specific)
        const scene = this.getCurrentScene();
        if (!scene) return;

        const state = JSON.stringify({
            entities: Array.from(scene.entities.entries()),
            tiles: Array.from(scene.tiles.entries()),
            globalEntities: Array.from(this.globalEntities.entries()),
            aspectRatio: this.aspectRatio
        });

        // If we are not at the end, truncate future history
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push(state);
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        console.log(`[EditorCore] Snapshot taken. Index: ${this.historyIndex}, Total: ${this.history.length}`);
    }

    public undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            console.log(`[EditorCore] Undo. Index: ${this.historyIndex}`);
        }
    }

    public redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            console.log(`[EditorCore] Redo. Index: ${this.historyIndex}`);
        }
    }

    private restoreState(jsonState: string) {
        try {
            const state = JSON.parse(jsonState);
            const scene = this.getCurrentScene();
            if (!scene) return;

            // Restore Entities
            scene.entities = new Map(state.entities);

            // Restore Tiles
            scene.tiles = new Map(state.tiles);

            // Restore Global
            this.globalEntities = new Map(state.globalEntities);

            if (state.aspectRatio) {
                this.aspectRatio = state.aspectRatio;
            }

            // Restore selection if possible (check if ID exists)
            if (this.selectedEntity && !scene.entities.has(this.selectedEntity.id)) {
                this.selectedEntity = null;
            }

            this.notify();
        } catch (e) {
            console.error("Failed to restore state", e);
        }
    }

    // --- Clipboard System ---
    public copy(entity: EditorEntity | null) {
        if (!entity) return;
        this.clipboard = JSON.parse(JSON.stringify(entity));
        console.log("[EditorCore] Copied:", this.clipboard?.name);
    }

    public cut(entity: EditorEntity | null) {
        if (!entity) return;
        this.copy(entity);
        this.removeEntity(entity.id);
    }

    public paste() {
        if (!this.clipboard) return;

        const source = this.clipboard;
        // Clone logic adapted from EditorLayout
        const cloned: EditorEntity = JSON.parse(JSON.stringify(source));

        cloned.id = crypto.randomUUID();
        cloned.name = `${source.name} Copy`;
        cloned.x = (source.x ?? 0) + 20;
        cloned.y = (source.y ?? 0) + 20;

        // Deep clone internal IDs
        if (cloned.variables) cloned.variables = cloned.variables.map(v => ({ ...v, id: crypto.randomUUID() }));
        if (cloned.events) cloned.events = cloned.events.map(e => ({ ...e, id: crypto.randomUUID() }));
        // TODO: Deep clone logic components interaction logic if strictly needed, 
        // usually UUIDs in logic need re-mapping, but for simple copy it might suffice.

        this.addEntity(cloned);
        this.setSelectedEntity(cloned);
    }
    public loadDemoScene() {
        // Demo entities removed - start with empty scene
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

    // --- Global Entity Management (Scene-Independent) ---
    getGlobalEntities(): Map<string, EditorEntity> {
        return this.globalEntities;
    }

    getGlobalEntity(id: string): EditorEntity | undefined {
        return this.globalEntities.get(id);
    }

    createGlobalEntity(name: string, variables: EditorVariable[]): string {
        this.snapshot();
        const id = `global-${crypto.randomUUID()}`;
        const entity: EditorEntity = {
            id,
            name,
            type: "container",
            role: "none",
            events: [],
            x: 0, y: 0, z: 0,
            rotation: 0, rotationX: 0, rotationY: 0, rotationZ: 0,
            scaleX: 1, scaleY: 1,
            variables,
            components: [],
            logic: []
        };
        this.globalEntities.set(id, entity);
        this.notify();
        return id;
    }

    updateGlobalEntity(entity: EditorEntity) {
        if (this.globalEntities.has(entity.id)) {
            this.globalEntities.set(entity.id, entity);
            this.notify();
        }
    }

    removeGlobalEntity(id: string) {
        this.globalEntities.delete(id);
        this.notify();
    }


    // --- Scene Management ---
    getScenes() { return this.scenes; }
    getCurrentSceneId() { return this.currentSceneId; }
    getCurrentScene() { return this.scenes.get(this.currentSceneId); }

    createScene(name: string, id?: string, skipDefaultEntities: boolean = false): string {
        this.snapshot();
        const newId = id || crypto.randomUUID();
        this.scenes.set(newId, {
            id: newId,
            name,
            entities: new Map(),
            tiles: new Map()
        });

        // [User Request] Ensure Main Camera exists in every new scene
        // Skip if this createScene call is part of a deserialize/load process (skipDefaultEntities = true)
        if (!skipDefaultEntities) {
            const scene = this.scenes.get(newId);
            if (scene) {
                const hasCamera = Array.from(scene.entities.values()).some(e => e.name === "Main Camera");
                if (!hasCamera) {
                    const cameraEntity: EditorEntity = {
                        id: crypto.randomUUID(),
                        name: "Main Camera",
                        type: "container",
                        role: "neutral",
                        x: 640,
                        y: 360,
                        z: 0,
                        rotation: 0,
                        rotationX: 0,
                        rotationY: 0,
                        rotationZ: 0,
                        scaleX: 1,
                        scaleY: 1,
                        variables: [],
                        components: [],
                        logic: [],
                        events: []
                    };
                    scene.entities.set(cameraEntity.id, cameraEntity);
                }
            }
        }

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
        this.snapshot();
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
    getEntities() {
        return this.getCurrentScene()?.entities ?? this.entities;
    }
    getEntity(id: string) {
        return this.getCurrentScene()?.entities.get(id) ?? this.entities.get(id);
    }
    hasEntity(id: string) {
        return this.getCurrentScene()?.entities.has(id) ?? this.entities.has(id);
    }
    getTiles() {
        return this.getCurrentScene()?.tiles ?? this.tiles;
    }
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

        // Update module references for all entities so runtime sees latest graph
        for (const scene of this.scenes.values()) {
            scene.entities.forEach((entity) => {
                if (!entity.modules) return;
                const hasModule = entity.modules.some((m) => m.id === module.id);
                if (!hasModule) return;
                entity.modules = entity.modules.map((m) => (m.id === module.id ? module : m));
            });
        }

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
    getSelectedEntity() { return this.selectedEntity; }
    getEditorMode() { return this.editorMode; }

    setSelectedEntity(entity: EditorEntity | null) {
        this.selectedEntity = entity;
        // 엔티티 선택 시 에셋 선택 해제 (프리팹 인스펙터 닫기)
        if (entity !== null) {
            this.selectedAsset = null;
        }
        this.notify();
    }

    addAsset(asset: Asset) {
        this.assets = [...this.assets, asset];
        this.notify();
    }

    updateAsset(updatedAsset: Asset) {
        const index = this.assets.findIndex(a => a.id === updatedAsset.id);
        if (index !== -1) {
            const newAssets = [...this.assets];
            newAssets[index] = updatedAsset;
            this.assets = newAssets;
            this.notify();
        }
    }

    setAssets(assets: Asset[]) {
        this.assets = [...assets];
        this.notify();
    }

    // Update entity without triggering snapshot (for continuous updates like dragging)
    updateEntity(entity: EditorEntity) {
        const scene = this.getCurrentScene();
        if (!scene) return;

        const normalized = syncLegacyFromLogic(ensureEntityLogic(entity));
        scene.entities.set(entity.id, normalized);
        if (this.selectedEntity?.id === entity.id) {
            this.selectedEntity = normalized;
        }
        this.notify();
    }

    addEntity(entity: EditorEntity) {
        this.snapshot();
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

        // Deep copy to prevent external mutations from affecting stored data
        const safeCopy = JSON.parse(JSON.stringify(normalized)) as EditorEntity;
        scene.entities.set(entity.id, safeCopy);
        if (this.selectedEntity?.id === entity.id) {
            this.selectedEntity = safeCopy;
        }
        this.notify();
    }

    /**
     * Update an entity wherever it exists (in any scene or global entities).
     * This prevents entities from being duplicated across scenes.
     */
    updateEntityAnywhere(entity: EditorEntity) {
        this.snapshot();
        const normalized = syncLegacyFromLogic(ensureEntityLogic(entity));
        const safeCopy = JSON.parse(JSON.stringify(normalized)) as EditorEntity;

        // Check if entity exists in global entities
        if (this.globalEntities.has(entity.id)) {
            this.globalEntities.set(entity.id, safeCopy);
            if (this.selectedEntity?.id === entity.id) {
                this.selectedEntity = safeCopy;
            }
            this.notify();
            return;
        }

        // Search all scenes for the entity
        for (const [sceneId, scene] of this.scenes) {
            if (scene.entities.has(entity.id)) {
                scene.entities.set(entity.id, safeCopy);
                if (this.selectedEntity?.id === entity.id) {
                    this.selectedEntity = safeCopy;
                }
                this.notify();
                return;
            }
        }

        // If entity doesn't exist anywhere, add it to the current scene
        console.warn(`[EditorCore] Entity ${entity.id} not found in any scene, adding to current scene`);
        const scene = this.getCurrentScene();
        if (scene) {
            scene.entities.set(entity.id, safeCopy);
            if (this.selectedEntity?.id === entity.id) {
                this.selectedEntity = safeCopy;
            }
            this.notify();
        }
    }

    updateEntityPosition(id: string, x: number, y: number) {
        const scene = this.getCurrentScene();
        if (!scene) return;

        const existing = scene.entities.get(id);
        if (!existing) return;

        const updated = { ...existing, x, y };
        scene.entities.set(id, updated);

        if (this.selectedEntity?.id === id) {
            this.selectedEntity = updated;
        }

        this.notify();
    }

    setTile(x: number, y: number, tile: number) {
        this.snapshot();
        const scene = this.getCurrentScene();
        if (!scene) return;

        const key = `${x},${y}`;
        scene.tiles.set(key, { x, y, tile });
        this.notify();
    }

    removeTile(x: number, y: number) {
        this.snapshot();
        const scene = this.getCurrentScene();
        if (!scene) return;

        const key = `${x},${y}`;
        if (scene.tiles.delete(key)) {
            this.notify();
        }
    }

    removeEntity(id: string) {
        this.snapshot();
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

    getAspectRatio() { return this.aspectRatio; }
    setAspectRatio(ratio: string) {
        if (this.aspectRatio !== ratio) {
            this.snapshot();
            this.aspectRatio = ratio;
            this.notify();
        }
    }
}

export const editorCore = new EditorState();


