/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { EditorMode, CameraMode, TilingMode, DragDropMode } from "./editorMode/editorModes"
import { useEditorCore } from "../contexts/EditorCoreContext";
import { type EditorContext } from "./EditorCore";
import type { Asset } from "./types/Asset"
import type { EditorEntity } from "./types/Entity";
import { EditorScene } from "./EditorScene";
import { colors } from "./constants/colors";

type Props = {
    assets: Asset[];
    selected_asset: Asset | null;
    addEntity: (entity: EditorEntity) => void;
    draggedAsset: Asset | null
    onSelectEntity?: (entity: EditorEntity) => void;
};

export function EditorCanvas({ assets, selected_asset, addEntity, draggedAsset }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const core = useEditorCore();
    const coreRef = useRef(core);
    const sceneRef = useRef<EditorScene | null>(null);
    const [currentEditorMode, setEditorMode] = useState<EditorMode>(() => new CameraMode());
    const modeRef = useRef<EditorMode>(currentEditorMode);
    const gameRef = useRef<Phaser.Game | null>(null);
    const addEntityRef = useRef(addEntity);
    const assetsRef = useRef(assets);

    // Keep refs updated
    useEffect(() => { coreRef.current = core; }, [core]);
    useEffect(() => { addEntityRef.current = addEntity; }, [addEntity]);
    useEffect(() => { assetsRef.current = assets; }, [assets]);

    // modeRef ?숆린??
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
        // inject core so scene can forward context to the EditorState FSM
        scene.editorCore = coreRef.current;

        // addEntity = hierarchy/inspector update on new entities
        scene.onSelectEntity = (entity) => {
            console.log("[PhaserCanvas] received entity:", entity);
            addEntityRef.current(entity);
            coreRef.current.setSelectedEntity(entity);
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
            const currentAssets = assetsRef.current;
            for (let i = 0; i < currentAssets.length; i++) {
                if (currentAssets[i].tag === "Tile") tileCount++;
            }

            const tilesetcanvas = document.createElement("canvas");
            tilesetcanvas.width = tileSize * cols;
            tilesetcanvas.height = Math.ceil(tileCount / cols) * tileSize;

            const ctx = tilesetcanvas.getContext("2d");
            if (!ctx) throw new Error("no 2d context");

            // 2) 타일 캔버스에 쓰고 idx 부여
            let idx = 0;
            for (let i = 0; i < currentAssets.length; i++) {
                if (currentAssets[i].tag !== "Tile") continue;

                currentAssets[i].idx = idx;

                const x = (idx % cols) * tileSize;
                const y = Math.floor(idx / cols) * tileSize;

                if (currentAssets[i].url) {
                    try {
                        const img = new Image();
                        img.src = currentAssets[i].url;
                        await img.decode();
                        ctx.drawImage(img, x, y, tileSize, tileSize);
                    } catch (e) {
                        console.error(`Failed to load tile image: ${currentAssets[i].name}`, e);
                        // 실패 시 대체 색상
                        ctx.fillStyle = '#ff00ff';
                        ctx.fillRect(x, y, tileSize, tileSize);
                    }
                } else if (currentAssets[i].color) {
                    ctx.fillStyle = currentAssets[i].color || '#ffffff';
                    ctx.fillRect(x, y, tileSize, tileSize);
                }

                idx++;
            }

            // 3) 캔버스를 텍스처로 등록(타일셋 생성)
            const tilesetKey = "tiles";
            if (es.textures.exists(tilesetKey)) es.textures.remove(tilesetKey);
            es.textures.addCanvas(tilesetKey, tilesetcanvas);

            // 4) 타일 아닌 애셋들: 로더에 등록
            let normalPending = 0;
            for (let i = 0; i < currentAssets.length; i++) {
                if (currentAssets[i].tag === "Tile") continue;

                if (es.textures.exists(currentAssets[i].name)) continue;
                es.load.image(currentAssets[i].name, currentAssets[i].url);
                normalPending++;
            }
            // 5) 있으면 start 호출해서 실제로 로드
            if (normalPending > 0) {
                es.load.start();
            }
            callback();
            // ?댁젣 tilesetKey濡?tilemap 留뚮뱾怨??곕㈃ ??
        };


        return () => {
            game.destroy(true);
            gameRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update tileset when asset colors change
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !scene.ready) return;

        const tileSize = 32;
        const cols = 16;

        // Count tiles
        let tileCount = 0;
        for (let i = 0; i < assets.length; i++) {
            if (assets[i].tag === "Tile") tileCount++;
        }
        if (tileCount === 0) return;

        const tilesetcanvas = document.createElement("canvas");
        tilesetcanvas.width = tileSize * cols;
        tilesetcanvas.height = Math.ceil(tileCount / cols) * tileSize;

        const ctx = tilesetcanvas.getContext("2d");
        if (!ctx) return;

        let idx = 0;
        for (let i = 0; i < assets.length; i++) {
            if (assets[i].tag !== "Tile") continue;

            assets[i].idx = idx;
            const x = (idx % cols) * tileSize;
            const y = Math.floor(idx / cols) * tileSize;

            if (assets[i].color) {
                ctx.fillStyle = assets[i].color || '#ffffff';
                ctx.fillRect(x, y, tileSize, tileSize);
            }

            idx++;
        }

        // Update the texture
        const tilesetKey = "tiles";
        if (scene.textures.exists(tilesetKey)) {
            scene.textures.remove(tilesetKey);
        }
        scene.textures.addCanvas(tilesetKey, tilesetcanvas);
    }, [assets]);

    useEffect(() => {
        if (sceneRef.current == null)
            return;
        if (!sceneRef.current.ready) return; // Wait for scene to be ready

        if (selected_asset == null) {
            const cm = new CameraMode()
            setEditorMode(cm);
            sceneRef.current!.setEditorMode(cm);
            const ctx: EditorContext = { currentMode: cm, mouse: "mousemove" };
            core.sendContextToEditorModeStateMachine(ctx);
        }
        else if (selected_asset?.tag == "Tile") {
            // Make sure layers are initialized
            if (!sceneRef.current.baselayer || !sceneRef.current.previewlayer) {
                console.warn("Tile layers not yet initialized");
                return;
            }

            const tm = new TilingMode()
            tm.tile = selected_asset.idx;
            tm.base = sceneRef.current.baselayer;
            tm.preview = sceneRef.current.previewlayer;

            // Keep previous tiling type if available
            const tiling = modeRef.current as TilingMode;
            tm.curTilingType = tiling?.curTilingType || "";
            setEditorMode(tm);
            sceneRef.current?.setEditorMode(tm);
            const ctx: EditorContext = { currentMode: tm, currentSelectedAsset: selected_asset, mouse: "mousemove" };
            core.sendContextToEditorModeStateMachine(ctx);
        }
    }, [selected_asset, core])

    useEffect(() => {
        if (sceneRef.current == null)
            return;
        if (draggedAsset == null) {
            const cm = new CameraMode()
            changeEditorMode(cm)
            const ctx: EditorContext = { currentMode: cm, mouse: "mousemove" };
            core.sendContextToEditorModeStateMachine(ctx);
            return;
        }
        const mode = new DragDropMode();
        mode.asset = draggedAsset;
        changeEditorMode(mode);
        const ctx: EditorContext = { currentMode: mode, currentDraggingAsset: draggedAsset, mouse: "mousemove" };
        core.sendContextToEditorModeStateMachine(ctx);
    }, [draggedAsset, core])

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
                    try {
                        if (!sceneRef.current?.previewlayer) return;
                        sceneRef.current.previewlayer.fill(-1);
                    } catch {
                        // Ignore errors when previewlayer is not initialized
                    }
                }}
            />
        </div>
    );
}
