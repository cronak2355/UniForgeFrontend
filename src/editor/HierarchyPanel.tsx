import React, { useState, useEffect } from "react";
import type { EditorEntity } from "./types/Entity";
import { colors } from "./constants/colors";
import type { EditorState, SceneData } from "./EditorCore";

type Props = {
    core: EditorState;
    scenes: Map<string, SceneData>;
    currentSceneId: string;
    selectedId: string | null;
    onSelect: (entity: EditorEntity) => void;
    runtimeCore?: any;
};

const MenuOption = ({ label, onClick }: { label: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: colors.textPrimary,
            cursor: 'pointer',
            padding: '6px 8px',
            textAlign: 'left',
            fontSize: '12px',
            borderRadius: '3px',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = colors.bgInput}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
        {label}
    </button>
);

export function HierarchyPanel({ core, scenes, currentSceneId, selectedId, onSelect, runtimeCore }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState<"scene" | "entity" | null>(null);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);

    // Runtime Sync
    const [runtimeEntities, setRuntimeEntities] = useState<any[]>([]);

    useEffect(() => {
        if (!runtimeCore) return;

        const sync = () => {
            const ctx = runtimeCore.getRuntimeContext();
            if (ctx && ctx.entities) {
                setRuntimeEntities(Array.from(ctx.entities.values()));
            }
        };

        sync();
        const interval = setInterval(sync, 500);
        return () => clearInterval(interval);
    }, [runtimeCore]);

    const handleSceneClick = (sceneId: string) => {
        if (core.getCurrentSceneId() !== sceneId) {
            core.switchScene(sceneId);
        }
        core.setSelectedEntity(null);
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
                const entity = core.getEntities().get(editingId);
                if (entity) {
                    const updated = { ...entity, name: editName.trim() };
                    core.addEntity(updated);
                    if (core.getSelectedEntity()?.id === editingId) {
                        core.setSelectedEntity(updated);
                    }
                }
            }
        }
        setEditingId(null);
        setEditType(null);
    };

    // Generic UI Entity Creator
    const createUIEntity = (type: "text" | "button" | "panel" | "scrollPanel" | "image" | "bar") => {
        const id = crypto.randomUUID();
        let name = "UI Element";
        let variables: any[] = [
            { id: crypto.randomUUID(), name: "isUI", type: "bool", value: true },
            { id: crypto.randomUUID(), name: "uiType", type: "string", value: type },
            { id: crypto.randomUUID(), name: "z", type: "float", value: 100 }, // Default High Z
        ];

        // Default transform
        const transform = {
            x: 400, y: 300, z: 100,
            rotation: 0, rotationX: 0, rotationY: 0, rotationZ: 0,
            scaleX: 1, scaleY: 1
        };

        switch (type) {
            case "text":
                name = "New Text";
                variables.push(
                    { id: crypto.randomUUID(), name: "uiText", type: "string", value: "New Text" },
                    { id: crypto.randomUUID(), name: "uiFontSize", type: "string", value: "24px" },
                    { id: crypto.randomUUID(), name: "uiColor", type: "string", value: "#ffffff" }
                );
                break;
            case "button":
                name = "New Button";
                variables.push(
                    { id: crypto.randomUUID(), name: "width", type: "float", value: 120 },
                    { id: crypto.randomUUID(), name: "height", type: "float", value: 40 },
                    { id: crypto.randomUUID(), name: "uiText", type: "string", value: "Button" },
                    { id: crypto.randomUUID(), name: "uiBackgroundColor", type: "string", value: "#3498db" },
                    { id: crypto.randomUUID(), name: "uiColor", type: "string", value: "#ffffff" },
                    { id: crypto.randomUUID(), name: "uiFontSize", type: "string", value: "16px" }
                );
                break;
            case "panel":
                name = "New Panel";
                variables.push(
                    { id: crypto.randomUUID(), name: "width", type: "float", value: 300 },
                    { id: crypto.randomUUID(), name: "height", type: "float", value: 200 },
                    { id: crypto.randomUUID(), name: "uiBackgroundColor", type: "string", value: "#2c3e50" }
                );
                break;
            case "scrollPanel":
                name = "Scroll Panel";
                variables.push(
                    { id: crypto.randomUUID(), name: "width", type: "float", value: 200 },
                    { id: crypto.randomUUID(), name: "height", type: "float", value: 300 },
                    { id: crypto.randomUUID(), name: "uiBackgroundColor", type: "string", value: "#34495e" },
                    { id: crypto.randomUUID(), name: "contentHeight", type: "float", value: 600 } // Virtual height
                );
                break;
            case "image":
                name = "New Image";
                variables.push(
                    { id: crypto.randomUUID(), name: "width", type: "float", value: 100 },
                    { id: crypto.randomUUID(), name: "height", type: "float", value: 100 }
                );
                break;
            case "bar":
                name = "New Bar";
                variables.push(
                    { id: crypto.randomUUID(), name: "width", type: "float", value: 200 },
                    { id: crypto.randomUUID(), name: "height", type: "float", value: 20 },
                    { id: crypto.randomUUID(), name: "uiBackgroundColor", type: "string", value: "#333333" },
                    { id: crypto.randomUUID(), name: "uiBarColor", type: "string", value: "#e74c3c" },
                    // Placeholder binding vars, to be set in Inspector
                    { id: crypto.randomUUID(), name: "uiSourceEntity", type: "string", value: "" },
                    { id: crypto.randomUUID(), name: "uiValueVar", type: "string", value: "hp" },
                    { id: crypto.randomUUID(), name: "uiMaxVar", type: "string", value: "maxHp" }
                );
                break;
        }

        const entity: EditorEntity = {
            id,
            name,
            type: "container",
            role: "none",
            events: [],
            ...transform,
            variables,
            components: [],
            logic: []
        };
        core.addEntity(entity);
        setShowTemplateMenu(false);
        onSelect(entity);
    };

    if (runtimeCore) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: colors.error, // Red header for runtime
                    borderBottom: `1px solid ${colors.borderColor}`,
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '11px',
                    letterSpacing: '0.5px'
                }}>
                    RUNTIME HIERARCHY ({runtimeEntities.length})
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                    {runtimeEntities.map(e => (
                        <div
                            key={e.id}
                            onClick={() => {
                                // Select logic if needed, might need mapping to editor entity structure
                                // For now just simple select
                                onSelect(e);
                            }}
                            style={{
                                fontSize: '14px',
                                background: e.id === selectedId ? 'rgba(255,255,255,0.2)' : 'transparent',
                                borderRadius: '3px',
                                color: e.id === selectedId ? '#fff' : colors.textPrimary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                userSelect: 'none',
                                padding: '4px 8px'
                            }}
                        >
                            <span style={{ fontSize: '10px', marginRight: '6px', opacity: 0.7 }}>
                                {e.type === 'container' ? '?벀' : '?쭒'}
                            </span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {e.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

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
                <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                    {/* Template Menu Button */}
                    <button
                        onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: colors.accent,
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 6px',
                            borderRadius: '3px',
                        }}
                        title="Add UI Template"
                    >
                        ⚡ UI
                    </button>
                    {showTemplateMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            background: colors.bgSecondary,
                            border: `1px solid ${colors.borderColor}`,
                            borderRadius: '4px',
                            padding: '4px',
                            zIndex: 100,
                            minWidth: '140px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        }}>
                            <MenuOption onClick={() => createUIEntity("text")} label="📝 Text" />
                            <MenuOption onClick={() => createUIEntity("button")} label="🔘 Button" />
                            <MenuOption onClick={() => createUIEntity("panel")} label="🔲 Panel" />
                            <MenuOption onClick={() => createUIEntity("scrollPanel")} label="📜 Scroll Panel" />
                            <MenuOption onClick={() => createUIEntity("image")} label="🖼️ Image" />
                            <MenuOption onClick={() => createUIEntity("bar")} label="📊 Bar" />
                        </div>
                    )}
                    <button
                        onClick={handleAddScene}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: colors.textSecondary,
                            cursor: 'pointer',
                            fontSize: '16px',
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
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {/* Global Entities Section */}
                <div style={{ marginBottom: '8px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: colors.textSecondary,
                        userSelect: 'none'
                    }}>
                        <i className="fa-solid fa-globe" style={{ marginRight: '6px', fontSize: '14px', color: colors.accent }} />
                        <span>Global</span>
                    </div>
                    <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {Array.from(core.getGlobalEntities().values()).map((ge) => {
                            const isSelected = ge.id === selectedId;
                            const isEditingGlobal = editingId === ge.id && editType === "entity";
                            return (
                                <div
                                    key={ge.id}
                                    onClick={(ev) => {
                                        ev.stopPropagation();
                                        onSelect(ge);
                                    }}
                                    onDoubleClick={(ev) => {
                                        ev.stopPropagation();
                                        startEditing(ge.id, ge.name, "entity");
                                    }}
                                    style={{
                                        fontSize: '14px',
                                        background: isSelected ? colors.bgSelected : 'transparent',
                                        borderRadius: '3px',
                                        color: isSelected ? '#fff' : colors.textPrimary,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        userSelect: 'none',
                                        padding: '4px 8px'
                                    }}
                                >
                                    <i className="fa-solid fa-database" style={{ fontSize: '10px', marginRight: '6px', opacity: 0.7, color: colors.accent }} />
                                    {isEditingGlobal ? (
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
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ge.name}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scenes */}
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
                                        const isUIEntity = e.variables?.find((v: any) => v.name === "isUI")?.value === true;
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
                                                onDragOver={(ev) => {
                                                    if (isUIEntity) {
                                                        ev.preventDefault();
                                                        ev.dataTransfer.dropEffect = "link";
                                                    }
                                                }}
                                                onDrop={(ev) => {
                                                    ev.preventDefault();
                                                    if (!isUIEntity) return;
                                                    const data = ev.dataTransfer.getData("text/plain");
                                                    const [sourceEntityId, varName] = data.split("|");
                                                    if (!sourceEntityId || !varName) return;

                                                    // Update the UI entity to link to the dropped variable
                                                    let vars = e.variables.filter((v: any) =>
                                                        !["uiSourceEntity", "uiValueVar"].includes(v.name)
                                                    );
                                                    vars.push({ id: crypto.randomUUID(), name: "uiSourceEntity", type: "string", value: sourceEntityId });
                                                    vars.push({ id: crypto.randomUUID(), name: "uiValueVar", type: "string", value: varName });
                                                    core.addEntity({ ...e, variables: vars });
                                                    onSelect({ ...e, variables: vars });
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
                                                    padding: '4px 8px',
                                                    border: isUIEntity ? '1px dashed transparent' : 'none',
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
