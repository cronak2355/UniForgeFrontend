import { EditorMode, CameraMode } from "./editorMode/editorModes";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";
import type { IGameState } from "./core/IGameState";

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
        this.assets = [
            { id: 0, name: "test1", tag: "Tile", url: "TestAsset.webp", idx: -1 },
            { id: 1, name: "test2", tag: "Tile", url: "TestAsset2.webp", idx: -1 },
            { id: 2, name: "test3", tag: "Tile", url: "TestAsset3.webp", idx: -1 },
            { id: 3, name: "dragon", tag: "Character", url: "RedDragon.webp", idx: -1 },
        ];

        // 데모용 초기 엔티티 - 플레이어
        const playerId = "demo-player";
        this.entities.set(playerId, {
            id: playerId,
            type: "sprite",
            name: "Player",
            x: 400,
            y: 300,
            z: 0,
            texture: "dragon",
            variables: [],
            events: [],
            components: [],
            rules: [],
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            modules: [
                {
                    id: "player-kinetic",
                    type: "Kinetic",
                    mode: "TopDown",
                    maxSpeed: 200,
                    friction: 0.9,
                    gravity: 0,
                    jumpForce: 0,
                },
                {
                    id: "player-status",
                    type: "Status",
                    hp: 100,
                    maxHp: 100,
                    mp: 50,
                    maxMp: 50,
                    attack: 10,
                    defense: 5,
                    speed: 1,
                },
                {
                    id: "player-combat",
                    type: "Combat",
                    attackRange: 150,
                    attackInterval: 500,
                    damage: 10,
                    bulletPattern: "Single",
                    bulletCount: 1,
                },
            ],
        });

        // 데모용 초기 엔티티 - 적
        const enemyId = "demo-enemy";
        this.entities.set(enemyId, {
            id: enemyId,
            type: "sprite",
            name: "Enemy",
            x: 600,
            y: 300,
            z: 0,
            texture: "dragon",
            variables: [],
            events: [],
            components: [],
            rules: [],
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            modules: [
                {
                    id: "enemy-status",
                    type: "Status",
                    hp: 50,
                    maxHp: 50,
                    mp: 0,
                    maxMp: 0,
                    attack: 5,
                    defense: 2,
                    speed: 0.5,
                },
            ],
        });
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

    // Getters (IGameState 구현)
    getAssets() { return this.assets; }
    getEntities() { return this.entities; }
    getEntity(id: string) { return this.entities.get(id); }
    hasEntity(id: string) { return this.entities.has(id); }
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

    addAsset(asset: Asset) {
        this.assets.push(asset);
        this.notify();
    }

    addEntity(entity: EditorEntity) {
        if (!entity.id) {
            entity.id = Date.now().toString();
        }
        this.entities.set(entity.id, entity);
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

    sendContextToEditorModeStateMachine(ctx: EditorContext) {
        if (ctx.currentMode && ctx.currentMode !== this.editorMode) {
            this.editorMode = ctx.currentMode;
            this.notify();
        }
    }
}

export const editorCore = new EditorState();
