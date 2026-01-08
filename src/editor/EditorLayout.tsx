import { useState, useEffect, useRef } from "react";
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
import { useNavigate } from 'react-router-dom';
import { SceneSerializer } from "./core/SceneSerializer"; // Import Serializer
import { colors } from "./constants/colors";
import { saveScenes } from "./api/sceneApi";
import { syncLegacyFromLogic } from "./utils/entityLogic";
import { buildLogicItems, splitLogicItems } from "./types/Logic";

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

function MenuItem({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: "8px 12px",
                fontSize: "13px",
                cursor: "pointer",
                color: "#ddd",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
            }}
        >
            {label}
        </div>
    );
}

function cloneEntityForPaste(source: EditorEntity): EditorEntity {
    const cloned = JSON.parse(JSON.stringify(source)) as EditorEntity;
    const baseComponents = cloned.components ?? splitLogicItems(cloned.logic);
    const components = baseComponents.map((comp) => ({
        ...comp,
        id: crypto.randomUUID(),
    }));

    return {
        ...cloned,
        id: crypto.randomUUID(),
        name: `${source.name} Copy`,
        x: (source.x ?? 0) + 20,
        y: (source.y ?? 0) + 20,
        variables: (cloned.variables ?? []).map((v) => ({ ...v, id: crypto.randomUUID() })),
        events: (cloned.events ?? []).map((ev) => ({ ...ev, id: crypto.randomUUID() })),
        components,
        logic: buildLogicItems({ components }),
    };
}

