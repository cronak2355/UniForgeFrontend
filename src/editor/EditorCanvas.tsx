import { useEffect, useRef, useState } from "react";
import { useEditorCoreSnapshot, useEditorCore } from "../contexts/EditorCoreContext";
import { GameCore } from "./core/GameCore";
import { PhaserRenderer } from "./renderer/PhaserRenderer";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";
import type { TilePlacement } from "./EditorCore";

const TILE_SIZE = 32;
const TILESET_COLS = 16;

type Props = {
    assets: Asset[];
    selected_asset: Asset | null;
    addEntity: (entity: EditorEntity) => void;
    draggedAsset: Asset | null;
    onExternalImageDrop?: (file: File) => void;
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
        img.src = asset.url;
        await img.decode();

        const x = (idx % TILESET_COLS) * TILE_SIZE;
        const y = Math.floor(idx / TILESET_COLS) * TILE_SIZE;
        ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);

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
    const { tiles, entities } = useEditorCoreSnapshot();
    const rendererRef = useRef<PhaserRenderer | null>(null);
    const gameCoreRef = useRef<GameCore | null>(null);
    const prevTilesRef = useRef<Map<string, TilePlacement>>(new Map());
    const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
    const isPointerDownRef = useRef(false);
    const cameraDragRef = useRef(false);
    const dragEntityIdRef = useRef<string | null>(null);
    const ghostIdRef = useRef<string | null>(null);
    const rendererReadyRef = useRef(false);
    const tilemapReadyRef = useRef(false);
    const loadedTexturesRef = useRef<Set<string>>(new Set());
    const tileSignatureRef = useRef<string>("");
    const selectedAssetRef = useRef<Asset | null>(selected_asset);
    const draggedAssetRef = useRef<Asset | null>(draggedAsset);
    const tilingTypeRef = useRef<"" | "drawing" | "erase">("");
    const addEntityRef = useRef(addEntity);

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

    useEffect(() => {
        if (!ref.current) return;
        if (rendererRef.current) return;

        const renderer = new PhaserRenderer();
        rendererRef.current = renderer;
        const gameCore = new GameCore(renderer);
        gameCoreRef.current = gameCore;

        let active = true;

        (async () => {
            await renderer.init(ref.current as HTMLElement);
            if (!active) return;

            for (const asset of assets) {
                if (asset.tag === "Tile") continue;
                await renderer.loadTexture(asset.name, asset.url);
                loadedTexturesRef.current.add(asset.name);
            }

            const tilesetCanvas = await buildTilesetCanvas(assets);
            if (tilesetCanvas) {
                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
                tilemapReadyRef.current = true;
                tileSignatureRef.current = buildTileSignature(assets);
            }

            for (const t of tiles) {
                renderer.setTile(t.x, t.y, t.tile);
            }

            for (const e of entities) {
                gameCore.createEntity(e.id, e.type, e.x, e.y, {
                    name: e.name,
                    texture: e.name,
                    variables: e.variables,
                    components: [],
                });
            }

            rendererReadyRef.current = true;
        })();

        renderer.onEntityClick = (id) => {
            const ent = core.getEntities().get(id);
            if (ent) {
                core.setSelectedEntity(ent);
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
                if (!activeTilingType) {
                    renderer.setPreviewTile(tx, ty, selectedAsset.idx);
                } else if (isPointerDownRef.current) {
                    if (activeTilingType === "drawing") {
                        renderer.setTile(tx, ty, selectedAsset.idx);
                        core.setTile(tx, ty, selectedAsset.idx);
                    } else if (activeTilingType === "erase") {
                        renderer.removeTile(tx, ty);
                        core.removeTile(tx, ty);
                    }
                }
                return;
            }

            if (dragEntityIdRef.current && isPointerDownRef.current) {
                const id = dragEntityIdRef.current;
                const ent = core.getEntities().get(id);
                if (ent) {
                    const updated: EditorEntity = { ...ent, x: worldX, y: worldY };
                    core.addEntity(updated as EditorEntity & { id: string });
                }
                gameCore.moveEntity(id, worldX, worldY);
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

                const id = crypto.randomUUID();
                const created: EditorEntity = {
                    id,
                    type: activeDragged.tag as "sprite" | "container" | "nineSlice",
                    name: activeDragged.name,
                    x: worldX,
                    y: worldY,
                    z: 0,
                    components: [],
                    modules: [],
                    variables: [],
                    events: [],
                    rules: [],
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                };
                addEntityRef.current(created);
                gameCore.createEntity(created.id, created.type, created.x, created.y, {
                    name: created.name,
                    texture: created.name,
                    variables: created.variables,
                    components: [],
                });
            }

            renderer.clearPreviewTile();
            isPointerDownRef.current = false;
            cameraDragRef.current = false;
            dragEntityIdRef.current = null;
        };

        renderer.onScroll = (deltaY) => {
            const dy = Math.exp(deltaY * -(1 / 1000));
            const zoom = Math.min(Math.max(renderer.getCameraZoom() * dy, 0.1), 10);
            renderer.setCameraZoom(zoom);
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
        if (!renderer || !rendererReadyRef.current) return;

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

        let cancelled = false;

        (async () => {
            for (const asset of nextNonTileAssets) {
                if (loadedTexturesRef.current.has(asset.name)) continue;
                await renderer.loadTexture(asset.name, asset.url);
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
        })();

        return () => {
            cancelled = true;
        };
    }, [assets]);

    useEffect(() => {
        const gameCore = gameCoreRef.current;
        if (!gameCore || !rendererReadyRef.current) return;

        const nextIds = new Set(entities.map((e) => e.id));
        const current = gameCore.getAllEntities();

        for (const id of current.keys()) {
            if (!nextIds.has(id)) {
                gameCore.removeEntity(id);
            }
        }

        for (const ent of entities) {
            if (!gameCore.hasEntity(ent.id)) {
                gameCore.createEntity(ent.id, ent.type, ent.x, ent.y, {
                    name: ent.name,
                    texture: ent.name,
                    variables: ent.variables,
                    components: [],
                });
            } else {
                gameCore.moveEntity(ent.id, ent.x, ent.y);
            }
        }
    }, [entities]);

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
                ref={ref}
                onDragOver={(e) => {
                    e.preventDefault();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer?.files?.[0];
                    if (!file) return;
                    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
                    if (!allowedTypes.has(file.type)) return;
                    onExternalImageDrop?.(file);
                }}
                style={{
                    flex: 1,
                    background: colors.bgPrimary,
                    border: `2px solid ${colors.borderColor}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                }}
                onMouseLeave={() => {
                    rendererRef.current?.clearPreviewTile();
                }}
            />
        </div>
    );
}
