/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { EditorMode, CameraMode, TilingMode, DragDropMode } from "./editorMode/editorModes"
import type { Asset } from "./types/Asset"
import type { EditorEntity } from "./types/Entity";
import { EditorScene } from "./EditorScene";
import { colors } from "./constants/colors";

type Props = {
    assets: Asset[];
    selected_asset: Asset | null;
    addEntity: (entity: EditorEntity) => void;
    draggedAsset: Asset | null;
};

export function PhaserCanvas({ assets, selected_asset, addEntity, draggedAsset }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<EditorScene | null>(null);
    const [currentEditorMode, setEditorMode] = useState<EditorMode>(() => new CameraMode());
    const modeRef = useRef<EditorMode>(currentEditorMode);
    const gameRef = useRef<Phaser.Game | null>(null);

    // modeRef 동기화
    useEffect(() => {
        modeRef.current = currentEditorMode;
    }, [currentEditorMode]);

    const changeEditorMode = (mode: EditorMode) => {
        setEditorMode(mode);
        sceneRef.current!.setEditorMode(mode);
    }
    useEffect(() => {
        if (!ref.current) return;
        if (gameRef.current) return;
        const scene = new EditorScene();
        sceneRef.current = scene;

        // addEntity = “Inspector에서 볼 대상”
        scene.onSelectEntity = (entity) => {
            addEntity(entity); // or onSelectEntity(entity)
        };

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: { mode: Phaser.Scale.RESIZE },
            parent: ref.current,
            scene: [scene],
            audio: {
                noAudio: true
            }
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;
        scene.onReady = async (es: EditorScene, callback: () => void) => {
            const tileSize = 32;
            const cols = 16;

            // 1) 타일만 카운트해서 캔버스 크기 결정
            let tileCount = 0;
            for (let i = 0; i < assets.length; i++) {
                if (assets[i].tag === "Tile") tileCount++;
            }

            const tilesetcanvas = document.createElement("canvas");
            tilesetcanvas.width = tileSize * cols;
            tilesetcanvas.height = Math.ceil(tileCount / cols) * tileSize;

            const ctx = tilesetcanvas.getContext("2d");
            if (!ctx) throw new Error("no 2d context");

            // 2) 타일: 캔버스에 넣고 idx 부여
            let idx = 0;
            for (let i = 0; i < assets.length; i++) {
                if (assets[i].tag !== "Tile") continue;

                assets[i].idx = idx;

                const img = new Image();
                img.src = assets[i].url;
                await img.decode();

                const x = (idx % cols) * tileSize;
                const y = Math.floor(idx / cols) * tileSize;
                ctx.drawImage(img, x, y, tileSize, tileSize);

                idx++;
            }

            // 3) 캔버스를 텍스처로 등록(타일셋 키)
            const tilesetKey = "tiles";
            if (es.textures.exists(tilesetKey)) es.textures.remove(tilesetKey);
            es.textures.addCanvas(tilesetKey, tilesetcanvas);

            // 4) 타일 아닌 애들: 로더에 등록 (큐에 넣는 건 맞는데, 별도 “대기 큐” 말고 로더 큐)
            let normalPending = 0;
            for (let i = 0; i < assets.length; i++) {
                if (assets[i].tag === "Tile") continue;

                if (es.textures.exists(assets[i].name)) continue;
                es.load.image(assets[i].name, assets[i].url);
                normalPending++;
            }
            // 5) 있으면 start 해줘야 실제로 로드됨
            if (normalPending > 0) {
                es.load.start();
            }
            callback();
            // 이제 tilesetKey로 tilemap 만들고 쓰면 됨
        };


        return () => {
            game.destroy(true);
        }
    }, []);

    useEffect(() => {
        if (sceneRef.current == null)
            return;
        if (selected_asset == null) {
            const cm = new CameraMode()
            setEditorMode(cm);
            sceneRef.current!.setEditorMode(cm);
        }
        else if (selected_asset?.tag == "Tile") {
            const tm = new TilingMode()
            tm.tile = selected_asset.idx;
            tm.base = sceneRef.current.baselayer;
            tm.preview = sceneRef.current.previewlayer;

            // ref를 통해 현재 모드 접근 (의존성 루프 방지)
            const tiling = modeRef.current as TilingMode;
            tm.curTilingType = tiling?.curTilingType; // 없을 수도 있으니 옵셔널 체이닝
            setEditorMode(tm);
            sceneRef.current?.setEditorMode(tm);
        }
    }, [selected_asset]) // currentEditorMode 의존성 제거

    useEffect(() => {
        if (sceneRef.current == null)
            return;
        if (draggedAsset == null) {
            const cm = new CameraMode()
            changeEditorMode(cm)
            return;
        }
        const mode = new DragDropMode();
        mode.asset = draggedAsset;
        changeEditorMode(mode);
    }, [draggedAsset])

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

                {currentEditorMode instanceof TilingMode && (
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        marginLeft: '8px',
                        paddingLeft: '8px',
                        borderLeft: `1px solid ${colors.borderColor}`,
                    }}>
                        <button
                            onClick={() => {
                                const tm = new TilingMode();
                                tm.curTilingType = currentEditorMode.curTilingType === "drawing" ? "" : "drawing";
                                tm.tile = selected_asset!.idx;
                                tm.base = sceneRef.current!.baselayer;
                                tm.preview = sceneRef.current!.previewlayer;
                                changeEditorMode(tm);
                            }}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: currentEditorMode.curTilingType === "drawing" ? colors.borderAccent : colors.bgTertiary,
                                border: `1px solid ${colors.borderColor}`,
                                borderRadius: '4px',
                                color: colors.textPrimary,
                                cursor: 'pointer',
                            }}
                        >
                            그리기
                        </button>
                        <button
                            onClick={() => {
                                const tm = new TilingMode();
                                tm.curTilingType = currentEditorMode.curTilingType === "erase" ? "" : "erase";
                                tm.tile = selected_asset!.idx;
                                tm.base = sceneRef.current!.baselayer;
                                tm.preview = sceneRef.current!.previewlayer;
                                changeEditorMode(tm);
                            }}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: currentEditorMode.curTilingType === "erase" ? '#da3633' : colors.bgTertiary,
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
                style={{
                    flex: 1,
                    background: colors.bgViewport,
                    border: `2px solid ${colors.borderColor}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                }}
                onMouseLeave={() => {
                    if (!sceneRef.current) return;
                    sceneRef.current.previewlayer?.fill(-1);
                }}
            />
        </div>
    );
}