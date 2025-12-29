import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { EditorScene } from "./EditorScene";
import type { EditorEntity } from "./EditorState";

type Props = {
    entities: EditorEntity[];
    onCreateEntity: (e: EditorEntity) => void;
};

export function CameraView({ entities, onCreateEntity }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<EditorScene | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new EditorScene();
        sceneRef.current = scene;

        const game = new Phaser.Game({
            type: Phaser.CANVAS,
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            parent: containerRef.current,
            scene,
            backgroundColor: "#020617",
        });

        return () => {
            game.destroy(true);
        };
    }, []);

    useEffect(() => {
        sceneRef.current?.syncEntities(entities);
    }, [entities]);

    return (
        <div
            className="editor-camera"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();

                const raw = e.dataTransfer.getData(
                    "application/editor-entity"
                );
                if (!raw) return;

                const asset = JSON.parse(raw);
                const rect = e.currentTarget.getBoundingClientRect();

                onCreateEntity({
                    id: crypto.randomUUID(),
                    type: asset.type,
                    preview: asset.preview,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    name: asset.name
                });
            }}

        >
            <div className="editor-camera-header">Camera</div>
            <div className="editor-camera-viewport" ref={containerRef} />
        </div>
    );
}
