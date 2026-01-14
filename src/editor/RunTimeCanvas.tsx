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

const TILE_SIZE = 32;
const TILESET_COLS = 16;



async function buildTilesetCanvas(assets: Asset[]): Promise<HTMLCanvasElement | null> {
    // ????먯뀑???섎굹??罹붾쾭?ㅻ줈 ?⑹퀜 ??쇱뀑 ?띿뒪泥섎? 留뚮뱺??
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
    // ???諛곗뿴??醫뚰몴 ??留듭쑝濡?蹂?섑빐 diff 怨꾩궛???ъ슜?쒕떎.
    const map = new Map<string, TilePlacement>();
    for (const t of tiles) {
        map.set(`${t.x},${t.y}`, t);
    }
    return map;
}

type RunTimeCanvasProps = {
    onRuntimeEntitySync?: (entity: EditorEntity) => void;
};

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

    const spawnRuntimeEntities = (gameRuntime: GameCore, sourceEntities: EditorEntity[]) => {
        for (const e of sourceEntities) {
            gameRuntime.createEntity(e.id, e.type, e.x, e.y, {
                name: e.name,
                z: e.z,
                rotationX: e.rotationX,
                rotationY: e.rotationY,
                rotationZ: e.rotationZ ?? e.rotation,
                scaleX: e.scaleX,
                scaleY: e.scaleY,
                texture: e.texture ?? e.name,
                variables: e.variables,
                components: e.components,
                logic: e.logic,  // Pass logic array for RuntimeContext registration
                role: e.role,
                modules: e.modules,
            });
        }
    };

    useEffect(() => {
        selectedEntityIdRef.current = selectedEntity?.id ?? null;
    }, [selectedEntity]);

    useEffect(() => {
        // ?고????뚮뜑??寃뚯엫肄붿뼱 珥덇린??(理쒖큹 1??
        if (!ref.current) return;
        if (rendererRef.current) return;

        const renderer = new PhaserRenderer(core);
        rendererRef.current = renderer;
        const gameRuntime = new GameCore(renderer);
        gameCoreRef.current = gameRuntime;
        setGameCore(gameRuntime); // State update triggers UI render
        renderer.gameCore = gameRuntime; // Enable role-based targeting in actions
        renderer.gameConfig = defaultGameConfig; // ??븷 湲곕컲 ?ㅼ젙 ?곌껐
        gameRuntime.setGameConfig(defaultGameConfig); // GameCore?먮룄 ?ㅼ젙 ?곌껐
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
            // ?뚮뜑??珥덇린?????띿뒪泥???쇱뀑/珥덇린 ?곹깭瑜?濡쒕뱶?쒕떎.
            await renderer.init(ref.current as HTMLElement);
            if (!active) return;
            rendererReadyRef.current = true;

            // Enable runtime mode for Rules and TICK events
            renderer.isRuntimeMode = true;

            for (const asset of assets) {
                // ??쇱? ??쇱뀑 罹붾쾭?ㅻ줈 泥섎━?섎?濡?鍮꾪??쇰쭔 濡쒕뱶?쒕떎.
                if (asset.tag === "Tile") continue;
                console.log(`[RunTimeCanvas] Loading asset: ${asset.name}`, asset.metadata);
                await renderer.loadTexture(asset.name, asset.url, asset.metadata);
            }

            const tilesetCanvas = await buildTilesetCanvas(assets);
            if (tilesetCanvas) {
                // ??쇱뀑 ?띿뒪泥??깅줉 ????쇰㏊ ?앹꽦
                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
            }

            for (const t of tiles) {
                // ??λ맂 ???諛곗튂 蹂듭썝
                renderer.setTile(t.x, t.y, t.tile);
            }

            // 理쒖떊 ?몄쭛 ?곗씠?곕줈 ?뷀떚???앹꽦 (Inspector 蹂寃?諛섏쁺)
            const freshEntities = Array.from(core.getEntities().values());

            spawnRuntimeEntities(gameRuntime, freshEntities);

            if (renderer.isRuntimeMode) {
                console.log(`[RunTimeCanvas] Initialized with ${entities.length} entities`);
            }

            // 렌더링 루프 콜백 설정
            renderer.onUpdateCallback = (time, delta) => {
                gameRuntime.update(time, delta);

                // [UI Text Sync] Runtime variable -> Phaser Text
                // 모든 엔티티를 순회하며 uiText 변수가 있다면 화면에 반영
                const allEntities = gameRuntime.getAllEntities();
                if (allEntities) {
                    for (const entity of allEntities.values()) {
                        // Check if this is a UI element with bar type
                        const uiTypeVar = entity.variables?.find((v: any) => v.name === "uiType");
                        const isUI = entity.variables?.find((v: any) => v.name === "isUI")?.value;

                        if (!isUI) continue; // Skip non-UI entities

                        // Get source entity for cross-entity linking
                        const uiSourceEntityId = entity.variables?.find((v: any) => v.name === "uiSourceEntity")?.value;

                        // Look up source entity from runtime entities
                        let sourceEntity = uiSourceEntityId
                            ? allEntities.get(String(uiSourceEntityId))
                            : null;

                        // Fallback to global entities if not found in runtime
                        if (!sourceEntity && uiSourceEntityId) {
                            sourceEntity = core.getGlobalEntities().get(String(uiSourceEntityId)) as any;
                        }

                        if (!sourceEntity) continue;

                        const uiTextVar = entity.variables?.find((v: any) => v.name === "uiText");
                        const uiValueLink = entity.variables?.find((v: any) => v.name === "uiValueVar")?.value;

                        // Priority: Linked Variable (from source entity) > Static Text
                        if (uiValueLink) {
                            const linkedVar = sourceEntity.variables?.find((v: any) => v.name === String(uiValueLink));
                            if (linkedVar && linkedVar.value !== undefined) {
                                renderer.setText(entity.id, String(linkedVar.value));
                            }
                        } else if (uiTextVar) {
                            renderer.setText(entity.id, String(uiTextVar.value));
                        }

                        // [UI Bar Sync]
                        if (uiTypeVar && uiTypeVar.value === "bar") {
                            const valVarName = entity.variables.find((v: any) => v.name === "uiValueVar")?.value;
                            const maxVarName = entity.variables.find((v: any) => v.name === "uiMaxVar")?.value;

                            if (valVarName && maxVarName) {
                                // Look up from SOURCE entity, not UI entity
                                const valVar = sourceEntity.variables?.find((v: any) => v.name === String(valVarName));
                                const maxVar = sourceEntity.variables?.find((v: any) => v.name === String(maxVarName));

                                if (valVar && maxVar) {
                                    renderer.setBarValue(entity.id, Number(valVar.value), Number(maxVar.value));
                                }
                            }
                        }
                    }
                }

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
                    rotation:
                        typeof runtimeEntity.rotationZ === "number"
                            ? runtimeEntity.rotationZ
                            : editorEntity.rotation,
                    scaleX: runtimeEntity.scaleX ?? editorEntity.scaleX,
                    scaleY: runtimeEntity.scaleY ?? editorEntity.scaleY,

                    variables: nextVars,
                    modules: nextModules,
                };
                const sameVars =
                    editorEntity.variables.length === nextVars.length &&
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
                const sameModules =
                    JSON.stringify(editorEntity.modules ?? []) ===
                    JSON.stringify(nextEntity.modules ?? []);
                if (sameVars && sameTransform && sameModules) return;

                if (onRuntimeEntitySync) {
                    onRuntimeEntitySync(nextEntity as any);
                } else {
                    core.addEntity(nextEntity as any);
                }
            };
        })();

        return () => {
            // 애니메이션 및 정리
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
        // ???蹂寃쎌궗??쭔 諛섏쁺 (異붽?/??젣 diff)
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
            // 커스텀 파티클 등 기타 에셋 업데이트
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

    // Entry Style Colors
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
            {/* Toolbar */}
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
            </div>

            {/* Phaser Canvas Container + UI Overlay */}
            <div style={{
                flex: 1,
                position: 'relative', // Relative for overlay
                background: colors.bgPrimary,
                border: `2px solid ${colors.borderColor}`,
                borderRadius: '6px',
                overflow: 'hidden',
            }}>
                {/* Phaser Container */}
                <div ref={ref} style={{ width: '100%', height: '100%' }} />

                {/* Game UI Overlay */}
                <GameUIOverlay gameCore={gameCore} showHud={false} />
            </div>
        </div>
    );
}





