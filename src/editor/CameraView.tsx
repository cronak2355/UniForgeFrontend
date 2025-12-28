import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { EditorScene } from "./EditorScene";
import type { EditorEntity } from "./EditorState";

type Props = {
    entities: EditorEntity[];
    onCreateEntity: (e: EditorEntity) => void;
    onMoveEntity: (id: string, x: number, y: number) => void;
};

export function CameraView({ entities, onCreateEntity, onMoveEntity }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<EditorScene | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new EditorScene();
        sceneRef.current = scene;

        const game = new Phaser.Game({
            type: Phaser.CANVAS,
            parent: containerRef.current,
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            backgroundColor: "#020617",
            scene,
        });

        scene.onEntityMove = onMoveEntity;

        const resizeObserver = new ResizeObserver(() => {
            if (!containerRef.current) return;
            game.scale.resize(
                containerRef.current.clientWidth,
                containerRef.current.clientHeight
            );
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            game.destroy(true);
        };
    }, []);

    useEffect(() => {
        sceneRef.current?.syncEntities(entities);
    }, [entities]);

    return (
        <div
            className="editor-camera"
            onDragOver={(e) => {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                sceneRef.current?.showGhost(
                    e.clientX - rect.left,
                    e.clientY - rect.top
                );
            }}
            onDragLeave={() => {
                sceneRef.current?.hideGhost();
            }}
            onDrop={(e) => {
                e.preventDefault();
                sceneRef.current?.hideGhost();

                const raw = e.dataTransfer.getData("application/editor-entity");
                if (!raw) return;

                const asset = JSON.parse(raw);
                const rect = e.currentTarget.getBoundingClientRect();

                onCreateEntity({
                    id: crypto.randomUUID(),
                    type: asset.type,
                    name: asset.type,
                    preview: asset.preview,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }}
        >
            <div className="editor-camera-header">Camera</div>
            <div className="editor-camera-viewport" ref={containerRef} />
        </div>
    );
}
