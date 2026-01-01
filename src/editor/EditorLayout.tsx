import { useState, useEffect } from "react";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { AssetPanel } from "./AssetPanel";
import type { EditorEntity } from "./types/Entity"
// Asset type imported via snapshot in hook; no direct type import needed here
import { PhaserCanvas } from "./PhaserCanvas";
import "./styles.css";
import { EditorCoreProvider, useEditorCoreSnapshot, useEditorCore } from "../contexts/EditorCoreContext";
import type { EditorContext } from "./EditorCore";
import { CameraMode, DragDropMode } from "./editorMode/editorModes";

// Entry Style Color Palette
const colors = {
    bgPrimary: '#0d1117',      // 메인 배경 (깊은 검정)
    bgSecondary: '#161b22',    // 패널 배경
    bgTertiary: '#21262d',     // 호버/입력 배경
    borderColor: '#30363d',    // 기본 테두리
    borderAccent: '#1f6feb',   // 파란색 액센트 테두리
    accentBlue: '#1f6feb',     // 주 파란색
    accentLight: '#58a6ff',    // 밝은 파란색
    textPrimary: '#f0f6fc',    // 기본 텍스트
    textSecondary: '#8b949e',  // 부가 텍스트
};

export default function EditorLayout() {
    return (
        <EditorCoreProvider>
            <EditorLayoutInner />
        </EditorCoreProvider>
    );
}

function EditorLayoutInner() {
    const { core, assets, entities, selectedAsset, draggedAsset, selectedEntity } = useEditorCoreSnapshot();
    const coreDirect = useEditorCore();

    const changeSelectedAssetHandler = (a: any) => {
        core.setSelectedAsset(a);
        const cm = new CameraMode();
        const ctx: EditorContext = { currentMode: cm, currentSelectedAsset: a ?? undefined, mouse: "mousemove" };
        core.sendContextToEditorModeStateMachine(ctx);
    };

    const changeDraggedAssetHandler = (a: any) => {
        core.setDraggedAsset(a);
        if (a == null) {
            const cm = new CameraMode();
            core.sendContextToEditorModeStateMachine({ currentMode: cm, mouse: "mouseup" });
            return;
        }
        const dm = new DragDropMode();
        dm.asset = a;
        core.sendContextToEditorModeStateMachine({ currentMode: dm, currentDraggingAsset: a, mouse: "mousedown" });
    };

    const [localSelectedEntity, setLocalSelectedEntity] = useState<EditorEntity | null>(selectedEntity);

    // keep local selection in sync with core selection
    useEffect(() => {
        setLocalSelectedEntity(selectedEntity);
    }, [selectedEntity]);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: colors.bgPrimary,
            color: colors.textPrimary,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        }}>
            {/* ===== HEADER BAR ===== */}
            <div style={{
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                background: colors.bgSecondary,
                borderBottom: `1px solid ${colors.borderColor}`,
            }}>
                {/* Logo with Cube Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Blue Cube SVG Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" fill={colors.borderAccent} />
                        <path d="M12 2L3 7L12 12L21 7L12 2Z" fill={colors.accentLight} />
                        <path d="M12 12V22L3 17V7L12 12Z" fill={colors.borderAccent} opacity="0.8" />
                        <path d="M12 12V22L21 17V7L12 12Z" fill={colors.borderAccent} opacity="0.6" />
                    </svg>
                    <span style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: colors.textPrimary,
                        letterSpacing: '0.3px',
                    }}>
                        Uniforge
                    </span>
                </div>
            </div>

            {/* ===== TOP MENU BAR ===== */}
            <div style={{
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 12px',
                background: colors.bgSecondary,
                borderBottom: `1px solid ${colors.borderColor}`,
            }}>
                {['File', 'Edit', 'Assets', 'View'].map((menu) => (
                    <span
                        key={menu}
                        style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            color: colors.textSecondary,
                            cursor: 'pointer',
                            borderRadius: '4px',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.bgTertiary;
                            e.currentTarget.style.color = colors.textPrimary;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = colors.textSecondary;
                        }}
                    >
                        {menu}
                    </span>
                ))}
            </div>

            {/* ===== MAIN EDITOR AREA ===== */}
            <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
            }}>
                {/* LEFT PANEL - Hierarchy */}
                <div style={{
                    width: '200px',
                    background: colors.bgSecondary,
                    borderRight: `2px solid ${colors.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        background: colors.bgTertiary,
                        borderBottom: `1px solid ${colors.borderColor}`,
                        fontSize: '11px',
                        fontWeight: 600,
                        color: colors.accentLight,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Hierarchy
                    </div>
                    <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
                        <HierarchyPanel
                            entities={entities}
                            selectedId={selectedEntity?.id ?? null}
                            onSelect={(e) => {
                                core.setSelectedEntity(e as any);
                                setLocalSelectedEntity(e as any);
                                const cm = new CameraMode();
                                const ctx: EditorContext = { currentMode: cm, currentSelecedEntity: e as any, mouse: "mousedown" };
                                core.sendContextToEditorModeStateMachine(ctx);
                            }}
                        />
                    </div>
                </div>

                {/* CENTER - Phaser Canvas */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: colors.bgPrimary,
                    overflow: 'hidden',
                }}>
                    <PhaserCanvas
                        assets={assets}
                        selected_asset={selectedAsset}
                        draggedAsset={draggedAsset}
                        addEntity={(entity) => {
                            console.log("🟣 [EditorLayout] new entity:", entity);
                            core.addEntity(entity as any);
                            core.setSelectedEntity(entity as any);
                        }}
                    />
                </div>

                {/* RIGHT PANEL - Inspector */}
                <div style={{
                    width: '280px',
                    background: colors.bgSecondary,
                    borderLeft: `2px solid ${colors.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        background: colors.bgTertiary,
                        borderBottom: `1px solid ${colors.borderColor}`,
                        fontSize: '11px',
                        fontWeight: 600,
                        color: colors.accentLight,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Inspector
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <InspectorPanel
                            entity={localSelectedEntity}
                            onUpdateEntity={(updatedEntity) => {
                                core.addEntity(updatedEntity as any);
                                core.setSelectedEntity(updatedEntity as any);
                                setLocalSelectedEntity(updatedEntity);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ===== BOTTOM - Asset Panel ===== */}
            <div style={{
                borderTop: `2px solid ${colors.borderAccent}`,
            }}>
                <AssetPanel
                    assets={assets}
                    changeSelectedAsset={(a) => changeSelectedAssetHandler(a)}
                    changeDraggAsset={(a) => changeDraggedAssetHandler(a)}
                />
            </div>
        </div>
    );
}
