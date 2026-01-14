import { useEffect, useRef, useState } from "react";
import { useEditorCoreSnapshot } from "../contexts/EditorCoreContext";
import { GameCore } from "./core/GameCore";
import { GameUIOverlay } from "./ui/GameUIOverlay"; // Import UI Overlay
import { PhaserRenderer } from "./renderer/PhaserRenderer";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";
import type { TilePlacement } from "./EditorCore";
import type { ModuleGraph } from "./types/Module";
import { defaultGameConfig } from "./core/GameConfig";
import { EventBus } from "./core/events/EventBus";
import type { GameEvent } from "./core/events/EventBus";
import type { InputState } from "./core/RuntimePhysics";

const TILE_SIZE = 32;
const TILESET_COLS = 16;

async function buildTilesetCanvas(assets: Asset[]): Promise<HTMLCanvasElement | null> {
    const tileAssets = assets.filter((asset) => asset.tag === "Tile");
    if (tileAssets.length === 0) return null;

    const tilesetcanvas = document.createElement("canvas");
    tilesetcanvas.width = TILE_SIZE * TILESET_COLS;
    tilesetcanvas.height = Math.ceil(tileAssets.length / TILESET_COLS) * TILE_SIZE;

    const ctx = tilesetcanvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");

    let idx = 0;
    for (const asset of tileAssets) {
        asset.idx = idx;

        const img = new Image();
        img.crossOrigin = "anonymous";
        const loaded = await new Promise<boolean>((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = (e) => {
                console.error(`Failed to load image for tile: ${asset.name}`, e);
                resolve(false);
            };
            img.src = asset.url;
        });

        const x = (idx % TILESET_COLS) * TILE_SIZE;
        const y = Math.floor(idx / TILESET_COLS) * TILE_SIZE;
        if (loaded) {
            ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
            ctx.fillStyle = "#ff00ff";
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }

        idx++;
    }

    return tilesetcanvas;
}

function buildTileSignature(assets: Asset[]): string {
    return assets
        .filter((asset) => asset.tag === "Tile")
        .map((asset) => `${asset.name}:${asset.url}`)
        .join("|");
}

function applyAllTiles(renderer: PhaserRenderer, tiles: TilePlacement[]) {
    for (const t of tiles) {
        renderer.setTile(t.x, t.y, t.tile);
    }
}

function indexTiles(tiles: TilePlacement[]) {
    const map = new Map<string, TilePlacement>();
    for (const t of tiles) {
        map.set(`${t.x},${t.y}`, t);
    }
    return map;
}

type RunTimeCanvasProps = {
    onRuntimeEntitySync?: (entity: EditorEntity) => void;
};

function spawnRuntimeEntities(gameRuntime: GameCore, entities: EditorEntity[]) {
    entities.forEach((entity) => {
        gameRuntime.createEntity(entity.id, entity.type, entity.x, entity.y, {
            name: entity.name,
            z: entity.z,
            rotationX: entity.rotationX,
            rotationY: entity.rotationY,
            rotationZ: entity.rotationZ,
            scaleX: entity.scaleX,
            scaleY: entity.scaleY,
            scaleZ: 1,
            variables: entity.variables,
            components: entity.components,
            modules: entity.modules,
            role: entity.role,
            texture: entity.texture,
        });
    });
}

