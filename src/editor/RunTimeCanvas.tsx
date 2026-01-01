import { useEffect, useRef } from "react";
import { useEditorCoreSnapshot } from "../contexts/EditorCoreContext";
import { GameCore } from "./core/GameCore";
import { PhaserRenderer } from "./renderer/PhaserRenderer";
import type { Asset } from "./types/Asset";
import type { TilePlacement } from "./EditorCore";

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
        img.src = asset.url;
        await img.decode();

        const x = (idx % TILESET_COLS) * TILE_SIZE;
        const y = Math.floor(idx / TILESET_COLS) * TILE_SIZE;
        ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);

        idx++;
    }

    return tilesetcanvas;
}

function indexTiles(tiles: TilePlacement[]) {
    const map = new Map<string, TilePlacement>();
    for (const t of tiles) {
        map.set(`${t.x},${t.y}`, t);
    }
    return map;
}

export function RunTimeCanvas() {
    const ref = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<PhaserRenderer | null>(null);
    const gameCoreRef = useRef<GameCore | null>(null);
    const prevTilesRef = useRef<Map<string, TilePlacement>>(new Map());
    const { assets, tiles, entities } = useEditorCoreSnapshot();

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
            }

            const tilesetCanvas = await buildTilesetCanvas(assets);
            if (tilesetCanvas) {
                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
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
        })();

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
        if (!renderer) return;

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

            {/* Phaser Canvas Container */}
            <div
                ref={ref}
                style={{
                    flex: 1,
                    background: colors.bgPrimary,
                    border: `2px solid ${colors.borderColor}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                }}
            />
        </div>
    );
}
