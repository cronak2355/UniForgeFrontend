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
import { useNavigate, useParams } from 'react-router-dom';
import { SceneSerializer } from "./core/SceneSerializer"; // Import Serializer
import { colors } from "./constants/colors";
import { saveScenes } from "./api/sceneApi";
import { createGame } from "../services/gameService";
import { authService } from "../services/authService";
import { syncLegacyFromLogic } from "./utils/entityLogic";
import { AssetLibraryModal } from "./AssetLibraryModal"; // Import AssetLibraryModal
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
            onClick={(e) => {
                e.stopPropagation(); // Prevent closing if we want to handle it manually (optional)
                onClick();
            }}
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

function TopBarMenu({
    label,
    children
}: {
    label: string;
    children: React.ReactNode
}) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div
            style={{ position: "relative" }}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                onClick={() => setIsOpen(v => !v)}
                style={{
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isOpen ? colors.textPrimary : colors.textSecondary,
                    background: isOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                }}
                onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.color = colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.color = colors.textSecondary;
                }}
            >
                {label}
            </button>
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "32px",
                        left: 0,
                        width: "180px",
                        background: colors.bgSecondary,
                        border: `1px solid ${colors.borderColor}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        borderRadius: "6px",
                        zIndex: 1000,
                        padding: "4px 0",
                    }}
                >
                    {children}
                </div>
            )}
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
    const { gameId } = useParams<{ gameId: string }>();
    const { core, assets, entities, selectedAsset, draggedAsset, selectedEntity } = useEditorCoreSnapshot();

    // Auto-save / Load Logic
    // Auto-save / Load Logic
    useEffect(() => {
        // 1. Initial Load with validation
        try {
            const saved = localStorage.getItem("editor_autosave");
            if (saved) {
                const json = JSON.parse(saved);
                console.log("[EditorLayout] Found autosave, loading with validation...");

                // Validate and filter assets
                if (json.assets && Array.isArray(json.assets)) {
                    json.assets = json.assets.filter((asset: any) => {
                        // Filter out S3 URLs (they contain broken references)
                        // Use 'amazonaws.com' to catch regional S3 URLs like s3.ap-northeast-2.amazonaws.com
                        const isS3Url = asset.url && asset.url.includes('amazonaws.com');
                        if (isS3Url) {
                            console.warn(`[EditorLayout] Filtered out S3 asset: ${asset.name} (${asset.url})`);
                            return false;
                        }
                        return true;
                    });
                }

                // Validate and filter entities that reference broken assets
                if (json.entities && Array.isArray(json.entities)) {
                    const validAssetNames = new Set(json.assets?.map((a: any) => a.name) || []);
                    json.entities = json.entities.filter((entity: any) => {
                        // Check if entity's texture exists in valid assets
                        if (entity.texture && !validAssetNames.has(entity.texture)) {
                            console.warn(`[EditorLayout] Filtered out entity with broken texture: ${entity.name} (${entity.texture})`);
                            return false;
                        }
                        return true;
                    });
                }

                core.clear(); // Clear default entries
                SceneSerializer.deserialize(json, core);
                console.log("[EditorLayout] Autosave loaded successfully with validation");
            }
        } catch (err) {
            console.error("[EditorLayout] Failed to load autosave", err);
            console.log("[EditorLayout] Starting with default assets");
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
    // const [isFileMenuOpen, setIsFileMenuOpen] = useState(false); // REMOVED
    const navigate = useNavigate();
    const [isUploadingAsset, setIsUploadingAsset] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const entityBackupRef = useRef<Map<string, EditorEntity> | null>(null);
    const copyEntityRef = useRef<EditorEntity | null>(null);

    // New State for Asset Library Modal
    const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);

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
                const nextId = assetId;

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
            const imageType = "preview";
            const params = new URLSearchParams({
                contentType,
                imageType,
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

            const extractS3Key = (url: string) => {
                try {
                    const parsed = new URL(url);
                    const key = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
                    return key || null;
                } catch {
                    return null;
                }
            };

            const s3Key =
                presignData.s3Key ||
                presignData.key ||
                extractS3Key(uploadUrl);

            if (!s3Key) {
                throw new Error("S3 key missing in response.");
            }

            const imageRes = await fetch("https://uniforge.kr/api/images", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    ownerType: "ASSET",
                    ownerId: assetId,
                    imageType,
                    s3Key,
                    contentType,
                }),
            });
            if (!imageRes.ok) {
                const message = await imageRes.text();
                throw new Error(message || "Failed to register image.");
            }
            const assetUrl = `https://uniforge.kr/api/assets/s3/${encodeURIComponent(assetId)}?imageType=${encodeURIComponent(imageType)}`;
            console.log(`asset url : ${assetUrl}`)
            core.addAsset({
                id: assetId,
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
            {/* ===== UNIFIED TOP BAR ===== */}
            <div style={{
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                background: colors.bgSecondary,
                borderBottom: `1px solid ${colors.borderColor}`,
                justifyContent: 'space-between',
            }}>
                {/* Left Group: Logo + Menus */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {/* Logo (Refactored) */}
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        onClick={() => navigate('/main')}
                    >
                        <i className="fa-solid fa-cube" style={{ fontSize: '18px', color: '#3b82f6' }}></i>
                        <span style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'white',
                            letterSpacing: '-0.5px',
                        }}>
                            Uniforge<span style={{ color: '#3b82f6' }}>.</span>
                        </span>
                    </div>

                    {/* Menus */}
                    <div style={{ display: 'flex', gap: '4px' }}>

                        {/* File Menu */}
                        <TopBarMenu label="file">
                            <MenuItem label="Load Project" onClick={() => {
                                document.getElementById('hidden-load-input')?.click();
                            }} />
                            <MenuItem label="Save Project" onClick={async () => {
                                try {
                                    const sceneJson = SceneSerializer.serialize(core, "MyScene");
                                    // Use ID as string directly (UUID support)
                                    let id = gameId;

                                    // If ID is invalid (undefined or empty), prompt to create a new game
                                    if (!id) {
                                        const title = prompt("저장할 새 게임의 제목을 입력해주세요:", "My New Game");
                                        if (!title) return; // User cancelled

                                        // Try to get real authorId from authService
                                        const user = await authService.getCurrentUser();
                                        if (!user) {
                                            alert("로그인이 필요합니다. (Login required to create a game)");
                                            return;
                                        }

                                        // createGame now expects string authorId and returns string gameId (in GameSummary)
                                        // But wait, createGame returns GameSummary where gameId might be number if I didn't update the interface?
                                        // I updated createGame to return Promise<GameSummary>.
                                        // Let's assume GameSummary.gameId is string or we cast it.
                                        const newGame = await createGame(user.id, title, "Created from Editor");
                                        id = String(newGame.gameId);

                                        // Silent navigation to correct URL
                                        navigate(`/editor/${id}`, { replace: true });
                                    }

                                    await saveScenes(id, sceneJson);
                                    alert("성공적으로 저장되었습니다! (Saved to server)");
                                } catch (e) {
                                    console.error(e);
                                    alert("Failed to save project: " + String(e));
                                }
                            }} />
                            <MenuItem label="Export" onClick={() => {
                                navigate("/build");
                            }} />

                            {/* Hidden Input for Load */}
                            <div style={{ display: 'none' }}>
                                <input
                                    id="hidden-load-input"
                                    type="file"
                                    accept=".json"
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
                                        e.target.value = "";
                                    }}
                                />
                            </div>
                        </TopBarMenu>

                        {/* Assets Menu */}
                        <TopBarMenu label="assets">
                            <MenuItem label="Import Asset" onClick={() => { alert("Import Asset - Coming Soon"); }} />
                            <MenuItem label="Asset Library" onClick={() => { setIsAssetLibraryOpen(true); }} />
                        </TopBarMenu>

                        {/* Edit Menu */}
                        <TopBarMenu label="edit">
                            <MenuItem label="Undo" onClick={() => { alert("Undo - Coming Soon"); }} />
                            <MenuItem label="Redo" onClick={() => { alert("Redo - Coming Soon"); }} />
                            <MenuItem label="Cut" onClick={() => { alert("Cut - Coming Soon"); }} />
                            <MenuItem label="Copy" onClick={() => { alert("Copy - Coming Soon"); }} />
                            <MenuItem label="Paste" onClick={() => { alert("Paste - Coming Soon"); }} />
                        </TopBarMenu>

                    </div>
                </div>

                {/* Right Group: Play Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        title="Pause"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: colors.borderAccent,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                    </button>
                    <button
                        title={mode === "dev" ? "Play" : "Stop"}
                        onClick={() => {
                            setMode((prev) => {
                                const next = prev === "dev" ? "run" : "dev";
                                if (next === "run") {
                                    const backup = new Map<string, EditorEntity>();
                                    core.getEntities().forEach((entity, id) => {
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
                                    setRunSession((v) => v + 1);
                                } else {
                                    if (entityBackupRef.current) {
                                        entityBackupRef.current.forEach((backupEntity, id) => {
                                            const currentEntity = core.getEntities().get(id);
                                            if (currentEntity) {
                                                Object.assign(currentEntity, backupEntity);
                                            }
                                        });
                                        entityBackupRef.current = null;
                                        core.setSelectedEntity(core.getSelectedEntity());
                                        const refreshed = core.getSelectedEntity();
                                        setLocalSelectedEntity(refreshed ? { ...refreshed } : null);
                                    }
                                }
                                return next;
                            });
                        }}

                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                            color: mode === "run" ? "#ef4444" : colors.borderAccent
                        }}
                    >
                        {mode === "dev" ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5V19L19 12L8 5Z" />
                            </svg>
                        ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="5" y="5" width="14" height="14" />
                            </svg>
                        )}
                    </button>

                </div>
            </div>

            {/* ===== MAIN EDITOR AREA (ORIGINAL) ===== */}
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

            {/* ===== BOTTOM - Asset Panel (ORIGINAL) ===== */}
            <div style={{
                borderTop: `2px solid ${colors.borderAccent}`,
            }}>
                <AssetPanel
                    assets={assets}
                    changeSelectedAsset={(a) => changeSelectedAssetHandler(a)}
                    changeDraggedAsset={(a) => changeDraggedAssetHandler(a)}
                />
            </div>

            {/* Asset Library Modal */}
            {isAssetLibraryOpen && (
                <AssetLibraryModal onClose={() => setIsAssetLibraryOpen(false)} />
            )}

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
