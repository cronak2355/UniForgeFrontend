import { useState } from "react";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { AssetPanel } from "./AssetPanel";
import type { EditorEntity } from "./types/Entity"
import type { Asset } from "./types/Asset";
import { PhaserCanvas } from "./PhaserCanvas";
import { colors } from "./constants/colors";
import "./styles.css";

export default function EditorLayout() {
    const [entities] = useState<EditorEntity[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<EditorEntity | null>(null);
    const [assets] = useState<Asset[]>([
        { id: 0, name: "testAsset1", tag: "Tile", url: "TestAsset.webp", idx: -1 },
        { id: 1, name: "testAsset2", tag: "Tile", url: "TestAsset2.webp", idx: -1 },
        { id: 2, name: "testAsset3", tag: "Tile", url: "TestAsset3.webp", idx: -1 },
        { id: 3, name: "placeholder", tag: "Character", url: "placeholder.png", idx: -1 },
        { id: 4, name: "dragon", tag: "Character", url: "RedDragon.webp", idx: -1 },
    ]);
    const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const changeSelectedAsset = (asset: Asset | null) => {
        if (asset == selectedAsset) {
            setSelectedAsset(null);
            return;
        }
        setSelectedAsset(asset);
    };

    const changeDraggedAsset = (asset: Asset | null, options?: { defer?: boolean }) => {
        if (options?.defer) {
            requestAnimationFrame(() => setDraggedAsset(asset));
        } else {
            setDraggedAsset(asset);
        }
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
                justifyContent: 'space-between',
                padding: '0 16px',
                background: colors.bgSecondary,
                borderBottom: `1px solid ${colors.borderColor}`,
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                    <div style={{ fontSize: '1.25rem' }}>
                        <span className="gradient-text">Uniforge</span>
                    </div>
                </div>

                {/* Profile Icon */}
                <button
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: `2px solid ${colors.borderColor}`,
                        backgroundColor: colors.bgTertiary,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.accentLight}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.borderColor}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={colors.textSecondary}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </button>
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
                {/* LEFT PANEL - Hierarchy (전체 높이) */}
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
                            onSelect={setSelectedEntity}
                        />
                    </div>
                </div>

                {/* CENTER - Viewport + Assets */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: colors.bgPrimary,
                    overflow: 'hidden',
                }}>
                    {/* Phaser Canvas (뷰포트) */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <PhaserCanvas
                            assets={assets}
                            selected_asset={selectedAsset}
                            draggedAsset={draggedAsset}
                            addEntity={(entity) => {
                                setSelectedEntity(entity);
                            }}
                        />
                    </div>

                    {/* Asset Panel (하단) */}
                    <div style={{
                        borderTop: `2px solid ${colors.borderAccent}`,
                    }}>
                        <AssetPanel
                            assets={assets}
                            changeSelectedAsset={changeSelectedAsset}
                            changeDraggedAsset={changeDraggedAsset}
                        />
                    </div>
                </div>

                {/* RIGHT PANEL - Inspector (전체 높이) */}
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
                            entity={selectedEntity}
                            onUpdateEntity={(updatedEntity) => {
                                setSelectedEntity(updatedEntity);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
