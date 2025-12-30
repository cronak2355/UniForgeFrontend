import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import {EditorMode, CameraMode, TilingMode, DragDropMode} from "./editorMode/editorModes"
import type { Asset } from "./types/Asset"
import type { EditorEntity } from "./types/Entity";

1
let gridGfx: Phaser.GameObjects.Graphics;
type Props = {
    assets:Asset[];
    selected_asset:Asset | null;
    addEntity:(entity: EditorEntity) =>void;
    draggedAsset:Asset | null
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
		
        const getCanvasPos = (clientX: number, clientY: number) => {
        const rect = this.sys.game.canvas.getBoundingClientRect();

        // ✅ inside는 "client 좌표"로 rect에 직접 비교 (이게 제일 안 헷갈림)
        const inside =
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom;
        // ✅ Phaser에 넘길 좌표는 "캔버스 픽셀 좌표"로 변환
        // rect.width/height는 CSS 픽셀, canvas.width/height는 실제 렌더 픽셀(DPR 반영)
        const x = (clientX - rect.left) * (this.sys.game.canvas.width / rect.width);
        const y = (clientY - rect.top) * (this.sys.game.canvas.height / rect.height);

        return { x, y, inside, rect };
        };

        const feedPointer = (clientX: number, clientY: number) => {
            const { x, y, inside } = getCanvasPos(clientX, clientY);

            // Phaser 캔버스 밖이면 굳이 모드에 안 보내고 싶으면 여기서 막아도 됨
            // (드래그 중 프리뷰를 캔버스 밖에서 끄고 싶으면 inside 체크 활용)
            const p = this.input.activePointer;

            // ★ 핵심: activePointer에 좌표를 "주입"
            // TS 상 readonly일 수 있어서 any 캐스팅
            (p as any).x = x;
            (p as any).y = y;

            // world 좌표가 모드에서 필요하면 모드 내부에서 getWorldPoint 쓰면 됨
            return { p, inside };
        };
        const onWinPointerDown = (e: PointerEvent) => {
            // 캔버스 밖에서 눌린 건 무시하고 싶으면:
            const { p, inside } = feedPointer(e.clientX, e.clientY);
            
            if (!inside) return;
            console.log(this.editorMode)
            this.editorMode.onPointerDown(this, p);
        };

        const onWinPointerMove = (e: PointerEvent) => {
            const { p, inside } = feedPointer(e.clientX, e.clientY);
            // inside 조건을 줄지 말지는 니 UX 선택임.
            // - inside 체크하면: 캔버스 밖에선 모드 move 안 감
            // - 체크 안 하면: 캔버스 밖에서도 계속 move 들어감 (드래그 취소 처리 등에 유용)
            // 여기선 일단 inside 아니면 return 걸어둘게.
            if (!inside) return;

            this.editorMode.onPointerMove(this, p);
        };

        const onWinPointerUp = (e: PointerEvent) => {
            const { p, inside } = feedPointer(e.clientX, e.clientY);

            // up은 inside 아니어도 처리하고 싶을 때가 많음(드래그 종료)
            // 여기선 무조건 보냄
            console.log("dfdfd")
            this.editorMode.onPointerUp(this, p);
        };

        const onWinWheel = (e: WheelEvent) => {
            const { inside } = getCanvasPos(e.clientX, e.clientY);
            if (!inside) return;

            // 페이지 스크롤 방지 (passive:false 필수)
            e.preventDefault();

            this.editorMode.onScroll(this, e.deltaY);
        };
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
        window.addEventListener("pointerdown", onWinPointerDown, {capture: true});
        window.addEventListener("pointermove", onWinPointerMove, {capture: true});
        window.addEventListener("pointerup", onWinPointerUp, {capture: true});
        window.addEventListener("wheel", onWinWheel, { passive: false });

        // 씬 종료/재시작 때 누수 방지
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("pointerdown", onWinPointerDown);
            window.removeEventListener("pointermove", onWinPointerMove);
            window.removeEventListener("pointerup", onWinPointerUp);
            window.removeEventListener("wheel", onWinWheel as any);
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
		//console.log(selected_asset?.tag)
		//console.log(sceneRef)
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
        console.log("dasfdfad")
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

            <div ref={ref} onMouseLeave={ () =>{
                if (!sceneRef.current)
                    return;
                sceneRef.current.previewlayer.fill(-1)
            }}/>
        </div>
    );
}