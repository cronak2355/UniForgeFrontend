import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Asset } from "./types/Asset";
import type { ModuleGraph } from "./types/Module";
import { createDefaultModuleGraph } from "./types/Module";
import { ModuleGraphEditor } from "./modules/ModuleGraphEditor";
import { colors } from "./constants/colors";

// --- Enhanced Colors & Styles ---
const THEME = {
    bg: "#0f0f10", // Deeper dark
    bgHeader: "#1a1a1c",
    border: "#2a2a2e",
    accent: "#3b82f6", // Blue accent
    accentHover: "#2563eb",
    text: "#e4e4e7",
    textDim: "#a1a1aa",
    itemBg: "#18181b",
    itemHover: "#27272a",
};

type Props = {
    changeSelectedAsset: (selectedAsset: Asset | null) => void;
    assets: Asset[];
    changeDraggedAsset: (asset: Asset | null, options?: { defer?: boolean }) => void;
    modules: ModuleGraph[];
    addModule: (module: ModuleGraph) => void;
    updateModule: (module: ModuleGraph) => void;
    selectedEntityVariables: AssetPanelVars;
    actionLabels: Record<string, string>;
    onCreateVariable?: (name: string, value: unknown, type?: "int" | "float" | "string" | "bool") => void;
    onUpdateVariable?: (name: string, value: unknown, type?: "int" | "float" | "string" | "bool") => void;
    onDeleteAsset?: (asset: Asset) => void;
};

type AssetPanelVars = Array<{ id: string; name: string; type: string; value: number | string | boolean }>;

