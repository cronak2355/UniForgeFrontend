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
import { getCloudFrontUrl } from "../utils/imageUtils";

import { TILE_SIZE, TILESET_COLS } from "./constants/tileConfig";

type Props = {
    assets: Asset[];
    selected_asset: Asset | null;
    addEntity: (entity: EditorEntity) => void;
    draggedAsset: Asset | null;
    onExternalImageDrop?: (files: FileList) => void;
    onSelectEntity?: (entity: EditorEntity) => void;
    tilingTool?: "" | "drawing" | "erase" | "bucket" | "shape" | "connected_erase";
    selectedTileIndex?: number;
    onRendererReady?: (renderer: { setCameraPosition: (x: number, y: number) => void }) => void;
};

async function buildTilesetCanvas(assets: Asset[]): Promise<HTMLCanvasElement | null> {
    const tileAssets = assets.filter((asset) => asset.tag === "Tile");
    if (tileAssets.length === 0) return null;

    const tilesetcanvas = document.createElement("canvas");
    tilesetcanvas.width = TILE_SIZE * TILESET_COLS;
    tilesetcanvas.height = Math.ceil(tileAssets.length / TILESET_COLS) * TILE_SIZE;

    const ctx = tilesetcanvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");

    for (const asset of tileAssets) {
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

        const tileIdx = asset.idx;
        const x = (tileIdx % TILESET_COLS) * TILE_SIZE;
        const y = Math.floor(tileIdx / TILESET_COLS) * TILE_SIZE;
        if (loaded) {
            ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
            ctx.fillStyle = "#ff00ff";
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
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

export function EditorCanvas({ assets, selected_asset, addEntity, draggedAsset, onExternalImageDrop, tilingTool = "", selectedTileIndex = 0, onRendererReady }: Props) {
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

    // Use props for tiling now
    const tilingTypeRef = useRef<"" | "drawing" | "erase" | "bucket" | "shape" | "connected_erase">(tilingTool);
    const selectedTileIndexRef = useRef<number>(selectedTileIndex);
    const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

    const addEntityRef = useRef(addEntity);
    const isProcessingDropRef = useRef(false);

    const [gameCore, setGameCore] = useState<GameCore | null>(null);
    // const [tilingType, setTilingType] = useState<"" | "drawing" | "erase">("");

    useEffect(() => {
        selectedAssetRef.current = selected_asset;
    }, [selected_asset]);

    useEffect(() => {
        draggedAssetRef.current = draggedAsset;
    }, [draggedAsset]);

    useEffect(() => {
        tilingTypeRef.current = tilingTool;
    }, [tilingTool]);

    useEffect(() => {
        selectedTileIndexRef.current = selectedTileIndex || 0;
    }, [selectedTileIndex]);

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
                logic: ent.logic,
                modules: ent.modules,
                tags: ent.tags, // [ADD] Pass entity tags
                z: ent.z,
                rotationX: ent.rotationX,
                rotationY: ent.rotationY,
                rotationZ: ent.rotationZ,
                scaleX: ent.scaleX,
                scaleY: ent.scaleY,
            });
        }
        gameCore.flush(); // Sync Context immediately

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
        renderer.isRuntimeMode = false; // Explicitly enforce Editor Mode
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
                try {
                    await renderer.loadTexture(asset.name, asset.url, asset.metadata);
                } catch (error) {
                    console.warn(`[EditorCanvas] Failed to load texture: ${asset.name}`, error);
                    // 개별 텍스처 실패는 무시하고 계속 진행
                }
            }

            const tilesetCanvas = await buildTilesetCanvas(currentAssets);
            if (tilesetCanvas) {
                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
            }



            // [Refactor] Removed redundant Entity/Tile spawn loops here.
            // The useEffect hooks (deps: [isRendererReady]) will handle population
            // immediately after this flag is set. This prevents double-spawn race conditions.

            gameCore.flush(); // Sync Context immediately

            // Notify parent that renderer is ready and expose camera control
            if (onRendererReady) {
                onRendererReady({
                    setCameraPosition: (x: number, y: number) => renderer.setCameraPosition(x, y)
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

            // FIX: Use tilingTypeRef and selectedTileIndexRef instead of checking selectedAsset
            const activeTilingType = tilingTypeRef.current;
            const activeDragged = draggedAssetRef.current;
            const currentTileIndex = selectedTileIndexRef.current;

            // Check if we are in Tiling Mode
            if (activeTilingType) {
                const tx = Math.floor(worldX / TILE_SIZE);
                const ty = Math.floor(worldY / TILE_SIZE);

                // Helper: Get tile at (x,y)
                const getTileAt = (x: number, y: number) => {
                    return tilesRef.current.find(t => t.x === x && t.y === y)?.tile;
                };

                // Helper: Flood Fill Algorithm
                const floodFill = (startX: number, startY: number, targetTileIdx: number, isErase: boolean) => {
                    const queue: { x: number, y: number }[] = [{ x: startX, y: startY }];
                    const visited = new Set<string>();
                    const startTile = getTileAt(startX, startY);

                    const MAX_FILL = 2000; // Strict limit as requested
                    const toFill: { x: number, y: number }[] = [];

                    // If replacing same tile with same tile, do nothing
                    if (!isErase && startTile === targetTileIdx) return;
                    // If erasing and there is nothing, do nothing
                    if (isErase && startTile === undefined) return;

                    // 1. Simulation Phase
                    while (queue.length > 0) {
                        // Safety Limit Check (Transactional: Abort if exceeded)
                        if (visited.size > MAX_FILL) {
                            alert(`Bucket fill area too large (> ${MAX_FILL} tiles). Operation cancelled.`);
                            return;
                        }

                        const { x, y } = queue.shift()!; // Shift for BFS (better for fill)
                        const key = `${x},${y}`;
                        if (visited.has(key)) continue;
                        visited.add(key);

                        const currentTile = getTileAt(x, y);
                        if (currentTile !== startTile) continue;

                        toFill.push({ x, y });

                        // Neighbors
                        queue.push({ x: x + 1, y: y });
                        queue.push({ x: x - 1, y: y });
                        queue.push({ x: x, y: y + 1 });
                        queue.push({ x: x, y: y - 1 });
                    }

                    // 2. Commit Phase
                    toFill.forEach(p => {
                        if (isErase) {
                            renderer.removeTile(p.x, p.y);
                            core.removeTile(p.x, p.y);
                        } else {
                            renderer.setTile(p.x, p.y, targetTileIdx);
                            core.setTile(p.x, p.y, targetTileIdx);
                        }
                    });
                };

                if (activeTilingType === "drawing") {
                    renderer.setTile(tx, ty, currentTileIndex);
                    core.setTile(tx, ty, currentTileIndex);
                } else if (activeTilingType === "erase") {
                    renderer.removeTile(tx, ty);
                    core.removeTile(tx, ty);
                } else if (activeTilingType === "bucket") {
                    floodFill(tx, ty, currentTileIndex, false);
                } else if (activeTilingType === "connected_erase") {
                    floodFill(tx, ty, 0, true);
                } else if (activeTilingType === "shape") {
                    // Start Shape Draw
                    shapeStartRef.current = { x: tx, y: ty };
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

        renderer.onPointerMove = (worldX: number, worldY: number, _worldZ: number, isInside: boolean) => {
            const prev = lastPointerRef.current;
            lastPointerRef.current = { x: worldX, y: worldY };

            // FIX: Use tilingTypeRef and selectedTileIndexRef
            const activeTilingType = tilingTypeRef.current;
            const currentTileIndex = selectedTileIndexRef.current;
            const activeDragged = draggedAssetRef.current;

            // 1. Clear preview if mouse is outside or if we have a dragged object
            if (!isInside || activeDragged) {
                renderer.clearPreviewTile();
            }

            // 2. Handling Dragged Entity (Non-Tile)
            if (activeDragged && activeDragged.tag !== "Tile") {
                if (!ghostIdRef.current) {
                    const ghostId = `__ghost__${crypto.randomUUID()}`;
                    ghostIdRef.current = ghostId;

                    // Calculate Aspect Ratio Size
                    let ghostWidth = 40;
                    let ghostHeight = 40;

                    if (rendererRef.current) {
                        const size = rendererRef.current.getTextureSize(activeDragged.name);
                        if (size) {
                            const MAX_SIZE = 64;
                            const ratio = size.width / size.height;
                            if (ratio >= 1) {
                                // Wider
                                ghostWidth = MAX_SIZE;
                                ghostHeight = MAX_SIZE / ratio;
                            } else {
                                // Taller
                                ghostHeight = MAX_SIZE;
                                ghostWidth = MAX_SIZE * ratio;
                            }
                        }
                    }

                    renderer.spawn(ghostId, activeDragged.tag, worldX, worldY, 9999, {
                        texture: activeDragged.name,
                        width: ghostWidth,
                        height: ghostHeight,
                        color: 0xffffff,
                    });
                } else {
                    renderer.update(ghostIdRef.current, worldX, worldY, 9999);
                }
                return;
            }

            // 3. Tiling Brush Previews (Only if mouse is inside)
            if (activeTilingType && isInside) {
                const tx = Math.floor(worldX / TILE_SIZE);
                const ty = Math.floor(worldY / TILE_SIZE);

                if (activeTilingType === "drawing") {
                    if (isPointerDownRef.current) {
                        renderer.clearPreviewTile();
                        renderer.setTile(tx, ty, currentTileIndex);
                        core.setTile(tx, ty, currentTileIndex);
                    } else {
                        renderer.clearPreviewTile();
                        renderer.setPreviewTile(tx, ty, currentTileIndex);
                    }
                } else if (activeTilingType === "erase") {
                    if (isPointerDownRef.current) {
                        renderer.clearPreviewTile();
                        renderer.removeTile(tx, ty);
                        core.removeTile(tx, ty);
                    } else {
                        // Show eraser preview (red tile or similar)
                        renderer.clearPreviewTile();
                        renderer.setPreviewTile(tx, ty, -1); // Use -1 or special "erase" visual
                    }
                } else if (activeTilingType === "shape" && shapeStartRef.current) {
                    // Preview Shape
                    renderer.clearPreviewTile();
                    const start = shapeStartRef.current;
                    const minX = Math.min(start.x, tx);
                    const maxX = Math.max(start.x, tx);
                    const minY = Math.min(start.y, ty);
                    const maxY = Math.max(start.y, ty);

                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            renderer.setPreviewTile(x, y, currentTileIndex);
                        }
                    }
                } else {
                    renderer.clearPreviewTile();
                }
                return;
            }

            // 4. Dragging Existing Entities
            if (dragEntityIdRef.current && isPointerDownRef.current) {
                const id = dragEntityIdRef.current;
                const offset = dragOffsetRef.current;
                const nextX = worldX - offset.x;
                const nextY = worldY - offset.y;
                core.updateEntityPosition(id, nextX, nextY);
                gameCore.moveEntity(id, nextX, nextY);
                return;
            }

            // 5. Camera Panning
            if (cameraDragRef.current && prev) {
                const dx = (worldX - prev.x) / 2;
                const dy = (worldY - prev.y) / 2;
                const cam = renderer.getCameraPosition();
                renderer.setCameraPosition(cam.x - dx, cam.y - dy);
            }
        };

        renderer.onPointerUp = (worldX, worldY) => {
            const activeDragged = draggedAssetRef.current;
            const activeTilingType = tilingTypeRef.current;
            const currentTileIndex = selectedTileIndexRef.current;

            // Shape Commit
            if (activeTilingType === "shape" && shapeStartRef.current) {
                const tx = Math.floor(worldX / TILE_SIZE);
                const ty = Math.floor(worldY / TILE_SIZE);
                const start = shapeStartRef.current;
                const minX = Math.min(start.x, tx);
                const maxX = Math.max(start.x, tx);
                const minY = Math.min(start.y, ty);
                const maxY = Math.max(start.y, ty);

                for (let x = minX; x <= maxX; x++) {
                    for (let y = minY; y <= maxY; y++) {
                        renderer.setTile(x, y, currentTileIndex);
                        core.setTile(x, y, currentTileIndex);
                    }
                }
                shapeStartRef.current = null;
                renderer.clearPreviewTile();
                isPointerDownRef.current = false;
                return;
            }
            // Clear bucket/others just in case
            if (activeTilingType) {
                isPointerDownRef.current = false;
                return;
            }


            // [FIX] Add lock to prevent duplicate drops (double-click/bounce) causing "Entity already exists" error
            if (activeDragged && activeDragged.tag !== "Tile" && !isProcessingDropRef.current) {
                isProcessingDropRef.current = true;

                // Clear ghost immediately
                if (ghostIdRef.current) {
                    renderer.remove(ghostIdRef.current);
                    ghostIdRef.current = null;
                }

                // Clear drag state to prevent further drops
                core.setDraggedAsset(null);

                const entity = assetToEntity(activeDragged, worldX, worldY);
                // [FIX] Load texture BEFORE adding entity to ensure animations are ready when OnStart fires
                const textureKey = entity.texture ?? entity.name;
                (async () => {
                    try {
                        // Ensure texture is loaded first to fix Animation Playback issues
                        await renderer.loadTexture(textureKey, activeDragged.url, activeDragged.metadata);
                        console.log(`[EditorCanvas] Texture loaded for drag-and-drop: ${textureKey}`);
                    } catch (error) {
                        console.error(`[EditorCanvas] Failed to load texture for dropped entity:`, error);
                    } finally {
                        // Now add entity - synced to GameCore automatically
                        // Lock is released after entity is added to prevent race conditions
                        addEntityRef.current(entity);

                        // DEV Logic: Sync to GameCore immediately
                        if (gameCore) {
                            gameCore.createEntity(entity.id, entity.type, entity.x, entity.y, {
                                name: entity.name,
                                texture: entity.texture ?? entity.name,
                                variables: entity.variables,
                                components: splitLogicItems(entity.logic),
                                logic: entity.logic,
                                modules: entity.modules,
                                tags: entity.tags, // [ADD] Pass entity tags
                            });
                            gameCore.flush(); // Sync Context immediately
                        }
                        isProcessingDropRef.current = false;
                    }
                })();
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

    // Asset and Entity texture loading
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

            // Refresh entity textures after asset loading
            for (const ent of entities) {
                const textureKey = ent.texture ?? ent.name;
                if (!textureKey) continue;

                const asset = assetLookup.get(textureKey);
                if (asset) {
                    // [FIX] Only load texture if not already properly loaded
                    // This prevents reload during drag operations
                    const scene = renderer.getScene();
                    const textureExists = scene?.textures.exists(textureKey);
                    const texture = textureExists ? scene?.textures.get(textureKey) : null;
                    const hasFrames = texture && (texture.frameTotal > 1 || texture.getFrameNames().length > 1);

                    // Only load if texture doesn't exist or has no frames yet
                    if (!textureExists || !hasFrames) {
                        await renderer.loadTexture(textureKey, asset.url, asset.metadata);
                        if (cancelled) return;
                    }
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
        gameCore.flush(); // Sync removals

        // Helper: Check if entity has changed (shallow comparison of key properties)
        const hasEntityChanged = (curr: EditorEntity, prev: EditorEntity | undefined): boolean => {
            if (!prev) return true; // New entity
            if (curr.x !== prev.x || curr.y !== prev.y || curr.z !== prev.z) return true;
            if (curr.rotation !== prev.rotation || curr.scaleX !== prev.scaleX || curr.scaleY !== prev.scaleY) return true;
            if (curr.logic.length !== prev.logic.length) return true;
            if (curr.variables.length !== prev.variables.length) return true;
            // Deep check for variables (only if lengths match)
            for (let i = 0; i < curr.variables.length; i++) {
                const cv = curr.variables[i];
                const pv = prev.variables[i];
                if (cv.name !== pv.name || cv.value !== pv.value) return true;
            }
            return false;
        };

        for (const ent of entities) {
            const prevEnt = prevEntitiesMapRef.current.get(ent.id);

            // Skip unchanged entities for performance
            if (gameCore.hasEntity(ent.id) && prevEnt && !hasEntityChanged(ent, prevEnt)) {
                continue;
            }

            const isUI = ent.variables.some((v: any) => v.name === "isUI" && v.value === true);
            const uiText = ent.variables.find((v: any) => v.name === "uiText")?.value;
            const uiColor = ent.variables.find((v: any) => v.name === "uiColor")?.value;
            const uiFontSize = ent.variables.find((v: any) => v.name === "uiFontSize")?.value;
            const keepAspectRatio = ent.variables.find((v: any) => v.name === "keepAspectRatio")?.value;
            const width = ent.variables.find((v: any) => v.name === "width")?.value;
            const height = ent.variables.find((v: any) => v.name === "height")?.value;

            const prevIsUI = prevEnt?.variables.some((v: any) => v.name === "isUI" && v.value === true);
            const prevUiText = prevEnt?.variables.find((v: any) => v.name === "uiText")?.value;
            const prevUiColor = prevEnt?.variables.find((v: any) => v.name === "uiColor")?.value;
            const prevUiFontSize = prevEnt?.variables.find((v: any) => v.name === "uiFontSize")?.value;
            const prevKeepAspectRatio = prevEnt?.variables.find((v: any) => v.name === "keepAspectRatio")?.value;
            const prevWidth = prevEnt?.variables.find((v: any) => v.name === "width")?.value;
            const prevHeight = prevEnt?.variables.find((v: any) => v.name === "height")?.value;

            const needsRespawn = prevEnt && (
                isUI !== prevIsUI ||
                uiText !== prevUiText ||
                uiColor !== prevUiColor ||
                uiFontSize !== prevUiFontSize ||
                keepAspectRatio !== prevKeepAspectRatio ||
                width !== prevWidth ||
                height !== prevHeight
            );

            if (gameCore.hasEntity(ent.id) && needsRespawn) {
                gameCore.removeEntity(ent.id);
                gameCore.flush(); // Sync removal immediately so we can recreate
            }

            if (!gameCore.hasEntity(ent.id)) {
                gameCore.createEntity(ent.id, ent.type, ent.x, ent.y, {
                    name: ent.name,
                    texture: ent.texture ?? ent.name,
                    variables: ent.variables,
                    components: splitLogicItems(ent.logic),
                    logic: ent.logic,
                    modules: ent.modules,
                    tags: ent.tags, // [ADD] Pass entity tags
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
        gameCore.flush(); // Sync final state

        // Update previous entities map for next render
        prevEntitiesMapRef.current = new Map(entities.map(e => [e.id, e]));
    }, [entities, isRendererReady]);

    useEffect(() => {
        const gameCore = gameCoreRef.current;
        if (!gameCore || !isRendererReady) return;
        gameCore.setModuleLibrary(modules, (updated: any) => core.updateModule(updated));
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
        // Find Main Camera and use its position as the CENTER of the guide frame
        const mainCamera = entities.find(e => e.name === "Main Camera");
        const camX = mainCamera?.x ?? 0;
        const camY = mainCamera?.y ?? 0;

        // Calculate top-left corner so that Main Camera is at the center
        const frameX = camX - w / 2;
        const frameY = camY - h / 2;

        renderer.setGuideFrame(w, h, frameX, frameY);
    }, [aspectRatio, isRendererReady, entities]);

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

                    const allowedTypes = new Set([
                        "image/png", "image/jpeg", "image/webp",
                        "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-m4a"
                    ]);
                    let hasValidFile = false;
                    for (let i = 0; i < files.length; i++) {
                        if (allowedTypes.has(files[i].type)) {
                            hasValidFile = true;
                            break;
                        }
                    }

                    if (!hasValidFile) return;
                    onExternalImageDrop?.(files);
                }}
                onMouseLeave={() => {
                    rendererRef.current?.clearPreviewTile();
                }}
            >
                <div ref={ref} style={{ width: '100%', height: '100%' }} />
                <GameUIOverlay gameCore={gameCore} showHud={false} />
            </div>
        </div>
    );
}
