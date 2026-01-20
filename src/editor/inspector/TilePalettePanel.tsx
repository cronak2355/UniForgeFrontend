import React, { useEffect, useRef, useState } from "react";
import { colors } from "../constants/colors";
import type { Asset } from "../types/Asset";
import { editorCore } from "../EditorCore";
import { getCloudFrontUrl } from "../../utils/imageUtils";

const TILE_SIZE = 100;
const TILESET_COLS = 3;
const MAX_COLOR_TILES = 30;

interface TilePalettePanelProps {
    assets: Asset[]; // All assets, need to filter for 'Tile' tag
    selectedTileIndex: number;
    onSelectTile: (index: number) => void;
}

export const TilePalettePanel: React.FC<TilePalettePanelProps> = ({ assets, selectedTileIndex, onSelectTile }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tileAssets, setTileAssets] = useState<Asset[]>([]);

    useEffect(() => {
        const filtered = assets.filter(a => a.tag === "Tile");
        console.log(`[TilePalettePanel] Assets updated. Total: ${assets.length}, Tiles: ${filtered.length}`);

        // Deep comparison to avoid re-renders if assets didn't change
        const prev = JSON.stringify(tileAssets.map(a => a.id));
        const next = JSON.stringify(filtered.map(a => a.id));

        if (prev !== next) {
            console.log("[TilePalettePanel] Tile assets changed. Updating state.");
            setTileAssets(filtered);
        } else {
            console.log("[TilePalettePanel] No change in tile assets detected.");
        }
    }, [assets]); // assets array reference changes often, but contents might be same

    useEffect(() => {
        if (!canvasRef.current || tileAssets.length === 0) {
            console.log("[TilePalettePanel] Skipping render. Canvas ready:", !!canvasRef.current, "Tiles:", tileAssets.length);
            return;
        }

        console.log("[TilePalettePanel] Rendering canvas with", tileAssets.length, "tiles.");
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const totalTiles = tileAssets.length;
        const rows = Math.ceil(totalTiles / TILESET_COLS);

        canvas.width = TILESET_COLS * TILE_SIZE;
        canvas.height = rows * TILE_SIZE;

        // Clear
        ctx.fillStyle = colors.bgPrimary;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Tiles
        let loadedCount = 0;
        tileAssets.forEach((asset, idx) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const x = (idx % TILESET_COLS) * TILE_SIZE;
                const y = Math.floor(idx / TILESET_COLS) * TILE_SIZE;
                ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);

                // Draw grid
                ctx.strokeStyle = "rgba(255,255,255,0.1)";
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

                loadedCount++;
                if (loadedCount === tileAssets.length) {
                    console.log("[TilePalettePanel] All tile images loaded and drawn.");
                }
            };
            img.onerror = (e) => {
                console.error(`[TilePalettePanel] Failed to load image: ${asset.url}`, e);
            };
            img.src = getCloudFrontUrl(asset.url);
        });

    }, [tileAssets]);

    // Handle Click
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / TILE_SIZE);
        const row = Math.floor(y / TILE_SIZE);

        const index = row * TILESET_COLS + col;
        if (index >= 0 && index < tileAssets.length) {
            onSelectTile(index);
        }
    };

    const handleAddColorTile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        if (!color) return;

        // Create a 32x32 colored tile via Canvas
        const offCanvas = document.createElement("canvas");
        offCanvas.width = TILE_SIZE;
        offCanvas.height = TILE_SIZE;
        const ctx = offCanvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        }

        const dataUrl = offCanvas.toDataURL("image/png");

        // Find existing color tiles
        const colorTiles = tileAssets.filter(a => a.metadata?.isColorTile);

        if (colorTiles.length >= MAX_COLOR_TILES) {
            // Sort by ID (color-TIMESTAMP) to find the oldest
            const oldest = [...colorTiles].sort((a, b) => a.id.localeCompare(b.id))[0];

            // Delete the oldest asset
            editorCore.removeAsset(oldest.id);

            // Add new asset (so it appears at the end)
            const newAssetId = `color-${Date.now()}`;
            editorCore.addAsset({
                id: newAssetId,
                name: `Color ${color}`,
                tag: "Tile",
                url: dataUrl,
                idx: -1,
                metadata: { isColorTile: true, color }
            });

            // Auto Select the new asset (it will be the last one)
            // We can't know the index immediately if state update is async, 
            // but here state update is synchronous in EditorCore (just calls notify).
            // However, tileAssets state in THIS component updates via useEffect.
            // We can optimistically set selection to (MAX_COLOR_TILES - 1) or wait.
            // Given the useEffect logic, it will re-render.
            // Let's set index to the last one.
            onSelectTile(MAX_COLOR_TILES - 1);
        } else {
            const newAssetId = `color-${Date.now()}`;
            // Add virtual asset to core
            editorCore.addAsset({
                id: newAssetId,
                name: `Color ${color}`,
                tag: "Tile",
                url: dataUrl,
                idx: -1,
                metadata: { isColorTile: true, color }
            });

            // The auto-selection will happen via index in the next render
            onSelectTile(tileAssets.length);
        }
    };

    // Calculate Selection Highlight Position
    const selX = (selectedTileIndex % TILESET_COLS) * TILE_SIZE;
    const selY = Math.floor(selectedTileIndex / TILESET_COLS) * TILE_SIZE;

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: colors.bgPrimary,
            overflow: "hidden"
        }}>
            <div style={{
                padding: "8px",
                fontSize: "12px",
                fontWeight: "bold",
                color: colors.textSecondary,
                borderBottom: `1px solid ${colors.borderColor}`
            }}>
                Tile Palette
            </div>

            <div style={{
                flex: 1,
                overflowX: "hidden",
                overflowY: "auto",
                position: "relative",
                padding: "4px"
            }}>
                <div style={{ position: "relative", width: "fit-content" }}>
                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        style={{ cursor: "pointer", display: "block" }}
                    />
                    {/* Selection Highlight Overlay */}
                    {selectedTileIndex >= 0 && (
                        <div style={{
                            position: "absolute",
                            left: selX,
                            top: selY,
                            width: TILE_SIZE,
                            height: TILE_SIZE,
                            border: `2px solid ${colors.accentLight}`,
                            boxShadow: `0 0 4px ${colors.accentLight}`,
                            pointerEvents: "none"
                        }} />
                    )}
                </div>
            </div>

            {/* Color Picker Footer */}
            <div style={{
                padding: "8px",
                borderTop: `1px solid ${colors.borderColor}`,
                background: colors.bgSecondary,
                display: "flex",
                alignItems: "center",
                gap: "8px"
            }}>
                <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '4px', overflow: 'hidden', border: `1px solid ${colors.borderColor}` }}>
                    <input
                        type="color"
                        onChange={handleAddColorTile}
                        style={{
                            position: 'absolute',
                            top: '-5px',
                            left: '-5px',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            border: 'none',
                            padding: 0,
                            background: 'none'
                        }}
                        title="Add Color Tile"
                    />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#fff', fontSize: '10px' }}>
                        <i className="fa-solid fa-plus"></i>
                    </div>
                </div>
                <span style={{ fontSize: '11px', color: colors.textSecondary }}>Add Custom Color</span>
            </div>
        </div>
    );
};
