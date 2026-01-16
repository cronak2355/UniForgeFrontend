import React, { useEffect, useRef, useState } from "react";
import { colors } from "../constants/colors";
import type { Asset } from "../types/Asset";

const TILE_SIZE = 32;
const TILESET_COLS = 16;

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
        setTileAssets(filtered);
    }, [assets]);

    useEffect(() => {
        if (!canvasRef.current || tileAssets.length === 0) return;

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
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const x = (idx % TILESET_COLS) * TILE_SIZE;
                const y = Math.floor(idx / TILESET_COLS) * TILE_SIZE;
                ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);

                // Draw grid
                ctx.strokeStyle = "rgba(255,255,255,0.1)";
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            };
            img.src = asset.url;
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
                overflow: "auto",
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
        </div>
    );
};
