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

import { parseResolution } from "./utils/resolutionUtils";
const TILE_SIZE = 100;
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
            img.onerror = (e: Event | string) => {
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



interface RunTimeCanvasProps {
    onRuntimeEntitySync?: (entity: EditorEntity) => void;
    onGameReady?: (core: any) => void;
    onLoaded?: () => void; // [New]
}

function spawnRuntimeEntities(gameRuntime: GameCore, entities: EditorEntity[]) {
    entities.forEach((entity) => {
        // [FIX] Deep copy entity data to isolate runtime state from editor
        // This prevents runtime variable changes from affecting editor state
        const clonedVariables = entity.variables ? JSON.parse(JSON.stringify(entity.variables)) : undefined;
        const clonedComponents = entity.components ? JSON.parse(JSON.stringify(entity.components)) : undefined;
        const clonedModules = entity.modules ? JSON.parse(JSON.stringify(entity.modules)) : undefined;
        const clonedLogic = entity.logic ? JSON.parse(JSON.stringify(entity.logic)) : undefined;
        const clonedTags = entity.tags ? [...entity.tags] : undefined;

        gameRuntime.createEntity(entity.id, entity.type, entity.x, entity.y, {
            name: entity.name,
            z: entity.z,
            rotationX: entity.rotationX,
            rotationY: entity.rotationY,
            rotationZ: entity.rotationZ,
            scaleX: entity.scaleX,
            scaleY: entity.scaleY,
            scaleZ: 1,
            variables: clonedVariables,
            components: clonedComponents,
            modules: clonedModules,
            role: entity.role,
            texture: entity.texture,
            logic: clonedLogic,
            tags: clonedTags,
        });
    });
}

export function RunTimeCanvas({ onRuntimeEntitySync, onGameReady, onLoaded }: RunTimeCanvasProps) {
    const ref = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<PhaserRenderer | null>(null);
    const gameCoreRef = useRef<GameCore | null>(null);
    const [gameCore, setGameCore] = useState<GameCore | null>(null);
    const [isRendererReady, setIsRendererReady] = useState(false);
    const prevTilesRef = useRef<Map<string, TilePlacement>>(new Map());
    const initialModulesRef = useRef<ModuleGraph[] | null>(null);
    const rendererReadyRef = useRef(false);
    const tilemapReadyRef = useRef(false);
    const tileSignatureRef = useRef<string>("");
    const { core, assets, tiles, entities, selectedEntity, modules, aspectRatio } = useEditorCoreSnapshot();
    const [fps, setFps] = useState(0);
    const frameCountRef = useRef(0);
    const lastFpsTimeRef = useRef(0);
    const initializationStartedRef = useRef(false);
    const cleanupDoneRef = useRef(false);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        // [GUARD] Prevent double initialization
        if (initializationStartedRef.current) {
            return;
        }

        initializationStartedRef.current = true;
        cleanupDoneRef.current = false;

        // [CRITICAL FIX] If a renderer already exists, clean it up first
        if (rendererRef.current) {
            rendererRef.current.destroy();
            rendererRef.current = null;
        }

        // [Lifecycle] Strict cleanup of any existing content
        while (ref.current.firstChild) {
            ref.current.removeChild(ref.current.firstChild);
        }

        const renderer = new PhaserRenderer(core);
        rendererRef.current = renderer;

        const gameRuntime = new GameCore(renderer);
        gameCoreRef.current = gameRuntime;
        setGameCore(gameRuntime);

        // Link references
        renderer.gameCore = gameRuntime;
        renderer.gameConfig = defaultGameConfig;
        gameRuntime.setGameConfig(defaultGameConfig);
        renderer.useEditorCoreRuntimePhysics = false;
        renderer.getRuntimeContext = () => gameRuntime.getRuntimeContext();
        renderer.onInputState = (input) => {
            gameRuntime.setInputState(input);
        };

        // Notify Parent
        if (onGameReady) {
            onGameReady(gameRuntime);
        }

        // Initialize Modules
        if (!initialModulesRef.current) {
            initialModulesRef.current = core.getModules().map((mod) => JSON.parse(JSON.stringify(mod)));
        }
        gameRuntime.setModuleLibrary(modules, (updated: any) => core.updateModule(updated));

        // [Lifecycle] Async Initialization with Abort Check
        let isMounted = true;

        (async () => {
            // 1. Small delay to ensure cleanup from previous cycle completes
            await new Promise(resolve => setTimeout(resolve, 50));
            if (!isMounted) {
                renderer.destroy();
                rendererRef.current = null;
                return;
            }

            // 2. Parse Dimensions
            const { width: gameWidth, height: gameHeight } = parseResolution(aspectRatio);

            // 3. Set assets for preload BEFORE init
            renderer.setPreloadAssets(assets);

            // 4. Init Renderer (Async) - preload() will run during this
            await renderer.init(ref.current as HTMLElement, { width: gameWidth, height: gameHeight });

            // [Lifecycle] Check after await
            if (!isMounted) {
                renderer.destroy();
                return;
            }

            // 5. Setup State - textures are now ready from preload()
            rendererReadyRef.current = true;
            setIsRendererReady(true);
            renderer.isRuntimeMode = true;
            renderer.setCameraPosition(gameWidth / 2, gameHeight / 2);

            // 5. Spawn Entities (Global + Scene)
            const globalEntities = Array.from(core.getGlobalEntities().values());
            const sceneEntities = Array.from(core.getEntities().values());
            const allEntities = [...globalEntities, ...sceneEntities];

            spawnRuntimeEntities(gameRuntime, allEntities);

            // [FIX] Initialize camera to Main Camera entity position on startup
            const runtimeContext = gameRuntime.getRuntimeContext();
            for (const entity of runtimeContext.entities.values()) {
                if (entity.name === "Main Camera") {
                    const cx = Number(entity.x) || 0;
                    const cy = Number(entity.y) || 0;
                    renderer.setCameraPosition(cx, cy);
                    break;
                }
            }

            // Notify Parent that loading is done
            if (onLoaded) {
                onLoaded();
            }

            // 6. Start Loop
            renderer.onUpdateCallback = (time, delta) => {
                if (!isMounted) return;
                gameRuntime.update(time, delta);

                // FPS Calc (every 500ms, not every frame)
                frameCountRef.current++;
                if (time > lastFpsTimeRef.current + 500) {
                    setFps(Math.round(frameCountRef.current * 1000 / (time - lastFpsTimeRef.current)));
                    frameCountRef.current = 0;
                    lastFpsTimeRef.current = time;
                }

                syncUIText(gameRuntime, core, setFps);
            };
        })();

        return () => {
            // [GUARD] Prevent double cleanup
            if (cleanupDoneRef.current) {
                return;
            }

            cleanupDoneRef.current = true;
            isMounted = false;

            if (gameRuntime && gameRuntime.destroy) {
                gameRuntime.destroy();
            }

            if (renderer) {
                renderer.onUpdateCallback = undefined;
                renderer.onInputState = undefined;
                renderer.onEntityClick = undefined;
                renderer.destroy();
            }

            rendererRef.current = null;
            gameCoreRef.current = null;
            setGameCore(null);

            if (initialModulesRef.current) {
                core.setModules(initialModulesRef.current);
                initialModulesRef.current = null;
            }

            // Reset initialization flag so component can re-init if remounted
            initializationStartedRef.current = false;
        };
    }, []); // Empty deps - only run on mount/unmount

    useEffect(() => {
        if (!isRendererReady) return;
        const gameRuntime = gameCoreRef.current;
        const renderer = rendererRef.current;
        if (!gameRuntime || !renderer) return;

        const runtimeContext = gameRuntime.getRuntimeContext();
        if (runtimeContext.entities.size > 0) return;

        const globalEntities = Array.from(core.getGlobalEntities().values());
        const sceneEntities = Array.from(core.getEntities().values());
        if (globalEntities.length === 0 && sceneEntities.length === 0) {
            return;
        }

        gameRuntime.resetRuntime();
        spawnRuntimeEntities(gameRuntime, [...globalEntities, ...sceneEntities]);

        // [FIX] Initialize camera to Main Camera entity position AND ZOOM on startup
        // 'runtimeContext' is already declared in the outer scope (line 351), so reuse it.
        // Also fetch refreshed context just in case (though reference should be same)
        const currentContext = gameRuntime.getRuntimeContext();
        for (const entity of currentContext.entities.values()) {
            if (entity.name === "Main Camera") {
                const cx = Number(entity.x) || 0;
                const cy = Number(entity.y) || 0;
                renderer.setCameraPosition(cx, cy);

                // Sync Initial Zoom
                let zoom = 1;

                // 1. Try Component Prop via Context (RuntimeEntity struct does NOT hold components directly)
                const comps = currentContext.getEntityComponents(entity.id);

                const camComp = comps?.find((c: any) => c.type === "Camera") as any;

                if (camComp) {
                    // Handle both potentially direct props (legacy) or data.props (new structure)
                    const props = camComp.props || camComp.data?.props;
                    if (props && props.zoom) {
                        zoom = Number(props.zoom);
                    }
                }
                // 2. Try Variable or Scale
                else {
                    const zoomVar = currentContext.getEntityVariable(entity.id, "zoom");
                    if (zoomVar !== undefined) {
                        zoom = Number(zoomVar);
                    } else {
                        // [FIX] Use Scale X as Zoom if no zoom variable is present
                        const scaleX = Number(entity.scaleX) || 1;
                        zoom = scaleX;
                    }
                }

                if (zoom > 0) renderer.setZoom(zoom);
                break;
            }
        }
    }, [core, entities, isRendererReady]);

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
            } else {

            }

            const gameRuntime = gameCoreRef.current;
            if (!gameRuntime) return;
            gameRuntime.resetRuntime();

            // Spawn global entities + target scene entities
            const globalEntities = Array.from(core.getGlobalEntities().values());
            const targetSceneEntities = Array.from(target.entities.values());
            const allEntities = [...globalEntities, ...targetSceneEntities];
            spawnRuntimeEntities(gameRuntime, allEntities);
        };

        EventBus.on(handleSceneChange);
        return () => EventBus.off(handleSceneChange);
    }, [core]);

    useEffect(() => {
        const gameRuntime = gameCoreRef.current;
        if (!gameRuntime) return;
        gameRuntime.setModuleLibrary(modules, (updated: any) => core.updateModule(updated));
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

    // [Optimization] Track previous asset/entity signatures to prevent redundant updates
    const assetsSignatureRef = useRef<string>("");
    const entitiesSignatureRef = useRef<string>("");

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer || !rendererReadyRef.current) return;

        // Create signatures to detect actual changes
        const nextAssetsSig = buildTileSignature(assets); // Reuse tile signature logic for assets
        const nextEntitiesSig = entities.map(e => `${e.id}:${e.texture}:${e.x}:${e.y}`).join("|"); // Simple entity signature

        // Skip if nothing changed
        if (nextAssetsSig === assetsSignatureRef.current && nextEntitiesSig === entitiesSignatureRef.current) {
            return;
        }

        let cancelled = false;

        (async () => {
            // Only update assets if assets changed
            if (nextAssetsSig !== assetsSignatureRef.current) {
                renderer.updateAssets?.(assets);

                // Tile handling
                const tilesetCanvas = await buildTilesetCanvas(assets);
                if (cancelled || !tilesetCanvas) return;

                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
                tilemapReadyRef.current = true;
                tileSignatureRef.current = nextAssetsSig;
                applyAllTiles(renderer, tiles);
                prevTilesRef.current = indexTiles(tiles);

                assetsSignatureRef.current = nextAssetsSig;
            }

            // Refresh entity textures (always check compatible textures)
            for (const ent of entities) {
                const textureKey = ent.texture ?? ent.name;
                if (!textureKey) continue;
                renderer.refreshEntityTexture(ent.id, textureKey);
            }
            entitiesSignatureRef.current = nextEntitiesSig;
        })();

        return () => {
            cancelled = true;
        };
    }, [assets, entities, tiles]); // Added tiles to dep array as it is used in tilemap rebuild


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
                    InGame Camera ({aspectRatio})
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
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div ref={ref} style={{ width: '100%', height: '100%' }} />
                <GameUIOverlay gameCore={gameCore} showHud={false} />
            </div>
        </div>
    );
}
// Helper for UI Sync (Extracted to avoid clutter in useEffect)
function syncUIText(gameRuntime: GameCore, core: any, setFps: any) {
    const runtimeContext = gameRuntime.getRuntimeContext();
    const renderer = gameRuntime.getRenderer() as PhaserRenderer; // Cast to access internal methods

    const getVarValue = (entId: string, varName: string, isRuntime: boolean, entObj?: any) => {
        if (isRuntime) {
            return runtimeContext.getEntityVariable(entId, varName);
        } else {
            return entObj?.variables?.find((v: any) => v.name === varName)?.value;
        }
    };

    for (const [id, entity] of runtimeContext.entities) {
        const isUI = runtimeContext.getEntityVariable(id, "isUI");
        if (isUI !== true) continue;

        const uiSourceEntityId = runtimeContext.getEntityVariable(id, "uiSourceEntity");
        let sourceId = uiSourceEntityId ? String(uiSourceEntityId) : null;
        let isRuntimeSource = false;
        let sourceEntity: any = null;

        if (sourceId && runtimeContext.entities.has(sourceId)) {
            sourceEntity = runtimeContext.entities.get(sourceId);
            isRuntimeSource = true;
        } else if (sourceId) {
            sourceEntity = core.getGlobalEntities().get(sourceId);
            isRuntimeSource = false;
        }

        if (!sourceEntity) continue;

        const uiType = runtimeContext.getEntityVariable(id, "uiType");
        const uiValueLink = runtimeContext.getEntityVariable(id, "uiValueVar");
        const uiText = runtimeContext.getEntityVariable(id, "uiText");

        if (uiValueLink) {
            const val = getVarValue(sourceId!, String(uiValueLink), isRuntimeSource, sourceEntity);
            if (val !== undefined) {
                if (uiType === "text") {
                    renderer.updateText(id, String(val));
                } else if (uiType === "bar") {
                    const maxVar = runtimeContext.getEntityVariable(id, "uiMaxVar") || "maxHp";
                    const maxVal = getVarValue(sourceId!, String(maxVar), isRuntimeSource, sourceEntity);
                    if (typeof maxVal === 'number' && typeof val === 'number' && maxVal > 0) {
                        const ratio = val / maxVal;
                        renderer.updateBar(id, ratio);
                    }
                }
            }
        } else if (uiText) {
            if (uiType === "text") {
                renderer.updateText(id, String(uiText));
            }
        }
    }
}
