import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import {EditorMode, CameraMode, TilingMode, DragDropMode} from "./editorMode/editorModes"
import type { Asset } from "./types/Asset"
import type { EditorEntity } from "./types/Entity";
import { EditorScene } from "./EditorScene";

type Props = {
    assets:Asset[];
    selected_asset:Asset | null;
    addEntity:(entity: EditorEntity) =>void;
    draggedAsset:Asset | null
};

function loadImages(scene: Phaser.Scene, assets: Asset[]) {
  return new Promise<void>((resolve, reject) => {
    let pending = 0;

    const onFileComplete = (key: string) => {
      pending--;
      if (pending === 0) {
        cleanup();
        resolve();
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error("asset load error"));
    };

    const cleanup = () => {
      scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
      scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    };

    // 이벤트 등록
    scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, onFileComplete);
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);

    // 큐에 추가
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];

      // 이미 있으면 스킵
      if (scene.textures.exists(asset.name)) continue;

      scene.load.image(asset.name, asset.url);
      pending++;
    }

    // 로드할 게 없으면 바로 끝
    if (pending === 0) {
      cleanup();
      resolve();
      return;
    }

    // 로더 시작
    scene.load.start();
  });
}
export function PhaserCanvas({ assets, selected_asset, addEntity, draggedAsset }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<EditorScene | null>(null);
    const [currentEditorMode, setEditorMode] = useState<EditorMode>(() => new CameraMode());
	const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (!ref.current) return;
		if (gameRef.current) return;
		const scene = new EditorScene();
  		sceneRef.current = scene;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: { mode: Phaser.Scale.RESIZE },
            parent: ref.current,
            scene: [scene],
            audio: {
                noAudio : true
            }
        };
        
        const game = new Phaser.Game(config);
		gameRef.current = game;
		scene.onReady = async (es: EditorScene, callback:() => void) => {
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


        return () =>
        {
            game.destroy(true);
        }
    }, []);

	useEffect( () =>{
		if (sceneRef.current == null)
            return;
        if (selected_asset == null)
        {
            const cm = new CameraMode()
            sceneRef.current?.setEditorMode(cm);
            setEditorMode(cm);
        }
		else if (selected_asset?.tag == "Tile")
		{
			const tm = new TilingMode()
			tm.tile = selected_asset.idx;
			tm.base = sceneRef.current.baselayer;
			tm.preview = sceneRef.current.previewlayer;
            const tiling = currentEditorMode as TilingMode;
            tm.curTilingType = tiling.curTilingType;
			sceneRef.current?.setEditorMode(tm);
			setEditorMode(tm);
		}
	}, [selected_asset])
    useEffect( () =>{
		if (draggedAsset == null)
        {
            const cm =new CameraMode()
            setEditorMode(cm)
            sceneRef.current?.setEditorMode(cm);    
            return;
        }
        const mode = new DragDropMode();
        mode.asset = draggedAsset;
        sceneRef.current?.setEditorMode(mode);
        setEditorMode(mode);
	}, [draggedAsset])
    return (
        <div className="flex-1 p-2">
            <div className="border border-white px-2 py-1 mb-2 w-fit d-flex justify-content-left">
                <div className="editor-item px-1">Camera</div>
                { currentEditorMode instanceof TilingMode &&
                    <div className="border border-white mx-1">
					<button
                        onClick={() => {
                            const tm = new TilingMode()
                            tm.curTilingType = currentEditorMode.curTilingType == "drawing" ? "" : "drawing"
                            tm.tile = selected_asset!.idx;
                            tm.base = sceneRef.current!.baselayer;
                            tm.preview = sceneRef.current!.previewlayer;
                            sceneRef.current?.setEditorMode(tm);
                            setEditorMode(tm);
                        }}
					>
					그리기
					</button>
					<button
					    onClick={() => {
						const tm = new TilingMode()
                            tm.curTilingType = currentEditorMode.curTilingType == "erase" ? "" : "erase"
                            tm.tile = selected_asset!.idx;
                            tm.base = sceneRef.current!.baselayer;
                            tm.preview = sceneRef.current!.previewlayer;

                            sceneRef.current?.setEditorMode(tm);
                            setEditorMode(tm);
					}}>
					지우기
					</button>
                    </div>
                }
                
            </div>

            <div ref={ref} onMouseLeave={ () =>{
                if (!sceneRef.current)
                    return;
                sceneRef.current.previewlayer.fill(-1)
            }}/>
        </div>
    );
}