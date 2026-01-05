import { useState, useEffect } from "react";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { AssetPanel } from "./AssetPanel";
import type { EditorEntity } from "./types/Entity";
import type { Asset } from "./types/Asset";
import { EditorCanvas } from "./EditorCanvas";
import { RunTimeCanvas } from "./RunTimeCanvas";
import "./styles.css";
import { EditorCoreProvider, useEditorCoreSnapshot } from "../contexts/EditorCoreContext";
import type { EditorContext } from "./EditorCore";
import { CameraMode, DragDropMode } from "./editorMode/editorModes";

import { colors } from "./constants/colors";

// Entry Style Color Palette
// const colors = { ... } replaced by import

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


    const [mode, setMode] = useState<Mode>("dev");
    const [runSession, setRunSession] = useState(0);
    const [dropModalFile, setDropModalFile] = useState<File | null>(null);
    const [dropAssetName, setDropAssetName] = useState("");
    const [dropAssetTag, setDropAssetTag] = useState("Character");
    const [isUploadingAsset, setIsUploadingAsset] = useState(false);
    const [uploadError, setUploadError] = useState("");

    const changeSelectedAssetHandler = (a: Asset | null) => {
        core.setSelectedAsset(a);
        const cm = new CameraMode();
        const ctx: EditorContext = { currentMode: cm, currentSelectedAsset: a ?? undefined, mouse: "mousemove" };
        core.sendContextToEditorModeStateMachine(ctx);
    };

    const changeDraggedAssetHandler = (a: Asset | null) => {
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
    // 드래그 중에도 이전 선택을 유지 (selectedEntity가 null이 아닐 때만 업데이트)
    useEffect(() => {
        if (selectedEntity !== null) {
            setLocalSelectedEntity(selectedEntity);
        }
    }, [selectedEntity]);

    const resetDropModal = () => {
        setDropModalFile(null);
        setDropAssetName("");
        setDropAssetTag("Character");
        setIsUploadingAsset(false);
        setUploadError("");
    };

    useEffect(() => {
        if (!dropModalFile) return;
        const base = dropModalFile.name.replace(/\.[^/.]+$/, "");
        setDropAssetName(base);
    }, [dropModalFile]);

    const handleAddAsset = async () => {
        if (!dropModalFile || isUploadingAsset) return;

        const name = dropAssetName.trim();
        const assetId = crypto.randomUUID();
        const versionId = "1";
        const contentType = dropModalFile.type || "application/octet-stream";

        if (!name) {
            setUploadError("Name is required.");
            return;
        }

        if (import.meta.env.DEV) {
            const assetUrl = URL.createObjectURL(dropModalFile);
            const nextId =
                core.getAssets().reduce((max, asset) => Math.max(max, asset.id), -1) + 1;

            core.addAsset({
                id: nextId,
                tag: dropAssetTag,
                name,
                url: assetUrl,
                idx: -1,
            });

            resetDropModal();
            return;
        }
        setIsUploadingAsset(true);
        setUploadError("");

        try {
            const params = new URLSearchParams({
                fileName: dropModalFile.name,
                contentType,
            });
            const requestUrl = `http://localhost:8080/assets/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(versionId)}/upload-url?${params.toString()}`;
            const token = localStorage.getItem("token");
            const presignRes = await fetch(requestUrl, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!presignRes.ok) {
                const message = await presignRes.text();
                throw new Error(message || "Failed to get upload URL.");
            }

            const presignData = await presignRes.json();
            const uploadUrl = presignData.uploadUrl || presignData.presignedUrl || presignData.url;
            if (!uploadUrl) {
                throw new Error("Upload URL missing in response.");
            }

            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": contentType },
                body: dropModalFile,
            });

            if (!uploadRes.ok) {
                throw new Error("Upload failed.");
            }

            const assetUrl =
                presignData.fileUrl ||
                presignData.assetUrl ||
                presignData.url ||
                uploadUrl.split("?")[0];

            const nextId =
                core.getAssets().reduce((max, asset) => Math.max(max, asset.id), -1) + 1;

            core.addAsset({
                id: nextId,
                tag: dropAssetTag,
                name,
                url: assetUrl,
                idx: -1,
            });

            resetDropModal();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Upload failed.";
            setUploadError(message);
        } finally {
            setIsUploadingAsset(false);
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
                            setMode((prev) => {
                                const next = prev === "dev" ? "run" : "dev";
                                if (next === "run") {
                                    setRunSession((v) => v + 1);
                                }
                                return next;
                            });
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
                            onExternalImageDrop={(file) => setDropModalFile(file)}
                            addEntity={(entity) => {
                                console.log("? [EditorLayout] new entity:", entity);
                                core.addEntity(entity as any);
                                core.setSelectedEntity(entity as any);
                            }}
                        />
                    ) : (
                        <RunTimeCanvas key={`run-${runSession}`} />
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

            {dropModalFile && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.65)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2000,
                        padding: "24px",
                    }}
                    onClick={() => resetDropModal()}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "520px",
                            background: colors.bgSecondary,
                            border: `1px solid ${colors.borderColor}`,
                            borderRadius: "10px",
                            padding: "20px",
                            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: colors.textPrimary,
                            marginBottom: "12px",
                        }}>
                            Image drop detected
                        </div>
                        <div style={{
                            background: colors.bgTertiary,
                            border: `1px solid ${colors.borderColor}`,
                            borderRadius: "8px",
                            padding: "12px",
                            color: colors.textSecondary,
                            fontSize: "12px",
                            lineHeight: 1.6,
                        }}>
                            <div>Filename: {dropModalFile.name}</div>
                            <div>Type: {dropModalFile.type || "unknown"}</div>
                            <div>Size: {Math.ceil(dropModalFile.size / 1024)} KB</div>
                        </div>
                        <div style={{
                            marginTop: "14px",
                            display: "grid",
                            gap: "10px",
                        }}>
                            <label style={{
                                display: "grid",
                                gap: "6px",
                                fontSize: "12px",
                                color: colors.textSecondary,
                            }}>
                                Name
                                <input
                                    type="text"
                                    value={dropAssetName}
                                    onChange={(e) => setDropAssetName(e.target.value)}
                                    placeholder="Asset name"
                                    style={{
                                        background: colors.bgPrimary,
                                        border: `1px solid ${colors.borderColor}`,
                                        borderRadius: "6px",
                                        padding: "8px 10px",
                                        color: colors.textPrimary,
                                        fontSize: "12px",
                                        outline: "none",
                                    }}
                                />
                            </label>
                            <label style={{
                                display: "grid",
                                gap: "6px",
                                fontSize: "12px",
                                color: colors.textSecondary,
                            }}>
                                Tag
                                <select
                                    value={dropAssetTag}
                                    onChange={(e) => setDropAssetTag(e.target.value)}
                                    style={{
                                        background: colors.bgPrimary,
                                        border: `1px solid ${colors.borderColor}`,
                                        borderRadius: "6px",
                                        padding: "8px 10px",
                                        color: colors.textPrimary,
                                        fontSize: "12px",
                                        outline: "none",
                                    }}
                                >
                                    <option value="Character">Character</option>
                                    <option value="Tile">Tile</option>
                                </select>
                            </label>
                        </div>
                        {uploadError && (
                            <div style={{
                                marginTop: "10px",
                                color: "#f87171",
                                fontSize: "12px",
                            }}>
                                {uploadError}
                            </div>
                        )}
                        <div style={{
                            marginTop: "16px",
                            display: "flex",
                            gap: "8px",
                            justifyContent: "flex-end",
                        }}>
                            <button
                                type="button"
                                onClick={handleAddAsset}
                                disabled={isUploadingAsset}
                                style={{
                                    padding: "8px 14px",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    background: isUploadingAsset ? colors.bgPrimary : colors.bgTertiary,
                                    border: `1px solid ${colors.borderColor}`,
                                    borderRadius: "6px",
                                    color: colors.textPrimary,
                                    cursor: isUploadingAsset ? "not-allowed" : "pointer",
                                }}
                            >
                                {isUploadingAsset ? "Uploading..." : "Add Asset"}
                            </button>
                            <button
                                type="button"
                                onClick={() => resetDropModal()}
                                style={{
                                    padding: "8px 14px",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    background: colors.borderAccent,
                                    border: `1px solid ${colors.borderColor}`,
                                    borderRadius: "6px",
                                    color: colors.textPrimary,
                                    cursor: "pointer",
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
