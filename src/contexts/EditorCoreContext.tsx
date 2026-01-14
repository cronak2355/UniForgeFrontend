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
        assets: Array.from(typeof core.getAssets === "function" ? core.getAssets() : []),
        modules: Array.from(typeof core.getModules === "function" ? core.getModules() : []),
        entities: Array.from(typeof core.getEntities === "function" ? core.getEntities().values() : []),
        tiles: Array.from(typeof core.getTiles === "function" ? core.getTiles().values() : []),
        scenes: typeof core.getScenes === "function" ? core.getScenes() : new Map(),
        currentSceneId: typeof core.getCurrentSceneId === "function" ? core.getCurrentSceneId() : "default",

        selectedAsset: typeof core.getSelectedAsset === "function" ? core.getSelectedAsset() : null,
        draggedAsset: typeof core.getDraggedAsset === "function" ? core.getDraggedAsset() : null,
        selectedEntity: typeof core.getSelectedEntity === "function" ? core.getSelectedEntity() : null,
        editorMode: typeof core.getEditorMode === "function" ? core.getEditorMode() : undefined,
        aspectRatio: typeof core.getAspectRatio === "function" ? core.getAspectRatio() : "1280x720",
    };
}