export function RunTimeCanvas({ onRuntimeEntitySync }: RunTimeCanvasProps) {
    const ref = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<PhaserRenderer | null>(null);
    const gameCoreRef = useRef<GameCore | null>(null);
    const [gameCore, setGameCore] = useState<GameCore | null>(null);
    const prevTilesRef = useRef<Map<string, TilePlacement>>(new Map());
    const selectedEntityIdRef = useRef<string | null>(null);
    const initialModulesRef = useRef<ModuleGraph[] | null>(null);
    const rendererReadyRef = useRef(false);
    const tilemapReadyRef = useRef(false);
    const loadedTexturesRef = useRef<Set<string>>(new Set());
    const tileSignatureRef = useRef<string>("");
    const { core, assets, tiles, entities, selectedEntity, modules } = useEditorCoreSnapshot();
    const [fps, setFps] = useState(0);
    const frameCountRef = useRef(0);
    const lastFpsTimeRef = useRef(0);

    useEffect(() => {
        selectedEntityIdRef.current = selectedEntity?.id ?? null;
    }, [selectedEntity]);

    useEffect(() => {
        if (!ref.current) return;
        if (rendererRef.current) return;

        const renderer = new PhaserRenderer(core);
        rendererRef.current = renderer;
        const gameRuntime = new GameCore(renderer);
        gameCoreRef.current = gameRuntime;
        setGameCore(gameRuntime);
        renderer.gameCore = gameRuntime;
        renderer.gameConfig = defaultGameConfig;
        gameRuntime.setGameConfig(defaultGameConfig);
        renderer.useEditorCoreRuntimePhysics = false;
        renderer.getRuntimeContext = () => gameRuntime.getRuntimeContext();
        renderer.onInputState = (input) => {
            gameRuntime.setInputState(input);
        };
        if (!initialModulesRef.current) {
            initialModulesRef.current = core.getModules().map((mod) => JSON.parse(JSON.stringify(mod)));
        }
        gameRuntime.setModuleLibrary(modules, (updated) => core.updateModule(updated));

        let active = true;

        (async () => {
            await renderer.init(ref.current as HTMLElement);
            if (!active) return;
            rendererReadyRef.current = true;

            // Enable runtime mode for Rules and TICK events
            renderer.isRuntimeMode = true;

            const freshEntities = Array.from(core.getEntities().values());
            spawnRuntimeEntities(gameRuntime, freshEntities);

            if (renderer.isRuntimeMode) {
                console.log(`[RunTimeCanvas] Initialized with ${freshEntities.length} entities`);
            }

            // 렌더링 루프 콜백 설정
            renderer.onUpdateCallback = (time, delta) => {
                gameRuntime.update(time, delta);

                // FPS Calculation
                frameCountRef.current++;
                if (time > lastFpsTimeRef.current + 500) {
                    setFps(Math.round(frameCountRef.current * 1000 / (time - lastFpsTimeRef.current)));
                    frameCountRef.current = 0;
                    lastFpsTimeRef.current = time;
                }

                // [UI Text Sync] Runtime variable -> Phaser Text
                // Optimized: Access RuntimeContext directly
                const runtimeContext = gameRuntime.getRuntimeContext();

                // Helper to get variable value
                const getVarValue = (entId: string, varName: string, isRuntime: boolean, entObj?: any) => {
                    if (isRuntime) {
                        return runtimeContext.getEntityVariable(entId, varName);
                    } else {
                        return entObj?.variables?.find((v: any) => v.name === varName)?.value;
                    }
                };

                for (const [id, entity] of runtimeContext.entities) {
                    // Check if this is a UI element
                    const isUI = runtimeContext.getEntityVariable(id, "isUI");
                    if (isUI !== true) continue;

                    // Get source entity for cross-entity linking
                    const uiSourceEntityId = runtimeContext.getEntityVariable(id, "uiSourceEntity");

                    let sourceId = uiSourceEntityId ? String(uiSourceEntityId) : null;
                    let isRuntimeSource = false;
                    let sourceEntity: any = null;

                    // 1. Try Runtime Entities
                    if (sourceId && runtimeContext.entities.has(sourceId)) {
                        sourceEntity = runtimeContext.entities.get(sourceId);
                        isRuntimeSource = true;
                    }
                    // 2. Fallback to Global Editor Entities (for static refs)
                    else if (sourceId) {
                        sourceEntity = core.getGlobalEntities().get(sourceId);
                        isRuntimeSource = false;
                    }

                    if (!sourceEntity) continue;

                    const uiType = runtimeContext.getEntityVariable(id, "uiType");
                    const uiValueLink = runtimeContext.getEntityVariable(id, "uiValueVar");
                    const uiText = runtimeContext.getEntityVariable(id, "uiText");

                    // Priority: Linked Variable (from source entity) > Static Text
                    if (uiValueLink) {
                        const val = getVarValue(sourceId!, String(uiValueLink), isRuntimeSource, sourceEntity);
                        if (val !== undefined) {
                            renderer.setText(id, String(val));
                        }
                    } else if (uiText !== undefined) {
                        renderer.setText(id, String(uiText));
                    }

                    // [UI Bar Sync]
                    if (uiType === "bar") {
                        const valVarName = runtimeContext.getEntityVariable(id, "uiValueVar");
                        const maxVarName = runtimeContext.getEntityVariable(id, "uiMaxVar");

                        if (valVarName && maxVarName) {
                            const val = getVarValue(sourceId!, String(valVarName), isRuntimeSource, sourceEntity);
                            const max = getVarValue(sourceId!, String(maxVarName), isRuntimeSource, sourceEntity);

                            if (val !== undefined && max !== undefined) {
                                renderer.setBarValue(id, Number(val), Number(max));
                            }
                        }
                    }
                }

                // Selected Entity Sync
                const selectedId = selectedEntityIdRef.current;
                if (!selectedId) return;

                const runtimeEntity = gameRuntime.getEntity(selectedId);
                const editorEntity = core.getEntities().get(selectedId);
                if (!runtimeEntity || !editorEntity) return;

                const nextVars = runtimeEntity.variables.map((v) => ({ ...v }));
                const nextModules = runtimeEntity.modules ?? editorEntity.modules;
                const nextEntity = {
                    ...editorEntity,
                    x: runtimeEntity.x ?? editorEntity.x,
                    y: runtimeEntity.y ?? editorEntity.y,
                    z: runtimeEntity.z ?? editorEntity.z,
                    rotationX: runtimeEntity.rotationX ?? editorEntity.rotationX,
                    rotationY: runtimeEntity.rotationY ?? editorEntity.rotationY,
                    rotationZ: runtimeEntity.rotationZ ?? editorEntity.rotationZ,
                    rotation: typeof runtimeEntity.rotationZ === "number" ? runtimeEntity.rotationZ : editorEntity.rotation,
                    scaleX: runtimeEntity.scaleX ?? editorEntity.scaleX,
                    scaleY: runtimeEntity.scaleY ?? editorEntity.scaleY,
                    variables: nextVars,
                    modules: nextModules,
                };

                const sameVars = editorEntity.variables.length === nextVars.length &&
                    editorEntity.variables.every((v, idx) => {
                        const next = nextVars[idx];
                        return (
                            v.id === next.id &&
                            v.name === next.name &&
                            v.type === next.type &&
                            v.value === next.value
                        );
                    });
                const sameTransform =
                    editorEntity.x === nextEntity.x &&
                    editorEntity.y === nextEntity.y &&
                    editorEntity.z === nextEntity.z &&
                    editorEntity.rotationX === nextEntity.rotationX &&
                    editorEntity.rotationY === nextEntity.rotationY &&
                    editorEntity.rotationZ === nextEntity.rotationZ &&
                    editorEntity.scaleX === nextEntity.scaleX &&
                    editorEntity.scaleY === nextEntity.scaleY;
                const sameModules = JSON.stringify(editorEntity.modules ?? []) === JSON.stringify(nextEntity.modules ?? []);

                if (sameVars && sameTransform && sameModules) return;

                if (onRuntimeEntitySync) {
                    onRuntimeEntitySync(nextEntity as any);
                } else {
                    core.addEntity(nextEntity as any);
                }
            };
        })();

        return () => {
            active = false;
            gameRuntime.destroy && gameRuntime.destroy();
            renderer.onUpdateCallback = undefined;
            renderer.onInputState = undefined;
            renderer.destroy();
            rendererRef.current = null;
            gameCoreRef.current = null;
            setGameCore(null);
            if (initialModulesRef.current) {
                core.setModules(initialModulesRef.current);
                initialModulesRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const handleSceneChange = (event: GameEvent) => {
            if (event.type !== "SCENE_CHANGE_REQUEST") return;

            const sceneId = event.data?.sceneId as string | undefined;
            const sceneName = event.data?.sceneName as string | undefined;

            const scenes = core.getScenes();
            const target =
                (sceneId && scenes.get(sceneId)) ||
                (sceneName
                    ? Array.from(scenes.values()).find((scene) => scene.name === sceneName)
                    : undefined);

            if (!target) {
                console.warn("[RunTimeCanvas] Scene not found:", { sceneId, sceneName });
                return;
            }

            if (core.getCurrentSceneId() !== target.id) {
                core.switchScene(target.id);
            }

            const gameRuntime = gameCoreRef.current;
            if (!gameRuntime) return;
            gameRuntime.resetRuntime();
            spawnRuntimeEntities(gameRuntime, Array.from(target.entities.values()));
        };

        EventBus.on(handleSceneChange);
        return () => EventBus.off(handleSceneChange);
    }, [core]);

    useEffect(() => {
        const gameRuntime = gameCoreRef.current;
        if (!gameRuntime) return;
        gameRuntime.setModuleLibrary(modules, (updated) => core.updateModule(updated));
    }, [modules]);

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer || !tilemapReadyRef.current) return;

        const nextTiles = indexTiles(tiles);
        const prevTiles = prevTilesRef.current;

        for (const [key, prev] of prevTiles.entries()) {
            if (!nextTiles.has(key)) {
                renderer.removeTile(prev.x, prev.y);
            }
        }

        for (const t of nextTiles.values()) {
            renderer.setTile(t.x, t.y, t.tile);
        }

        prevTilesRef.current = nextTiles;
    }, [tiles]);

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer || !rendererReadyRef.current) return;

        const nextSignature = buildTileSignature(assets);
        const nextNonTileAssets = assets.filter((asset) => asset.tag !== "Tile");
        const assetLookup = new Map<string, Asset>();
        for (const asset of assets) {
            assetLookup.set(asset.name, asset);
            assetLookup.set(asset.id, asset);
        }
        let cancelled = false;

        (async () => {
            renderer.updateAssets?.(assets);

            for (const asset of nextNonTileAssets) {
                if (loadedTexturesRef.current.has(asset.name)) continue;
                await renderer.loadTexture(asset.name, asset.url, asset.metadata);
                if (cancelled) return;
                loadedTexturesRef.current.add(asset.name);
            }

            if (nextSignature !== tileSignatureRef.current) {
                const tilesetCanvas = await buildTilesetCanvas(assets);
                if (cancelled || !tilesetCanvas) return;
                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
                tilemapReadyRef.current = true;
                tileSignatureRef.current = nextSignature;
                applyAllTiles(renderer, tiles);
                prevTilesRef.current = indexTiles(tiles);
            }

            for (const ent of entities) {
                const textureKey = ent.texture ?? ent.name;
                if (!textureKey) continue;

                if (!loadedTexturesRef.current.has(textureKey)) {
                    const asset = assetLookup.get(textureKey);
                    if (asset) {
                        await renderer.loadTexture(textureKey, asset.url, asset.metadata);
                        if (cancelled) return;
                        loadedTexturesRef.current.add(textureKey);
                    }
                }
                renderer.refreshEntityTexture(ent.id, textureKey);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [assets, entities]);

    const colors = {
        bgPrimary: '#0d1117',
        bgSecondary: '#161b22',
        bgTertiary: '#21262d',
        borderColor: '#30363d',
        borderAccent: '#1f6feb',
        accentLight: '#58a6ff',
        textPrimary: '#f0f6fc',
        textSecondary: '#8b949e',
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '12px',
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '8px 12px',
                background: colors.bgSecondary,
                border: `2px solid ${colors.borderColor}`,
                borderRadius: '6px',
            }}>
                <span style={{
                    fontSize: '12px',
                    color: colors.textSecondary,
                    padding: '4px 8px',
                }}>
                    InGame Camera
                </span>
                <span style={{
                    fontSize: '12px',
                    color: colors.accentLight,
                    marginLeft: 'auto',
                    padding: '4px 8px',
                    background: colors.bgTertiary,
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                }}>
                    {fps} FPS
                </span>
            </div>

            <div style={{
                flex: 1,
                position: 'relative',
                background: colors.bgPrimary,
                border: `2px solid ${colors.borderColor}`,
                borderRadius: '6px',
                overflow: 'hidden',
            }}>
                <div ref={ref} style={{ width: '100%', height: '100%' }} />
                <GameUIOverlay gameCore={gameCore} showHud={false} />
            </div>
        </div>
    );
}
