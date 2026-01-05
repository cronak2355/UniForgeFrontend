import React, { createContext, useContext, useEffect, useState } from "react";
import { EditorState, editorCore } from "../editor/EditorCore";

const EditorCoreContext = createContext<EditorState>(editorCore);

export function EditorCoreProvider({ children }: { children: React.ReactNode }) {
    return <EditorCoreContext.Provider value={editorCore}>{children}</EditorCoreContext.Provider>;
}

export function useEditorCore(): EditorState {
    const ctx = useContext(EditorCoreContext);
    return ctx;
}

// 편리한 훅: EditorState를 구독하고 스냅샷을 반환
export function useEditorCoreSnapshot() {
    const core = useEditorCore();
    const [, setVersion] = useState(0);
    useEffect(() => {
        const unsub = core.subscribe(() => setVersion((v) => v + 1));
        return () => {
            unsub();
        };
    }, [core]);

    return {
        core,
        assets: Array.from(core.getAssets()),
        entities: Array.from(core.getEntities().values()),
        tiles: Array.from(core.getTiles().values()),
        selectedAsset: core.getSelectedAsset(),
        draggedAsset: core.getDraggedAsset(),
        selectedEntity: core.getSelectedEntity(),
        editorMode: core.getEditorMode(),

    };
}
