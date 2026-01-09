import React, { useState } from "react";
import type { EditorEntity } from "./types/Entity";
import { colors } from "./constants/colors";
import type { EditorState, SceneData } from "./EditorCore";

type Props = {
    core: EditorState;
    scenes: Map<string, SceneData>;
    currentSceneId: string;
    selectedId: string | null;
    onSelect: (entity: EditorEntity) => void;
};

export function HierarchyPanel({ core, scenes, currentSceneId, selectedId, onSelect }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState<"scene" | "entity" | null>(null);

    const handleSceneClick = (sceneId: string) => {
        if (core.getCurrentSceneId() !== sceneId) {
            core.switchScene(sceneId);
        }
        core.setSelectedEntity(null); // Always clear entity selection when clicking scene header
    };

    const handleAddScene = (e: React.MouseEvent) => {
        e.stopPropagation();

        let i = 1;
        let name = "";
        const existingNames = new Set(Array.from(scenes.values()).map(s => s.name));

        while (true) {
            name = `Scene ${i}`;
            if (!existingNames.has(name)) {
                break;
            }
            i++;
        }

        core.createScene(name);
    };

    const startEditing = (id: string, currentName: string, type: "scene" | "entity") => {
        setEditingId(id);
        setEditName(currentName);
        setEditType(type);
    };

    const saveName = () => {
        if (editingId && editName.trim()) {
            if (editType === "scene") {
                core.renameScene(editingId, editName.trim());
            } else if (editType === "entity") {
                // We need a way to rename entity via core
                // Ensure core has renameEntity or we modify directly
                const entity = core.getEntities().get(editingId);
                if (entity) {
                    // Start: Update entity name
                    // We can reuse addEntity to overwrite or need a specific update method
                    // core.addEntity will overwrite if ID exists
                    const updated = { ...entity, name: editName.trim() };
                    core.addEntity(updated);
                    // Also update selection to reflect new name if needed
                    if (core.getSelectedEntity()?.id === editingId) {
                        core.setSelectedEntity(updated);
                    }
                }
            }
        }
        setEditingId(null);
        setEditType(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Unified Header */}
            <div style={{
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                background: colors.bgTertiary,
                borderBottom: `1px solid ${colors.borderColor}`,
            }}>
                <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: colors.accentLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Hierarchy
                </span>
                <button
                    onClick={handleAddScene}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.textSecondary,
                        cursor: 'pointer',
                        fontSize: '16px', // Larger '+' sign
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                    }}
                    title="Add Scene"
                >
                    +
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {Array.from(scenes.values())
                    .sort((a, b) => a.name.localeCompare(b.name)) // Sort Scenes
                    .map((scene) => {
                        const isSceneActive = scene.id === currentSceneId;
                        const entities = Array.from(scene.entities.values())
                            .sort((a, b) => a.name.localeCompare(b.name)); // Sort Entities
                        const isEditingScene = editingId === scene.id && editType === "scene";

                        return (
                            <div key={scene.id} style={{ marginBottom: '2px' }}>
                                {/* Scene Header Node */}
                                <div
                                    onClick={() => handleSceneClick(scene.id)}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(scene.id, scene.name, "scene");
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '4px 8px',
                                        background: isSceneActive && !selectedId ? colors.bgInput : 'transparent', // Highlight scene only if no entity selected? Or always? Unity highlights scene if active.
                                        // Use subtle highlight for active scene, stronger for selection?
                                        // Let's stick to simple: Active scene text is white, others gray.
                                        // If we click scene header, we select the scene (and deselect entities).
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        color: isSceneActive ? '#fff' : colors.textSecondary,
                                        userSelect: 'none'
                                    }}
                                >
                                    <i className="fa-solid fa-folder-open" style={{ marginRight: '6px', fontSize: '14px', color: isSceneActive ? colors.accent : colors.textMuted }} />

                                    {isEditingScene ? (
                                        <input
                                            autoFocus
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={saveName}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveName();
                                                if (e.key === 'Escape') {
                                                    setEditingId(null);
                                                    setEditType(null);
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                background: colors.bgPrimary,
                                                border: `1px solid ${colors.accent}`,
                                                color: '#fff',
                                                padding: '2px',
                                                fontSize: '14px',
                                                width: '100%'
                                            }}
                                        />
                                    ) : (
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{scene.name}</span>
                                    )}
                                </div>

                                {/* Entities List */}
                                <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    {entities.map((e) => {
                                        const isEditingEntity = editingId === e.id && editType === "entity";
                                        return (
                                            <div
                                                key={e.id}
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    if (!isSceneActive) {
                                                        core.switchScene(scene.id);
                                                    }
                                                    onSelect(e);
                                                }}
                                                onDoubleClick={(ev) => {
                                                    ev.stopPropagation();
                                                    startEditing(e.id, e.name, "entity");
                                                }}
                                                style={{
                                                    fontSize: '14px',
                                                    background: (e.id === selectedId && isSceneActive) ? colors.bgSelected : 'transparent',
                                                    borderRadius: '3px',
                                                    color: e.id === selectedId ? '#fff' : colors.textPrimary,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    userSelect: 'none',
                                                    padding: '4px 8px'
                                                }}
                                            >
                                                <i className="fa-solid fa-cube" style={{ fontSize: '10px', marginRight: '6px', opacity: 0.7 }} />

                                                {isEditingEntity ? (
                                                    <input
                                                        autoFocus
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        onBlur={saveName}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveName();
                                                            if (e.key === 'Escape') {
                                                                setEditingId(null);
                                                                setEditType(null);
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            background: colors.bgPrimary,
                                                            border: `1px solid ${colors.accent}`,
                                                            color: '#fff',
                                                            padding: '0 2px',
                                                            fontSize: '12px',
                                                            width: '100%',
                                                            lineHeight: '1.2'
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
