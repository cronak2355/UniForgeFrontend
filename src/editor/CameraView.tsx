import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { EditorScene } from "./EditorScene";
import type { EditorEntity } from "./types/Entity";

// Props 정의
type Props = {
    // 씬에 동기화할 엔티티 목록
    entities: EditorEntity[];
    // 에셋을 드롭해서 엔티티를 생성할 때 호출되는 콜백
    onCreateEntity: (e: EditorEntity) => void;
    // 씬 내에서 엔티티가 이동되었을 때 호출되는 콜백
    onMoveEntity: (id: string, x: number, y: number) => void;
};

/**
 * CameraView
 * - Phaser `EditorScene`를 포함하는 React 컴포넌트입니다.
 * - 내부에 Phaser 캔버스를 렌더링하고 외부로부터 엔티티 목록을 받아 씬과 동기화합니다.
 * - 또한 HTML5 드래그-드랍을 받아 화면에 엔티티를 생성합니다.
 */
export function CameraView({ entities, onCreateEntity, onMoveEntity }: Props) {
    // Phaser 게임을 붙일 DOM 레퍼런스
    const containerRef = useRef<HTMLDivElement>(null);
    // 씬 인스턴스 보관
    const sceneRef = useRef<EditorScene | null>(null);

    // Phaser 게임 및 씬 초기화 (한 번만 실행)
    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new EditorScene();
        sceneRef.current = scene;

        // Phaser 게임 생성
        const game = new Phaser.Game({
            type: Phaser.CANVAS,
            parent: containerRef.current,
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            backgroundColor: "#020617",
            scene,
        });

        // 씬에서 엔티티가 이동하면 상위 컴포넌트에 알림
        scene.onEntityMove = onMoveEntity;

        // 리사이즈 시 캔버스 크기 조정
        const resizeObserver = new ResizeObserver(() => {
            if (!containerRef.current) return;
            game.scale.resize(
                containerRef.current.clientWidth,
                containerRef.current.clientHeight
            );
        });

        resizeObserver.observe(containerRef.current);

        // 정리(cleanup)
        return () => {
            resizeObserver.disconnect();
            game.destroy(true);
        };
    }, []);

    // 외부에서 전달된 엔티티 배열이 바뀌면 씬에 동기화
    useEffect(() => {
        sceneRef.current?.syncEntities(entities);
    }, [entities]);

    return (
        <div
            className="editor-camera"
            // 드래그가 캔버스 위로 올라왔을 때 처리
            onDragOver={(e) => {
                // 드롭을 허용하기 위해 기본 동작 막기
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                // 씬에 미리보기(ghost)를 표시 (화면 좌표 -> 로컬 좌표)
                sceneRef.current?.showGhost(
                    e.clientX - rect.left,
                    e.clientY - rect.top
                );
            }}
            // 드래그가 영역을 벗어나면 미리보기 숨김
            onDragLeave={() => {
                sceneRef.current?.hideGhost();
            }}
            // 드롭 처리
            onDrop={(e) => {
                e.preventDefault();
                sceneRef.current?.hideGhost();

                // 드래그 소스에서 `application/editor-entity` 형식으로 보낸 데이터를 읽음
                const raw = e.dataTransfer.getData("application/editor-entity");
                if (!raw) return;

                const asset = JSON.parse(raw);
                const rect = e.currentTarget.getBoundingClientRect();

                // 로컬(뷰포트) 좌표를 사용하여 새 엔티티 생성 요청
                onCreateEntity({
                    id: crypto.randomUUID(),
                    type: asset.type,
                    name: asset.type,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    variables: [],
                    events: []
                });
            }}
        >
            <div className="editor-camera-header">Camera</div>
            {/* Phaser 캔버스를 붙일 뷰포트 */}
            <div className="editor-camera-viewport" ref={containerRef} />
        </div>
    );
}
