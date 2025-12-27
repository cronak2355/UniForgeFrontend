import React, { useRef, useState } from "react";
import { PhaserCanvas } from "./PhaserCanvas";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./InspectorPanel";
import { AssetPanel } from "./AssetPanel";


export type EditorEntity = {
    id: string;
    name: string;
    x: number;
    y: number;
};


export default function EditorLayout() {
    const [entities, setEntities] = useState<EditorEntity[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);


    return (
        <div className="w-screen h-screen bg-black text-white flex flex-col">
            <div className="h-10 flex items-center px-3 border-b border-white">UNIFORGE</div>


            <div className="flex flex-1">
                <HierarchyPanel
                    entities={entities}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />


                <PhaserCanvas
                    entities={entities}
                    setEntities={setEntities}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                />


                <InspectorPanel
                    entity={entities.find(e => e.id === selectedId) ?? null}
                />
            </div>


            <AssetPanel />
        </div>
    );
}