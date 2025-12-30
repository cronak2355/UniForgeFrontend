import { useState } from "react";
//import type { SceneState } from "./EditorState";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { AssetPanel } from "./AssetPanel";
import type { EditorEntity } from "./types/Entity"
import type { Asset } from "./types/Asset";
import { PhaserCanvas } from "./PhaserCanvas";
//import { InspectorPanel } from "./InspectorPanel";

//const initialScene: SceneState = { entities: [] };


export default function EditorLayout() {
    const [entities] = useState<EditorEntity[]>([]);

    //    const [scene, setScene] = useState<SceneState>(initialScene);

    const [selectedEntity, setSelectedEntity] = useState<EditorEntity | null>(null);
    //    const [assets, setAssets] = useState<Asset[]>([
    const [assets, _setAssets] = useState<Asset[]>([
        {
            id: 0,
            name: "testAsset1",
            tag: "Tile",
            url: "TestAsset.webp",
            idx: -1
        },
        {
            id: 1,
            name: "testAsset2",
            tag: "Tile",
            url: "TestAsset2.webp",
            idx: -1
        },
        {
            id: 2,
            name: "testAsset3",
            tag: "Tile",
            url: "TestAsset3.webp",
            idx: -1
        },
        {
            id: 3,
            name: "placeholder",
            tag: "Character",
            url: "placeholder.png",
            idx: -1
        },
        {
            id: 4,
            name: "dragon",
            tag: "Character",
            url: "RedDragon.webp",
            idx: -1
        },
    ]);
    const [draggedgAsset, setDraggedgAsset] = useState<Asset | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const changeSelectedAsset = (asset: Asset | null) => {
        if (asset == selectedAsset) {
            setSelectedAsset(null)
            return;
        }
        setSelectedAsset(asset)
    }
    const changeDraggAsset = (
        asset: Asset | null,
        options?: { defer?: boolean }) => {
        if (options?.defer) {
            requestAnimationFrame(() => {
                setDraggedgAsset(asset);
            });
        } else {
            setDraggedgAsset(asset);
        }
    };
    //    const handleUpdateEntity = (updated: EditorEntity) => {
    //        setEntities(prev =>
    //            prev.map(e => (e.id === updated.id ? updated : e))
    //        );
    //    };

    //    const addEntity = (entity: EditorEntity) => {
    //        setScene((prev) => {
    //            const sameTypeCount = prev.entities.filter(
    //                (e) => e.type === entity.type
    //            ).length;
    //
    //            const name =
    //                sameTypeCount === 0
    //                    ? entity.type
    //                    : `${entity.type} (${sameTypeCount})`;
    //
    //            return {
    //                entities: [...prev.entities, { ...entity, name }],
    //            };
    //        });
    //    };

    //    const moveEntity = (id: string, x: number, y: number) => {
    //        setScene((prev) => ({
    //            entities: prev.entities.map((e) =>
    //                e.id === id ? { ...e, x, y } : e
    //            ),
    //        }));
    //    };

    return (
        <div className="w-screen h-screen bg-black text-white flex flex-col">
            <div className="h-10 flex items-center px-3 border-b border-white">UNIFORGE</div>
            <div className="editor-root">
                <div className="editor-topbar">
                    <span>file</span>
                    <span>assets</span>
                    <span>edit</span>
                </div>

                <div className="editor-main">
                    <div className="editor-panel">
                        <div className="editor-panel-header">Hierarchy</div>
                        <HierarchyPanel
                            entities={entities}
                            selectedId={selectedEntity ? selectedEntity!.id : null}
                            onSelect={setSelectedEntity}
                        />
                    </div>

                    {/* <CameraView
                        entities={scene.entities}
                        onCreateEntity={addEntity}
                        onMoveEntity={moveEntity}
                    /> */}
                    <PhaserCanvas
                        assets={assets}
                        selected_asset={selectedAsset}
                        draggedAsset={draggedgAsset}
                        addEntity={(entity) => {
                            console.log("🟣 [EditorLayout] selected entity:", entity);
                            setSelectedEntity(entity);
                        }}
                    />

                    <div className="editor-panel right">
                        <div className="editor-panel-header">Inspector</div>
                        <InspectorPanel
                            entity={selectedEntity}
                            onUpdateEntity={(updatedEntity) => {
                                console.log("UPDATED ENTITY", updatedEntity);
                                setSelectedEntity(updatedEntity);
                            }}
                        />
                    </div>
                </div>
                <AssetPanel
                    assets={assets}
                    changeSelectedAsset={changeSelectedAsset}
                    changeDraggAsset={changeDraggAsset} />
            </div>
        </div>
    );
}