export function AssetPanelNew({
    changeSelectedAsset,
    assets,
    changeDraggedAsset,
    modules,
    addModule,
    updateModule,
    selectedEntityVariables,
    actionLabels,
    onCreateVariable,
    onUpdateVariable,
    onDeleteAsset,
}: Props) {
    const [currentTag, setCurrentTag] = useState<string>("Character");
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const dragStateRef = useRef<{ asset: Asset; startX: number; startY: number; hasDragged: boolean } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; asset: Asset } | null>(null);
    const navigate = useNavigate();
    const { gameId } = useParams();

    // --- Drag Logic (Preserved) ---
    const clearDragListeners = () => {
        window.removeEventListener("pointermove", onGlobalPointerMove);
        window.removeEventListener("pointerup", onGlobalPointerUp);
        dragStateRef.current = null;
    };

    const onGlobalPointerMove = (e: PointerEvent) => {
        const state = dragStateRef.current;
        if (!state || state.hasDragged) return;
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        if (Math.hypot(dx, dy) < 5) return;
        state.hasDragged = true;
        changeDraggedAsset(state.asset);
    };

    const onGlobalPointerUp = () => {
        const state = dragStateRef.current;
        if (state?.hasDragged) {
            changeDraggedAsset(null, { defer: true });
        }
        clearDragListeners();
    };

    // Default Categories + Modules
    // Reordered to prioritize most used
    const tabs = [
        { id: "Character", label: "Characters", icon: "fa-person" },
        { id: "Tile", label: "Tiles", icon: "fa-cubes" },
        { id: "Particle", label: "FX", icon: "fa-wand-magic-sparkles" },
        { id: "Prefab", label: "Prefabs", icon: "fa-cube" },
        { id: "Modules", label: "Logic Modules", icon: "fa-network-wired" }
    ];

    const handleTileClick = (asset: Asset) => {
        changeSelectedAsset(asset);
    };

    return (
        <div style={{
            background: THEME.bg,
            // borderTop: `1px solid ${THEME.border}`, // Remove top border if in sidebar? Keep for separation
            height: "100%", // Fill container
            display: "flex",
            flexDirection: "column",
            overflow: "hidden" // Ensure internal scroll works
        }}>

            {/* Header / Tabs */}
            <div style={{
                display: 'flex',
                flexDirection: 'column', // Changed to column for stacked layout
                background: THEME.bgHeader,
                borderBottom: `1px solid ${THEME.border}`,
                flexShrink: 0
            }}>
                {/* Title Row */}
                <div style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: `1px solid ${THEME.border}` // Separator
                }}>
                    <i className="fa-solid fa-layer-group text-blue-500"></i>
                    Assets
                </div>

                {/* Tabs Row (Scrollable) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 4px', // Adjusted padding
                    gap: '8px',
                    overflowX: 'auto', // Horizontal scroll
                    scrollbarWidth: 'none',
                    whiteSpace: 'nowrap'
                }}>
                    <style>{`
                /* Hide scrollbar for Chrome/Safari */
                .hide-scroll::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

                    {tabs.map((tab) => {
                        const isActive = currentTag === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentTag(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '13px',
                                    fontWeight: isActive ? 600 : 500,
                                    color: isActive ? '#fff' : THEME.textDim,
                                    background: isActive ? '#2563eb' : 'transparent', // Blue pill active
                                    border: 'none',
                                    borderRadius: '8px', // Pill shape
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        e.currentTarget.style.color = THEME.text;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = THEME.textDim;
                                    }
                                }}
                            >
                                <i className={`fa-solid ${tab.icon}`}></i>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="custom-scrollbar">

                {currentTag !== "Modules" ? (
                    /* Asset Grid */
                    assets.filter((asset) => asset.tag === currentTag).length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: THEME.textDim, gap: '12px' }}>
                            <i className="fa-solid fa-folder-open" style={{ fontSize: '32px', opacity: 0.3 }}></i>
                            <p>No assets found in this category</p>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', // Larger grid cells
                                gap: '16px',
                            }}
                            onClick={(e) => {
                                if (e.target === e.currentTarget) changeSelectedAsset(null);
                            }}
                        >
                            {assets
                                .filter((asset) => asset.tag === currentTag)
                                .map((asset) => (
                                    <div
                                        key={`${asset.id}-${asset.url}`}
                                        title={asset.name}
                                        style={{
                                            position: 'relative',
                                            aspectRatio: '1/1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: THEME.itemBg,
                                            border: `1px solid ${THEME.border}`,
                                            borderRadius: '12px',
                                            cursor: 'grab',
                                            transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = THEME.accent;
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                                            e.currentTarget.style.background = THEME.itemHover;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = THEME.border;
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.background = THEME.itemBg;
                                        }}
                                        onPointerDown={(e) => {
                                            if (asset.tag === "Tile") return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Visual feedback for grab
                                            e.currentTarget.style.cursor = 'grabbing';

                                            dragStateRef.current = { asset, startX: e.clientX, startY: e.clientY, hasDragged: false };
                                            window.addEventListener("pointermove", onGlobalPointerMove);
                                            window.addEventListener("pointerup", onGlobalPointerUp);
                                        }}
                                        onPointerUp={(e) => { e.currentTarget.style.cursor = 'grab'; }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            if (asset.tag === "Tile") return;
                                            setContextMenu({ x: e.clientX, y: e.clientY, asset });
                                        }}
                                        onClick={() => handleTileClick(asset)}
                                    >
                                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                                            <img
                                                src={asset.url}
                                                alt={asset.name}
                                                draggable={false}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '100%',
                                                    objectFit: 'contain',
                                                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                                                }}
                                            />
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            padding: '6px 8px',
                                            fontSize: '11px',
                                            color: THEME.textDim,
                                            textAlign: 'center',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderTop: `1px solid ${THEME.border}`
                                        }}>
                                            {asset.name}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )
                ) : (
                    /* Modules List */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            style={{
                                alignSelf: 'flex-start',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 600,
                                background: THEME.accent,
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px'
                            }}
                            onClick={() => {
                                const next = createDefaultModuleGraph();
                                next.name = `Module ${modules.length + 1}`;
                                addModule(next);
                                setActiveModuleId(next.id);
                            }}
                        >
                            <i className="fa-solid fa-plus"></i> New Logic Module
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {modules.map((module) => (
                                <div
                                    key={module.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: `1px solid ${THEME.border}`,
                                        background: THEME.itemBg,
                                        fontSize: '13px',
                                        color: THEME.text
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                                            <i className="fa-solid fa-microchip"></i>
                                        </div>
                                        <span>{module.name}</span>
                                    </div>
                                    <button
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            background: 'transparent',
                                            border: `1px solid ${THEME.border}`,
                                            borderRadius: '6px',
                                            color: THEME.textDim,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.color = THEME.accent; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textDim; }}
                                        onClick={() => setActiveModuleId(module.id)}
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Module Editor Modal */}
            {currentTag === "Modules" && activeModuleId && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 3000,
                        padding: 24,
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setActiveModuleId(null)}
                >
                    <div
                        style={{
                            width: "90vw",
                            height: "85vh",
                            background: "#121212",
                            border: `1px solid ${THEME.border}`,
                            borderRadius: "16px",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px 24px",
                                borderBottom: `1px solid ${THEME.border}`,
                                background: "#18181b",
                            }}
                        >
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-pen-to-square text-blue-500"></i>
                                Editor: {modules.find((m) => m.id === activeModuleId)?.name ?? "Module"}
                            </div>
                            <button
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: THEME.textDim,
                                    cursor: "pointer",
                                    fontSize: 14,
                                    padding: '8px',
                                    borderRadius: '50%',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = THEME.textDim; }}
                                onClick={() => setActiveModuleId(null)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            {modules
                                .filter((m) => m.id === activeModuleId)
                                .map((module) => (
                                    <ModuleGraphEditor
                                        key={module.id}
                                        module={module}
                                        variables={selectedEntityVariables as any}
                                        modules={modules}
                                        actionLabels={actionLabels}
                                        onCreateVariable={onCreateVariable as any}
                                        onUpdateVariable={onUpdateVariable as any}
                                        onChange={(next) => updateModule(next)}
                                    />
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
                    onClick={() => setContextMenu(null)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
                >
                    <div style={{
                        position: 'absolute',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        background: '#18181b', // Darker menu
                        border: `1px solid ${THEME.border}`,
                        borderRadius: '8px',
                        padding: '4px',
                        minWidth: '140px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                            Actions
                        </div>
                        <div
                            style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                borderRadius: '6px',
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = THEME.accent}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                                const url = `/assets-editor?assetId=${contextMenu.asset.id}${gameId ? `&gameId=${gameId}` : ''}`;
                                navigate(url);
                            }}
                        >
                            <i className="fa-solid fa-pencil"></i> Edit Asset
                        </div>
                        {/* Future actions here */}
                        <div
                            style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                color: '#ef4444', // Red for delete/remove logic if added
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                borderRadius: '6px',
                                marginTop: '2px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                                if (confirm(`Are you sure you want to delete "${contextMenu.asset.name}"?`)) {
                                    onDeleteAsset?.(contextMenu.asset);
                                }
                                setContextMenu(null);
                            }}
                        >
                            <i className="fa-solid fa-trash"></i> Delete
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

