import { useEffect, useRef, useState } from "react";
import { useEditorCoreSnapshot, useEditorCore } from "../contexts/EditorCoreContext";
import { GameCore } from "./core/GameCore";
import { GameUIOverlay } from "./ui/GameUIOverlay";
import { PhaserRenderer } from "./renderer/PhaserRenderer";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";
import type { TilePlacement } from "./EditorCore";
import { buildLogicItems, splitLogicItems } from "./types/Logic";
import { createDefaultModuleGraph } from "./types/Module";
import { assetToEntity } from "./utils/assetToEntity";

const TILE_SIZE = 32;
const TILESET_COLS = 16;

type Props = {
    assets: Asset[];
    selected_asset: Asset | null;
    addEntity: (entity: EditorEntity) => void;
    draggedAsset: Asset | null;
    onExternalImageDrop?: (files: FileList) => void;
    onSelectEntity?: (entity: EditorEntity) => void;
};

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
                // Resolve anyway to prevent crashing the whole tileset generation
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

export function EditorCanvas({ assets, selected_asset, addEntity, draggedAsset, onExternalImageDrop }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const core = useEditorCore();
    const { tiles, entities, modules, aspectRatio, currentSceneId } = useEditorCoreSnapshot();
    const rendererRef = useRef<PhaserRenderer | null>(null);
    const gameCoreRef = useRef<GameCore | null>(null);
    const prevTilesRef = useRef<Map<string, TilePlacement>>(new Map());
    const prevEntitiesMapRef = useRef<Map<string, EditorEntity>>(new Map());
    const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
    const isPointerDownRef = useRef(false);
    const cameraDragRef = useRef(false);
    const dragEntityIdRef = useRef<string | null>(null);
    const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const ghostIdRef = useRef<string | null>(null);
    // Use state instead of ref to trigger re-renders when ready
    const [isRendererReady, setIsRendererReady] = useState(false);
    const tilemapReadyRef = useRef(false);
    const loadedTexturesRef = useRef<Set<string>>(new Set());
    const tileSignatureRef = useRef<string>("");
    const selectedAssetRef = useRef<Asset | null>(selected_asset);
    const draggedAssetRef = useRef<Asset | null>(draggedAsset);
    const tilingTypeRef = useRef<"" | "drawing" | "erase">("");
    const addEntityRef = useRef(addEntity);

    const [gameCore, setGameCore] = useState<GameCore | null>(null);
    const [tilingType, setTilingType] = useState<"" | "drawing" | "erase">("");

    useEffect(() => {
        selectedAssetRef.current = selected_asset;
    }, [selected_asset]);

    useEffect(() => {
        draggedAssetRef.current = draggedAsset;
    }, [draggedAsset]);

    useEffect(() => {
        tilingTypeRef.current = tilingType;
    }, [tilingType]);

    useEffect(() => {
        addEntityRef.current = addEntity;
    }, [addEntity]);

    // Refs to avoid stale closures in initialization
    const assetsRef = useRef(assets);
    const tilesRef = useRef(tiles);
    const entitiesRef = useRef(entities);

    useEffect(() => {
        assetsRef.current = assets;
    }, [assets]);

    useEffect(() => {
        tilesRef.current = tiles;
    }, [tiles]);

    useEffect(() => {
        entitiesRef.current = entities;
    }, [entities]);

    useEffect(() => {
        const renderer = rendererRef.current;
        const gameCore = gameCoreRef.current;
        if (!renderer || !gameCore || !isRendererReady) return;

        const currentTiles = tilesRef.current;
        const currentEntities = entitiesRef.current;

        const existingIds = Array.from(gameCore.getAllEntities().keys());
        for (const id of existingIds) {
            gameCore.removeEntity(id);
        }

        for (const prev of prevTilesRef.current.values()) {
            renderer.removeTile(prev.x, prev.y);
        }
        prevTilesRef.current = new Map();

        for (const t of currentTiles) {
            renderer.setTile(t.x, t.y, t.tile);
        }
        prevTilesRef.current = indexTiles(currentTiles);

        for (const ent of currentEntities) {
            gameCore.createEntity(ent.id, ent.type, ent.x, ent.y, {
                name: ent.name,
                texture: ent.texture ?? ent.name,
                variables: ent.variables,
                components: splitLogicItems(ent.logic),
                modules: ent.modules,
            });
        }

        prevEntitiesMapRef.current = new Map(currentEntities.map((e) => [e.id, e]));
    }, [currentSceneId, isRendererReady]);

    useEffect(() => {
        if (!ref.current) return;
        if (rendererRef.current) return;

        // Clear any leftover canvas from previous Phaser game
        while (ref.current.firstChild) {
            ref.current.removeChild(ref.current.firstChild);
        }

        const renderer = new PhaserRenderer(core);
        rendererRef.current = renderer;
        const gameCore = new GameCore(renderer);
        gameCoreRef.current = gameCore;
        setGameCore(gameCore);

        // NOTE: Game loop is NOT enabled in Editor mode.
        // Logic only runs in RunTimeCanvas (Build & Run).

        let active = true;

        (async () => {
            // Small delay to ensure previous game is fully destroyed
            await new Promise(resolve => setTimeout(resolve, 50));
            if (!active) return;

            await renderer.init(ref.current as HTMLElement);
            if (!active) return;

            // Use refs to get current values (not stale closure)
            const currentAssets = assetsRef.current;
            const currentTiles = tilesRef.current;
            const currentEntities = entitiesRef.current;

            for (const asset of currentAssets) {
                if (asset.tag === "Tile") continue;
                await renderer.loadTexture(asset.name, asset.url, asset.metadata);
            }

            const tilesetCanvas = await buildTilesetCanvas(currentAssets);
            if (tilesetCanvas) {
                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
            }

            for (const t of currentTiles) {
                renderer.setTile(t.x, t.y, t.tile);
            }

            for (const e of currentEntities) {
                gameCore.createEntity(e.id, e.type, e.x, e.y, {
                    name: e.name,
                    texture: e.texture ?? e.name,
                    variables: e.variables,
                    components: splitLogicItems(e.logic),
                    modules: e.modules,
                });
            }

            setIsRendererReady(true);
        })();

        renderer.onEntityClick = (id, worldX, worldY) => {
            const ent = core.getEntities().get(id);
            if (ent) {
                core.setSelectedEntity(ent);
                dragOffsetRef.current = { x: worldX - ent.x, y: worldY - ent.y };
            } else {
                dragOffsetRef.current = { x: 0, y: 0 };
            }
            dragEntityIdRef.current = id;
        };

        renderer.onPointerDown = (worldX, worldY) => {
            isPointerDownRef.current = true;
            lastPointerRef.current = { x: worldX, y: worldY };

            const selectedAsset = selectedAssetRef.current;
            const activeTilingType = tilingTypeRef.current;
            const activeDragged = draggedAssetRef.current;
            if (selectedAsset?.tag === "Tile" && selectedAsset.idx >= 0 && activeTilingType) {
                const tx = Math.floor(worldX / TILE_SIZE);
                const ty = Math.floor(worldY / TILE_SIZE);
                if (activeTilingType === "drawing") {
                    renderer.setTile(tx, ty, selectedAsset.idx);
                    core.setTile(tx, ty, selectedAsset.idx);
                } else if (activeTilingType === "erase") {
                    renderer.removeTile(tx, ty);
                    core.removeTile(tx, ty);
                }
                return;
            }

            if (activeDragged && activeDragged.tag !== "Tile") {
                return;
            }

            if (dragEntityIdRef.current) {
                return;
            }

            cameraDragRef.current = true;
        };

        renderer.onPointerMove = (worldX, worldY) => {
            const prev = lastPointerRef.current;
            lastPointerRef.current = { x: worldX, y: worldY };

            const selectedAsset = selectedAssetRef.current;
            const activeTilingType = tilingTypeRef.current;
            const activeDragged = draggedAssetRef.current;
            if (activeDragged && activeDragged.tag !== "Tile") {
                if (!ghostIdRef.current) {
                    const ghostId = `__ghost__${crypto.randomUUID()}`;
                    ghostIdRef.current = ghostId;
                    renderer.spawn(ghostId, activeDragged.tag, worldX, worldY, 9999, {
                        texture: activeDragged.name,
                        width: 40,
                        height: 40,
                        color: 0xffffff,
                    });
                } else {
                    renderer.update(ghostIdRef.current, worldX, worldY, 9999);
                }
                return;
            }

            if (selectedAsset?.tag === "Tile" && selectedAsset.idx >= 0) {
                const tx = Math.floor(worldX / TILE_SIZE);
                const ty = Math.floor(worldY / TILE_SIZE);
                if (activeTilingType === "drawing") {
                    if (isPointerDownRef.current) {
                        renderer.setTile(tx, ty, selectedAsset.idx);
                        core.setTile(tx, ty, selectedAsset.idx);
                    } else {
                        renderer.setPreviewTile(tx, ty, selectedAsset.idx);
                    }
                } else if (activeTilingType === "erase" && isPointerDownRef.current) {
                    renderer.removeTile(tx, ty);
                    core.removeTile(tx, ty);
                } else {
                    renderer.clearPreviewTile();
                }
                return;
            }

            if (dragEntityIdRef.current && isPointerDownRef.current) {
                const id = dragEntityIdRef.current;
                const offset = dragOffsetRef.current;
                const nextX = worldX - offset.x;
                const nextY = worldY - offset.y;
                core.updateEntityPosition(id, nextX, nextY);
                gameCore.moveEntity(id, nextX, nextY);
                return;
            }

            if (cameraDragRef.current && prev) {
                const dx = (worldX - prev.x) / 2;
                const dy = (worldY - prev.y) / 2;
                const cam = renderer.getCameraPosition();
                renderer.setCameraPosition(cam.x - dx, cam.y - dy);
            }
        };

        renderer.onPointerUp = (worldX, worldY) => {
            const activeDragged = draggedAssetRef.current;
            if (activeDragged && activeDragged.tag !== "Tile") {
                if (ghostIdRef.current) {
                    renderer.remove(ghostIdRef.current);
                    ghostIdRef.current = null;
                }

                const entity = assetToEntity(activeDragged, worldX, worldY);
                addEntityRef.current(entity);
                gameCore.createEntity(entity.id, entity.type, entity.x, entity.y, {
                    name: entity.name,
                    texture: entity.texture ?? entity.name,
                    variables: entity.variables,
                    components: splitLogicItems(entity.logic),
                    modules: entity.modules,
                });
            }

            renderer.clearPreviewTile();
            isPointerDownRef.current = false;
            cameraDragRef.current = false;
            dragEntityIdRef.current = null;
            dragOffsetRef.current = { x: 0, y: 0 };
        };

        renderer.onScroll = (deltaY, screenX, screenY) => {
            // Slower zoom speed
            const dy = Math.exp(deltaY * -(1 / 2000));
            const prevZoom = renderer.getCameraZoom();
            const nextZoom = Math.min(Math.max(prevZoom * dy, 0.1), 20);

            // Simple Center Zoom for smoothness
            renderer.setCameraZoom(nextZoom);
        };

        return () => {
            active = false;
            gameCoreRef.current?.destroy();
            renderer.destroy();
            rendererRef.current = null;
            gameCoreRef.current = null;
        };
    }, []);

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer || !isRendererReady) return;

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
    }, [tiles, isRendererReady]);

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer || !isRendererReady) return;

        const nextSignature = buildTileSignature(assets);
        const nextNonTileAssets = assets.filter((asset) => asset.tag !== "Tile");
        const assetLookup = new Map<string, Asset>();
        for (const asset of assets) {
            assetLookup.set(asset.name, asset);
            assetLookup.set(asset.id, asset);
        }

        let cancelled = false;

        (async () => {
            for (const asset of nextNonTileAssets) {
                // Allow renderer to decide if reload is needed (e.g. metadata change)
                await renderer.loadTexture(asset.name, asset.url, asset.metadata);
                if (cancelled) return;
            }

            if (nextSignature !== tileSignatureRef.current) {
                const tilesetCanvas = await buildTilesetCanvas(assets);
                if (cancelled || !tilesetCanvas) return;
                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
                tilemapReadyRef.current = true;
                tileSignatureRef.current = nextSignature;

                // Re-apply all tiles after tileset logic rebuild
                applyAllTiles(renderer, tiles);
                prevTilesRef.current = indexTiles(tiles);
            }

            for (const ent of entities) {
                const textureKey = ent.texture ?? ent.name;
                if (!textureKey) continue;

                const asset = assetLookup.get(textureKey);
                if (asset) {
                    // Always try to load/update texture logic
                    await renderer.loadTexture(textureKey, asset.url, asset.metadata);
                    if (cancelled) return;
                }
                renderer.refreshEntityTexture(ent.id, textureKey);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [assets, entities, isRendererReady]);

    useEffect(() => {
        const gameCore = gameCoreRef.current;
        if (!gameCore || !isRendererReady) return;

        const nextIds = new Set(entities.map((e) => e.id));
        const current = gameCore.getAllEntities();

        // Convert keys to array to avoid modification during iteration issues
        const currentIds = Array.from(current.keys());

        for (const id of currentIds) {
            if (!nextIds.has(id)) {
                gameCore.removeEntity(id);
            }
        }

        for (const ent of entities) {
            const prevEnt = prevEntitiesMapRef.current.get(ent.id);
            const isUI = ent.variables.some((v: any) => v.name === "isUI" && v.value === true);
            const uiText = ent.variables.find((v: any) => v.name === "uiText")?.value;
            const uiColor = ent.variables.find((v: any) => v.name === "uiColor")?.value;
            const uiFontSize = ent.variables.find((v: any) => v.name === "uiFontSize")?.value;

            const prevIsUI = prevEnt?.variables.some((v: any) => v.name === "isUI" && v.value === true);
            const prevUiText = prevEnt?.variables.find((v: any) => v.name === "uiText")?.value;
            const prevUiColor = prevEnt?.variables.find((v: any) => v.name === "uiColor")?.value;
            const prevUiFontSize = prevEnt?.variables.find((v: any) => v.name === "uiFontSize")?.value;

            const needsRespawn = prevEnt && (
                isUI !== prevIsUI ||
                uiText !== prevUiText ||
                uiColor !== prevUiColor ||
                uiFontSize !== prevUiFontSize
            );

            if (gameCore.hasEntity(ent.id) && needsRespawn) {
                gameCore.removeEntity(ent.id);
            }

            if (!gameCore.hasEntity(ent.id)) {
                gameCore.createEntity(ent.id, ent.type, ent.x, ent.y, {
                    name: ent.name,
                    texture: ent.texture ?? ent.name,
                    variables: ent.variables,
                    components: splitLogicItems(ent.logic),
                    modules: ent.modules,
                });
            } else {
                gameCore.setEntityTransform(ent.id, {
                    x: ent.x,
                    y: ent.y,
                    z: ent.z ?? 0,
                    rotationX: ent.rotationX ?? 0,
                    rotationY: ent.rotationY ?? 0,
                    rotationZ: ent.rotationZ ?? ent.rotation ?? 0,
                    scaleX: ent.scaleX ?? 1,
                    scaleY: ent.scaleY ?? 1,
                });
                gameCore.updateEntityLogic(ent.id, splitLogicItems(ent.logic), ent.variables);
                if (ent.modules) {
                    gameCore.updateEntityModules(ent.id, ent.modules);
                }
            }
        }

        // Update previous entities map for next render
        prevEntitiesMapRef.current = new Map(entities.map(e => [e.id, e]));
    }, [entities, isRendererReady]);

    useEffect(() => {
        const gameCore = gameCoreRef.current;
        if (!gameCore || !isRendererReady) return;
        gameCore.setModuleLibrary(modules, (updated) => core.updateModule(updated));
    }, [modules, isRendererReady]);

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer || !isRendererReady) return;

        let w = 0;
        let h = 0;
        switch (aspectRatio) {
            case "1280x720": w = 1280; h = 720; break;
            case "1920x1080": w = 1920; h = 1080; break;
            case "1024x768": w = 1024; h = 768; break;
            case "720x1280": w = 720; h = 1280; break;
            case "1080x1920": w = 1080; h = 1920; break;
            default: w = 0; h = 0; break;
        }
        renderer.setGuideFrame(w, h);
    }, [aspectRatio, isRendererReady]);

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
                    Camera
                </span>

                <select
                    value={aspectRatio}
                    onChange={(e) => core.setAspectRatio(e.target.value)}
                    style={{
                        background: colors.bgTertiary,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.borderColor}`,
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '11px',
                        marginLeft: '8px',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="Free">Free Aspect</option>
                    <option value="1280x720">1280x720 (16:9)</option>
                    <option value="1920x1080">1920x1080 (16:9)</option>
                    <option value="1024x768">1024x768 (4:3)</option>
                    <option value="720x1280">720x1280 (9:16)</option>
                    <option value="1080x1920">1080x1920 (9:16)</option>
                </select>

                {selected_asset?.tag === "Tile" && (
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        marginLeft: '8px',
                        paddingLeft: '8px',
                        borderLeft: `1px solid ${colors.borderColor}`,
                    }}>
                        <button
                            onClick={() => setTilingType((prev) => (prev === "drawing" ? "" : "drawing"))}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: tilingType === "drawing" ? colors.borderAccent : colors.bgTertiary,
                                border: `1px solid ${colors.borderColor}`,
                                borderRadius: '4px',
                                color: colors.textPrimary,
                                cursor: 'pointer',
                            }}
                        >
                            그리기
                        </button>
                        <button
                            onClick={() => setTilingType((prev) => (prev === "erase" ? "" : "erase"))}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: tilingType === "erase" ? '#da3633' : colors.bgTertiary,
                                border: `1px solid ${colors.borderColor}`,
                                borderRadius: '4px',
                                color: colors.textPrimary,
                                cursor: 'pointer',
                            }}
                        >
                            지우기
                        </button>
                    </div>
                )}
            </div>

            {/* Phaser Canvas Container */}
            <div
                style={{
                    flex: 1,
                    position: 'relative',
                    background: colors.bgPrimary,
                    border: `2px solid ${colors.borderColor}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer?.files;
                    if (!files || files.length === 0) return;

                    // Simple check: at least one valid image
                    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
                    let hasImage = false;
                    for (let i = 0; i < files.length; i++) {
                        if (allowedTypes.has(files[i].type)) {
                            hasImage = true;
                            break;
                        }
                    }

                    if (!hasImage) return;
                    onExternalImageDrop?.(files);
                }}
                onMouseLeave={() => {
                    rendererRef.current?.clearPreviewTile();
                }}
            >
                <div ref={ref} style={{ width: '100%', height: '100%' }} />
                <GameUIOverlay gameCore={gameCore} showHud={false} />
            </div>
        </div >
    );
}
