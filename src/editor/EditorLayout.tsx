import { useState } from "react";
import type { SceneState, EditorEntity } from "./EditorState";
import { HierarchyPanel } from "./HierarchyPanel";
import { CameraView } from "./CameraView";
import { AssetPanel } from "./AssetPanel";
import { InspectorPanel } from "./InspectorPanel";

const initialScene: SceneState = {
    entities: [],
};

export function EditorLayout() {
    const [scene, setScene] = useState<SceneState>(initialScene);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const addEntity = (entity: Omit<EditorEntity, "name">) => {
        setScene((prev) => {
            const sameTypeCount = prev.entities.filter(
                (e) => e.type === entity.type
            ).length;

            const name =
                sameTypeCount === 0
                    ? entity.type
                    : `${entity.type} (${sameTypeCount})`;

            return {
                ...prev,
                entities: [
                    ...prev.entities,
                    {
                        ...entity,
                        name,
                    },
                ],
            };
        });
    };


    return (
        <div className="editor-root">
            {/* TopBar */}
            <div className="editor-topbar">
                <span>file</span>
                <span>assets</span>
                <span>edit</span>
            </div>

            {/* Main */}
            <div className="editor-main">
                <div className="editor-panel">
                    <div className="editor-panel-header">Hierarchy</div>
                    <HierarchyPanel
                        entities={scene.entities}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                </div>

                <CameraView
                    entities={scene.entities}
                    onCreateEntity={addEntity}
                />

                <div className="editor-panel right">
                    <div className="editor-panel-header">Inspector</div>
                    <InspectorPanel
                        selectedId={selectedId}
                        entities={scene.entities}
                    />
                </div>

            </div>

            {/* Bottom */}
            <AssetPanel />
        </div>
    );
}
