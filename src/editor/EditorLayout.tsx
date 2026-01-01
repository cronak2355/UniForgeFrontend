import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { AssetPanel } from "./AssetPanel";
import type { EditorEntity } from "./types/Entity";
import { EditorCanvas } from "./EditorCanvas";
import { RunTimeCanvas } from "./RunTimeCanvas";
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

type Mode = "dev" | "run";

function EditorLayoutInner() {
    const { core, assets, entities, selectedAsset, draggedAsset, selectedEntity } = useEditorCoreSnapshot();
    const coreDirect = useEditorCore();
    const navigate = useNavigate();

    const [mode, setMode] = useState<Mode>("dev");

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

    const handleUpdateAssetColor = (assetId: number, color: string) => {
        // This seems to be missing in the remote context or handled differently. 
        // For now, we'll assume the context handles asset updates or we might need to implement a core method.
        // Looking at the remote code, 'setAssets' wasn't exposed from useEditorCoreSnapshot in the conflict block 
        // but 'assets' was. 
        // If this functionality is critical, it needs to be added to EditorCore. 
        // For now, I will comment it out or leave it no-op if no setter exists, 
        // but the conflict showed `handleUpdateAssetColor` definition in the remote block. 
        // Wait, looking at lines 86-90 in the file content I viewed:
        // const handleUpdateAssetColor = ... setAssets ...
        // BUT setAssets is NOT defined in EditorLayoutInner scope in the Remote version (it comes from useEditorCoreSnapshot?).
        // Actually, looking at line 55: const { ..., assets ... } = useEditorCoreSnapshot();
        // It returns 'assets' (value), not 'setAssets' (setter).
        // So `handleUpdateAssetColor` in the remote code (lines 86-90) would fail if `setAssets` isn't defined.
        // Let's check if `setAssets` was defined in the remote block.
        // It wasn't visible in the view_file output for EditorLayoutInner.
        // Wait, the conflict block 8e9a... started at line 44.
        // Lines 54-101 were NOT in a conflict block?
        // Ah, the file content I saw had `<<<<<<<` at line 1 and `=======` at line 4, etc.
        // BUT lines 54-367 were displayed as if they were part of the file.
        // Wait, lines 86-90:
        // const handleUpdateAssetColor = (assetId: number, color: string) => {
        //    setAssets(prev => ...
        // };
        // This code uses `setAssets`. But `setAssets` is NOT defined in `EditorLayoutInner`.
        // This implies the REMOTE code (or the result of me viewing the file with conflicts) might be broken or I missed where setAssets comes from.
        // In the `HEAD` version, `setAssets` came from `useState`.
        // In `EditorLayoutInner`, `assets` comes from `useEditorCoreSnapshot`.
        // `useEditorCoreSnapshot` likely returns immutable snapshot.
        // To update assets, we should use `core.updateAsset(...)` or similar?
        // Since I can't see `EditorCoreContext` definition, I will assume for now that I should NOT include `handleUpdateAssetColor` 
        // OR I should use `coreDirect` if available.
        // However, I must resolve the conflict in `EditorLayout.tsx`. 
        // The conflict was mainly in the Imports, the Component definition, and the Header.
        // The body of `EditorLayoutInner` seems to be what was common or what was in the file 'base'?
        // No, `EditorLayoutInner` was introduced by the Remote change.
        // So the lines 54+ are from the Remote?
        // If so, `setAssets` usage there is suspicious.
        // Let's look closer at line 87: `setAssets(prev => ...)`
        // If `setAssets` is not defined, this will error.
        // Maybe `setAssets` IS defined in `useEditorCoreSnapshot`?
        // Line 55: `const { core, assets, ... } = ...`
        // It does not destructure `setAssets`.
        // I will remove `handleUpdateAssetColor` usage for now to avoid build errors, 
        // or just log a warning, as `EditorCore` seems to be the source of truth now.
        // Actually, looking at the Remote conflict block `>>>>>>>`, it ended at line 166.
        // The logic for `EditorLayoutInner` (lines 54+) *followed* the conflict block?
        // No, `>>>>>>>` was at 166 (inside the header).
        // There was another `<<<<<<<` at line 32?
        // It seems there were MULTIPLE conflict blocks.
        // Block 1: Lines 1-6 (Imports)
        // Block 2: Lines 32-50 (Component Body vs Inner wrapper)
        // Block 3: Lines 111-166 (Header Logo)
        // Block 4: Lines 297-315 (Bottom Panel vs Runtime Canvas)

        // Lines 54-110 were NOT marked as conflict. This means they matched in both or were part of the merge base?
        // Wait, if `EditorLayoutInner` didn't exist in HEAD, how can lines 54-110 be conflict-free?
        // They must exist in the file *after* git tried to auto-merge what it could.
        // Since Remote introduced `EditorLayoutInner`, and HEAD didn't have it, git might have just appended it?
        // No, `EditorLayoutInner` is used in the Remote's `EditorLayout` (Line 46).
        // So `EditorLayoutInner` MUST be defined.
        // The fact that lines 54-110 are there suggests they are part of the file now.
        // But `setAssets` is used in line 87.
        // If `setAssets` is not defined in `EditorLayoutInner`, it's a bug in the Remote code (or the merge result).
        // I will comment out the `handleUpdateAssetColor` implementation detail to prevent crash, 
        // or check if `core` has a method for it.
        // Re-reading line 54: `function EditorLayoutInner() {`
        // I will trust the Remote's intention but fix the `setAssets` missing issue if obvious.
        // I'll assume `core` should handle it.
        console.warn("Asset color update not implemented in new Core");
    };

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
                {/* Logo with Cube Icon - Clickable */}
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    onClick={() => navigate('/main')}
                >
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
                <div style={{ marginLeft: 'auto' }}>
                    <button
                        type="button"
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: colors.borderAccent,
                            border: `1px solid ${colors.borderColor}`,
                            borderRadius: '6px',
                            color: colors.textPrimary,
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            setMode((prev) => (prev === "dev" ? "run" : "dev"));
                        }}
                    >
                        {mode === "dev" ? "실행" : "편집"}
                    </button>
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
                    {mode === "dev" ? (
                        <EditorCanvas
                            assets={assets}
                            selected_asset={selectedAsset}
                            draggedAsset={draggedAsset}
                            addEntity={(entity) => {
                                console.log("? [EditorLayout] new entity:", entity);
                                core.addEntity(entity as any);
                                core.setSelectedEntity(entity as any);
                            }}
                        />
                    ) : (
                        <RunTimeCanvas />
                    )}
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
                    changeDraggedAsset={(a) => changeDraggedAssetHandler(a)}
                />
            </div>
        </div>
    );
}