function EditorLayoutInner() {
    const { core, assets, entities, selectedAsset, draggedAsset, selectedEntity } = useEditorCoreSnapshot();

    // Auto-save / Load Logic
    // Auto-save / Load Logic
    useEffect(() => {
        // 1. Initial Load
        try {
            const saved = localStorage.getItem("editor_autosave");
            if (saved) {
                const json = JSON.parse(saved);
                console.log("[EditorLayout] Found autosave, loading...");
                core.clear(); // Clear default entries
                SceneSerializer.deserialize(json, core);
            }
        } catch (err) {
            console.error("[EditorLayout] Failed to load autosave", err);
        }

        // 2. Setup Auto-save subscription
        let saveTimer: any = null;
        const saveState = () => {
            const json = SceneSerializer.serialize(core);
            localStorage.setItem("editor_autosave", JSON.stringify(json));
            console.log("[AutoSave] Saved state to storage.");
        };

        const unsubscribe = core.subscribe(() => {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(saveState, 1000);
        });

        const onBeforeUnload = () => {
            if (saveTimer) clearTimeout(saveTimer);
            saveState();
        };
        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            unsubscribe();
            window.removeEventListener("beforeunload", onBeforeUnload);
            if (saveTimer) clearTimeout(saveTimer);
            saveState();
        };
    }, []); // Run once on mount


    const [mode, setMode] = useState<Mode>("dev");
    const [runSession, setRunSession] = useState(0);
    const [dropModalFile, setDropModalFile] = useState<File | null>(null);
    const [dropAssetName, setDropAssetName] = useState("");
    const [dropAssetTag, setDropAssetTag] = useState("Character");
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const [isUploadingAsset, setIsUploadingAsset] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const entityBackupRef = useRef<Map<string, EditorEntity> | null>(null);
    const copyEntityRef = useRef<EditorEntity | null>(null);

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

    // Key handler for deletion
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const active = document.activeElement;
            if (
                active instanceof HTMLInputElement ||
                active instanceof HTMLTextAreaElement ||
                active instanceof HTMLSelectElement ||
                (active instanceof HTMLElement && active.isContentEditable)
            ) {
                return;
            }

            const isMeta = e.ctrlKey || e.metaKey;

            if (isMeta && (e.key === "c" || e.key === "C")) {
                if (mode !== "dev") return;
                const selected = core.getSelectedEntity();
                if (selected) {
                    copyEntityRef.current = JSON.parse(JSON.stringify(selected)) as EditorEntity;
                    e.preventDefault();
                }
                return;
            }

            if (isMeta && (e.key === "v" || e.key === "V")) {
                if (mode !== "dev") return;
                const source = copyEntityRef.current;
                if (!source) return;
                const clone = cloneEntityForPaste(source);
                core.addEntity(clone as any);
                core.setSelectedEntity(clone as any);
                setLocalSelectedEntity(clone);
                e.preventDefault();
                return;
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                const selected = core.getSelectedEntity();
                if (selected) {
                    core.removeEntity(selected.id);
                }
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [core, mode]);

    const [localSelectedEntity, setLocalSelectedEntity] = useState<EditorEntity | null>(selectedEntity);

    // keep local selection in sync with core selection
    // 드래그 중에도 이전 선택을 유지 (selectedEntity가 null이 아닐 때만 업데이트)
    useEffect(() => {
        if (selectedEntity !== null) {
            setLocalSelectedEntity(selectedEntity);
        }
    }, [selectedEntity]);

    useEffect(() => {
        if (mode !== "run") return;
        const id = selectedEntity?.id;
        if (!id) return;
        const latest = core.getEntities().get(id);
        if (!latest) return;
        setLocalSelectedEntity(latest);
    }, [mode, selectedEntity, core]);

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
            const reader = new FileReader();
            reader.onload = (e) => {
                const assetUrl = e.target?.result as string;
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
            };
            reader.readAsDataURL(dropModalFile);
            return;
        }
        setIsUploadingAsset(true);
        setUploadError("");

        try {
            const params = new URLSearchParams({
                fileName: dropModalFile.name,
                contentType,
            });
            const requestUrl = `https://uniforge.kr/api/assets/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(versionId)}/upload-url?${params.toString()}`;
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
                                    // Save entity state before running
                                    const backup = new Map<string, EditorEntity>();
                                    core.getEntities().forEach((entity, id) => {
                                        // Deep clone each entity
                                        backup.set(id, JSON.parse(JSON.stringify(entity)));
                                    });
                                    entityBackupRef.current = backup;
                                    core.setSelectedEntity(null);
                                    setLocalSelectedEntity(null);
                                    const entitiesList = Array.from(core.getEntities().values());
                                    const preferred =
                                        entitiesList.find((entity) => entity.role === "player") ??
                                        entitiesList[0] ??
                                        null;
                                    if (preferred) {
                                        core.setSelectedEntity(preferred as any);
                                        setLocalSelectedEntity(preferred as any);
                                    }
                                    console.log(
                                        "[Run] Entities snapshot:",
                                        Array.from(core.getEntities().values()).map((entity) => ({
                                            id: entity.id,
                                            name: entity.name,
                                            type: entity.type,
                                            x: entity.x,
                                            y: entity.y,
                                            z: entity.z,
                                            rotation: entity.rotation,
                                            rotationX: entity.rotationX,
                                            rotationY: entity.rotationY,
                                            rotationZ: entity.rotationZ,
                                            scaleX: entity.scaleX,
                                            scaleY: entity.scaleY,
                                            role: entity.role,
                                            variables: entity.variables,
                                            components: entity.components,
                                        }))
                                    );
                                    setRunSession((v) => v + 1);
                                } else {
                                    // Restore entity state from backup
                                    if (entityBackupRef.current) {
                                        entityBackupRef.current.forEach((backupEntity, id) => {
                                            const currentEntity = core.getEntities().get(id);
                                            if (currentEntity) {
                                                // Restore position, hp, etc.
                                                Object.assign(currentEntity, backupEntity);
                                            }
                                        });
                                        entityBackupRef.current = null;
                                        // Force UI update
                                        core.setSelectedEntity(core.getSelectedEntity());
                                        const refreshed = core.getSelectedEntity();
                                        setLocalSelectedEntity(refreshed ? { ...refreshed } : null);
                                    }
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
                <button
                    onClick={async () => {
                        try {
                            const sceneJson = SceneSerializer.serialize(core, "MyScene");
                            const gameId = 1; // 임시 값
                            console.log(sceneJson)
                            await saveScenes(gameId, sceneJson);
                            alert("Saved to server");
                        } catch (e) {
                            console.error(e);
                            alert("Failed to save project");
                        }
                    }}

                    // onClick={() => {
                    //     // SAVE
                    //     const json = SceneSerializer.serialize(core, "MyScene");
                    //     const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
                    //     const url = URL.createObjectURL(blob);
                    //     const a = document.createElement("a");
                    //     a.href = url;
                    //     a.download = `${json.sceneId}.json`;
                    //     a.click();
                    //     URL.revokeObjectURL(url);
                    // }}

                    style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        color: colors.textSecondary,
                        cursor: 'pointer',
                        borderRadius: '4px',
                        background: 'transparent',
                        border: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = colors.textPrimary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
                >
                    Save Project
                </button>

                <label
                    style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        color: colors.textSecondary,
                        cursor: 'pointer',
                        borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = colors.textPrimary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
                >
                    Load Project
                    <input
                        type="file"
                        accept=".json"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                                const text = evt.target?.result as string;
                                try {
                                    const json = JSON.parse(text);
                                    core.clear(); // Clear existing
                                    SceneSerializer.deserialize(json, core);
                                } catch (err) {
                                    console.error("Failed to load JSON", err);
                                    alert("Failed to load project file.");
                                }
                            };
                            reader.readAsText(file);
                            // Reset input
                            e.target.value = "";
                        }}
                    />
                </label>

                {/* ===== FILE MENU ===== */}
                <div style={{ position: "relative" }}>
                    <button
                        onClick={() => setIsFileMenuOpen(v => !v)}
                        style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            color: colors.textSecondary,
                            cursor: 'pointer',
                            borderRadius: '4px',
                            background: 'transparent',
                            border: 'none',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.textPrimary; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
                    >
                        File
                    </button>

                    {isFileMenuOpen && (
                        <div
                            style={{
                                position: "absolute",
                                top: "36px",
                                left: 0,
                                width: "180px",
                                background: colors.bgSecondary,
                                border: `1px solid ${colors.borderColor}`,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                borderRadius: "6px",
                                zIndex: 1000,
                            }}
                        >
                            <MenuItem label="Export" onClick={() => {
                                const sceneJson = SceneSerializer.serialize(core, "MyScene");

                                // 🔑 여기
                                sessionStorage.setItem(
                                    "UNITY_BUILD_SCENE_JSON",
                                    JSON.stringify(sceneJson)
                                );

                                navigate("/build");
                            }} />
                        </div>
                    )}
                </div>
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
                            key={`edit-${runSession}`}
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
                        <RunTimeCanvas
                            key={`run-${runSession}`}
                            onRuntimeEntitySync={(runtimeEntity) => {
                                setLocalSelectedEntity(runtimeEntity);
                            }}
                        />
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
                        {localSelectedEntity && (
                            <InspectorPanel
                                entity={localSelectedEntity}
                                onUpdateEntity={(updatedEntity) => {
                                    const normalized = syncLegacyFromLogic(updatedEntity);
                                    core.addEntity(normalized as any);
                                    core.setSelectedEntity(normalized as any);
                                    setLocalSelectedEntity(normalized);
                                }}
                            />
                        )}
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
                                    background: colors.bgTertiary,
                                    border: `1px solid ${colors.borderColor}`,
                                    borderRadius: "6px",
                                    color: colors.textPrimary,
                                    cursor: "pointer",
                                }}
                            >
                                Add Asset
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
