import React, { useEffect, useRef, useState } from "react";
import { colors } from "../constants/colors";
import type { Asset } from "../types/Asset";
import { editorCore } from "../EditorCore";
import { getCloudFrontUrl } from "../../utils/imageUtils";
import { TILE_SIZE, TILESET_COLS } from "../constants/tileConfig";

// [UI Fix] Use PALETTE_COLS (3) for better visibility in sidebar, decoupled from global texture layout
const PALETTE_COLS = 3;

interface TilePalettePanelProps {
    assets: Asset[]; // All assets, need to filter for 'Tile' tag
    selectedTileIndex: number;
    onSelectTile: (index: number) => void;
}

export const TilePalettePanel: React.FC<TilePalettePanelProps> = ({ assets, selectedTileIndex, onSelectTile }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tileAssets, setTileAssets] = useState<Asset[]>([]);

    useEffect(() => {
        // [Logic Fix] Case-insensitive matching for "Tile" tag
        const filtered = assets.filter(a => a.tag?.trim().toLowerCase() === "tile");
        console.log(`[TilePalettePanel] Assets updated. Total: ${assets.length}, Tiles: ${filtered.length}`, filtered.map(a => `${a.name}(${a.idx})`));

        // Always update state when assets prop changes to ensure sync
        setTileAssets(filtered);
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

        // Calculate required height based on max index
        // Calculate max index to place unindexed tiles at the end
        let maxExistingIdx = -1;
        let unindexedCount = 0;
        tileAssets.forEach(a => {
            if (typeof a.idx === 'number' && a.idx !== -1) {
                maxExistingIdx = Math.max(maxExistingIdx, a.idx);
            } else {
                unindexedCount++;
            }
        });

        // Ensure enough space for existing keyed tiles + unindexed fallbacks
        const finalMaxIdx = Math.max(maxExistingIdx, -1) + unindexedCount;
        const rows = Math.ceil((finalMaxIdx + 1) / PALETTE_COLS);

        let nextVirtualIdx = maxExistingIdx + 1;

        canvas.width = PALETTE_COLS * TILE_SIZE;
        canvas.height = Math.max(rows, 1) * TILE_SIZE;

        console.log(`[TilePalettePanel] Layout: ${PALETTE_COLS} cols, Canvas Size: ${canvas.width}x${canvas.height}`);

        // Clear
        ctx.fillStyle = colors.bgPrimary;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Tiles
        let loadedCount = 0;
        tileAssets.forEach((asset) => {
            const img = new Image();
            // img.crossOrigin = "Anonymous"; 
            img.onload = () => {
                let tileIdx = asset.idx ?? -1;

                // [Safety Net] If idx is invalid, assign virtual index for display
                if (tileIdx === -1) {
                    tileIdx = nextVirtualIdx++;
                    console.warn(`[TilePalettePanel] Asset ${asset.name} has idx -1, rendering at virtual index ${tileIdx}`);
                }

                const x = (tileIdx % PALETTE_COLS) * TILE_SIZE;
                const y = Math.floor(tileIdx / PALETTE_COLS) * TILE_SIZE;

                // [DEBUG] Log detailed render info
                console.log(`[TilePalettePanel] Drawing ${asset.name} (Tag:${asset.tag}) at Idx:${tileIdx} [${x}, ${y}]`);

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
                // Draw error placeholder
                const tileIdx = asset.idx ?? 0;
                const x = (tileIdx % PALETTE_COLS) * TILE_SIZE;
                const y = Math.floor(tileIdx / PALETTE_COLS) * TILE_SIZE;

                ctx.fillStyle = "#ef4444"; // Red error color
                ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

                ctx.fillStyle = "white";
                ctx.font = "10px sans-serif";
                ctx.fillText("ERR", x + 4, y + 20);

                // Still count as loaded to finish the batch
                loadedCount++;
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

        const targetIdx = row * PALETTE_COLS + col;
        const exists = tileAssets.some(a => a.idx === targetIdx);
        if (exists) {
            onSelectTile(targetIdx);
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

        const newAsset: Asset = {
            id: `color-${Date.now()}`,
            name: `Color ${color}`,
            tag: "Tile",
            url: dataUrl,
            idx: -1,
            metadata: { isColorTile: true, color }
        };

        editorCore.addAsset(newAsset);

        // Optimistically select the new tile if idx was assigned
        if (newAsset.idx !== undefined && newAsset.idx !== -1) {
            onSelectTile(newAsset.idx);
        }
    };

    // Calculate Selection Highlight Position
    const selX = (selectedTileIndex % PALETTE_COLS) * TILE_SIZE;
    const selY = Math.floor(selectedTileIndex / PALETTE_COLS) * TILE_SIZE;

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
                overflowX: "auto", // [FIX] Allow horizontal scroll if canvas is wider than sidebar
                overflowY: "auto",
                position: "relative",
                padding: "4px",
                border: "1px dashed rgba(255,0,0,0.3)" // [DEBUG] Show container bounds
            }}>
                <div style={{ position: "relative", width: "fit-content" }}>
                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        style={{ cursor: "pointer", display: "block", background: colors.bgTertiary }}
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
