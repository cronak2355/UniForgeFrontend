import { useEffect, useRef } from "react";
import { useEditorCoreSnapshot } from "../contexts/EditorCoreContext";
import { GameCore } from "./core/GameCore";
import { PhaserRenderer } from "./renderer/PhaserRenderer";
import type { Asset } from "./types/Asset";
import type { TilePlacement } from "./EditorCore";
import { registerRuntimeEntity, clearRuntimeEntities } from "./core/modules/ModuleFactory";

const TILE_SIZE = 32;
const TILESET_COLS = 16;

async function buildTilesetCanvas(assets: Asset[]): Promise<HTMLCanvasElement | null> {
    // 타일 에셋을 하나의 캔버스로 합쳐 타일셋 텍스처를 만든다.
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
    // 타일 배열을 좌표 키 맵으로 변환해 diff 계산에 사용한다.
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
        // 런타임 렌더러/게임코어 초기화 (최초 1회)
        if (!ref.current) return;
        if (rendererRef.current) return;

        const renderer = new PhaserRenderer();
        rendererRef.current = renderer;
        const gameCore = new GameCore(renderer);
        gameCoreRef.current = gameCore;
        renderer.useEditorCoreRuntimePhysics = false;
        renderer.onInputState = (input) => {
            gameCore.setInputState(input);
        };

        let active = true;

        (async () => {
            // 렌더러 초기화 후 텍스처/타일셋/초기 상태를 로드한다.
            await renderer.init(ref.current as HTMLElement);
            if (!active) return;

            for (const asset of assets) {
                // 타일은 타일셋 캔버스로 처리하므로 비타일만 로드한다.
                if (asset.tag === "Tile") continue;
                await renderer.loadTexture(asset.name, asset.url);
            }

            const tilesetCanvas = await buildTilesetCanvas(assets);
            if (tilesetCanvas) {
                // 타일셋 텍스처 등록 후 타일맵 생성
                renderer.addCanvasTexture("tiles", tilesetCanvas);
                renderer.initTilemap("tiles");
            }

            for (const t of tiles) {
                // 저장된 타일 배치 복원
                renderer.setTile(t.x, t.y, t.tile);
            }

            for (const e of entities) {
                // 저장된 엔티티 생성
                gameCore.createEntity(e.id, e.type, e.x, e.y, {
                    name: e.name,
                    texture: e.name,
                    variables: e.variables,
                    components: e.components,
                    modules: e.modules,
                    rules: e.rules,
                });

                // 런타임 모듈 인스턴스 등록 (ECA 액션에서 메서드 호출 가능하게)
                registerRuntimeEntity(e.id, e.type, e.name, e.x, e.y, 0, e.modules);
            }

            // 런타임 업데이트 루프 연결 (컴포넌트 처리)
            renderer.onUpdateCallback = (time, delta) => {
                gameCore.update(time, delta);
            };
        })();

        return () => {
            // 언마운트 시 리소스 정리
            active = false;
            clearRuntimeEntities(); // 런타임 엔티티 정리
            gameCoreRef.current?.destroy();
            renderer.onUpdateCallback = undefined;
            renderer.onInputState = undefined;
            renderer.destroy();
            rendererRef.current = null;
            gameCoreRef.current = null;
        };
    }, []);

    useEffect(() => {
        // 타일 변경사항만 반영 (추가/삭제 diff)
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
