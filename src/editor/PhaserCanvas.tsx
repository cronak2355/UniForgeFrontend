import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import type { EditorEntity } from "./EditorLayout";
import {EditorMode, CameraMode, TilingMode} from "./editorMode/editorModes"
import type { Asset } from "../data/Asset"

let gridGfx: Phaser.GameObjects.Graphics;
type Props = {
    assets:Asset[];
    selected_asset:Asset | null;
};
const tileSize = 32;
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


//그리드 표시
function redrawGrid(scene: Phaser.Scene) {
  const cam = scene.cameras.main;
  const view = cam.worldView; // 현재 카메라가 보는 월드 영역

  // 보이는 영역을 tileSize 경계로 스냅
  const left = Math.floor(view.x / tileSize) * tileSize;
  const right = Math.ceil((view.x + view.width) / tileSize) * tileSize;
  const top = Math.floor(view.y / tileSize) * tileSize;
  const bottom = Math.ceil((view.y + view.height) / tileSize) * tileSize;

  gridGfx.clear();

  // 선 스타일 (두께 1, 색은 아무거나)
  gridGfx.lineStyle(1, 0xffffff, 0.15);

  // 세로선
  for (let x = left; x <= right; x += tileSize) {
    gridGfx.beginPath();
    gridGfx.moveTo(x, top);
    gridGfx.lineTo(x, bottom);
    gridGfx.strokePath();
  }

  // 가로선
  for (let y = top; y <= bottom; y += tileSize) {
    gridGfx.beginPath();
    gridGfx.moveTo(left, y);
    gridGfx.lineTo(right, y);
    gridGfx.strokePath();
  }
}
class EditorScene extends Phaser.Scene {
	
    private ready = false;
    private entityGroups!: Phaser.GameObjects.Container;
    private editorMode:EditorMode = new CameraMode();
	private map!: Phaser.Tilemaps.Tilemap;
  	private tileset!: Phaser.Tilemaps.Tileset;
  	public baselayer!: Phaser.Tilemaps.TilemapLayer;
	public previewlayer!: Phaser.Tilemaps.TilemapLayer;
	onReady!: (scene: EditorScene, callback:() => void) => Promise<void>;


    constructor() {
        super("EditorScene");
    }


    create() {
		//타일 맵 만들기!
        this.ready = true;
        //this.input.enabled = false;
        gridGfx = this.add.graphics();
        gridGfx.setDepth(9999); // 항상 위에 보이게 (필요하면)
		// tilesKey는 "로드한 이미지 키" (예: "tiles")
		this.entityGroups = this.add.container(0, 0);
		
        //마우스 다운
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            this.editorMode.onPointerDown(this, pointer);
        });

        // 2) 마우스 업
        this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            this.editorMode.onPointerUp(this, pointer);
        });

        // 3) 마우스 움직이기
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            this.editorMode.onPointerMove(this, pointer);
        });

        // 4) 휠 줌
        this.input.on("wheel",(pointer: Phaser.Input.Pointer, _objs: any, _dx: number, dy: number) => {
            this.editorMode.onScroll(this, dy);
        });
		this.onReady(this, () =>{
            this.map = this.make.tilemap({
                tileWidth: tileSize,
                tileHeight: tileSize,
                width: 200,
                height: 200,
            });

			this.tileset = this.map.addTilesetImage("tiles", "tiles", tileSize, tileSize)!;
			//레이어 만들기 (실제로 화면에 그려지는 대상)
			this.baselayer = this.map.createBlankLayer("base", this.tileset, 0, 0)!;
			this.previewlayer = this.map.createBlankLayer("preview", this.tileset,0 , 0)!;
			this.baselayer.setDepth(0);
			this.previewlayer.setDepth(1);
		});
    }

    updateEntities(entities: EditorEntity[]) {
        if (!this.ready) return;

        this.children.removeAll();
        entities.forEach(e => {
            const rect = this.add.rectangle(e.x, e.y, 40, 40, 0xffffff);
            rect.setData("id", e.id);
        });
    }
    setEditorMode(mode:EditorMode)
    {
        this.editorMode = mode;
    }
	getEditorMode()
	{
		return this.editorMode;
	}
	//이 친구는 아예 테스트용도로만 쓰임 나중에 지울 것
    update()
    {
        redrawGrid(this)
    }
}

export function PhaserCanvas({ assets, selected_asset }: Props) {
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
		//console.log(selected_asset?.tag)
		//console.log(sceneRef)
		if (sceneRef.current == null)
				return;
		if (selected_asset?.tag == "Tile")
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
                        console.log(sceneRef.current);
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

            <div ref={ref} />
        </div>
    );
}