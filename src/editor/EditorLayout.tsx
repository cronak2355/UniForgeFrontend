import { useState, useEffect, useRef, useCallback } from "react";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { AssetAnimationSettings } from "./inspector/AssetAnimationSettings";
import { RecentAssetsPanel } from "./RecentAssetsPanel";
import { AssetPanelNew } from "./AssetPanelNew";

import type { EditorEntity } from "./types/Entity";
import type { Asset } from "./types/Asset";
import { EditorCanvas } from "./EditorCanvas";
import { RunTimeCanvas } from "./RunTimeCanvas";
import "./styles.css";
import { EditorCoreProvider, useEditorCoreSnapshot } from "../contexts/EditorCoreContext";
import type { EditorContext } from "./EditorCore";
import { CameraMode, DragDropMode } from "./editorMode/editorModes";
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SceneSerializer } from "./core/SceneSerializer"; // Import Serializer
import { colors } from "./constants/colors";
import { saveScenes, loadScene } from "./api/sceneApi";
import { createGame, updateGameThumbnail } from "../services/gameService";
import { authService } from "../services/authService";
import { assetService } from "../services/assetService";
import { syncLegacyFromLogic } from "./utils/entityLogic";
import { AssetLibraryModal } from "./AssetLibraryModal";
import { buildLogicItems, splitLogicItems } from "./types/Logic";
import { createDefaultModuleGraph } from "./types/Module";
import type { EditorVariable } from "./types/Variable";
import { SaveGameModal } from "../AssetsEditor/components/SaveGameModal";
import { saveGameVersion, updateGameInfo } from "../services/gameService";
import { AiWizardModal } from "../AssetsEditor/components/AiWizardModal";
import { generateSingleImage } from "../AssetsEditor/services/AnimationService";

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

// function cloneEntityForPaste... Removed (logic moved to EditorCore)

function EditorLayoutInner() {
    const { gameId } = useParams<{ gameId: string }>();
    const { core, assets, entities, modules, selectedAsset, draggedAsset, selectedEntity, scenes, currentSceneId } = useEditorCoreSnapshot();

    // Auto-save / Load Logic
    // Auto-save / Load Logic
    useEffect(() => {
        let saveTimer: any = null;

        const initEditor = async () => {
            try {
                // 1. Try key loading from server first
                let loadedFromServer = false;
                if (gameId && gameId !== "undefined") {
                    try {
                        const sceneJson = await loadScene(gameId);
                        if (sceneJson) {
                            console.log("[EditorLayout] Loaded scene from server");
                            core.clear();
                            SceneSerializer.deserialize(sceneJson, core);
                            loadedFromServer = true;
                        } else {
                            // Loaded but empty (New Game)
                            console.log("[EditorLayout] specific gameId provided but no content (New Game). Clearing core.");
                            core.clear();
                            loadedFromServer = true; // Mark as loaded so we don't fall back to autosave (which is for scratchpad)
                        }
                    } catch (e) {
                        console.warn("[EditorLayout] Server load failed:", e);
                        // If server load fails (e.g. 404 Not Found because no version exists yet), 
                        // we should treat it as a fresh new game, NOT fall back to local autosave.
                        console.log("[EditorLayout] Treating as new empty project due to load failure.");
                        core.clear();
                        loadedFromServer = true;
                    }
                }

                if (!loadedFromServer) {
                    // 2. Fallback to local autosave
                    const saved = localStorage.getItem("editor_autosave");
                    if (saved) {
                        try {
                            const json = JSON.parse(saved);
                            // ... (existing validation logic for autosave) ...
                            // REMOVED: S3 URL filtering
                            /*
                            if (json.assets && Array.isArray(json.assets)) {
                                json.assets = json.assets.filter((asset: any) => {
                                    const isS3Url = asset.url && asset.url.includes('amazonaws.com');
                                    if (isS3Url) return false;
                                    return true;
                                });
                            }
                            */

                            // Re-enable entity filtering ONLY if needed for consistency, but be careful not to delete valid stuff
                            if (json.entities && Array.isArray(json.entities)) {
                                const validAssetNames = new Set(json.assets?.map((a: any) => a.name) || []);
                                // Filter entities that refer to non-existent assets (optional consistency check)
                                // json.entities = json.entities.filter((entity: any) => {
                                //    if (entity.texture && !validAssetNames.has(entity.texture)) return false;
                                //    return true;
                                // });
                            }

                            core.clear();
                            SceneSerializer.deserialize(json, core);
                            console.log("[EditorLayout] Loaded from local autosave");
                        } catch (e) {
                            console.error("[EditorLayout] Failed to parse local autosave", e);
                        }
                    }
                }

                // 3. If scene is still empty after loading, add a default camera (essential for viewing)
                const scene = core.getCurrentScene();
                if (scene && scene.entities.size === 0) {
                    console.log("[EditorLayout] Empty scene detected. Adding default camera.");
                    // Add default camera
                    const cameraEntity = {
                        id: crypto.randomUUID(),
                        name: "Main Camera",
                        active: true,
                        position: { x: 0, y: 0, z: -10 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: { x: 1, y: 1, z: 1 },
                        components: [
                            {
                                type: "Camera",
                                props: {
                                    fov: 60,
                                    size: 5,
                                    isPerspective: true,
                                    zoom: 1,
                                    checkLayers: true // default
                                }
                            }
                        ],
                        variables: [],
                        scripts: []
                    };
                    core.addEntity(cameraEntity as any);
                    core.setSelectedEntity(cameraEntity as any);
                }
            } catch (err) {
                console.error("[EditorLayout] Critical error in initEditor", err);
            }
        };

        initEditor();

        // 3. Setup Auto-save subscription
        const saveState = () => {
            // Local auto-save only for crash recovery
            const json = SceneSerializer.serialize(core);
            localStorage.setItem("editor_autosave", JSON.stringify(json));
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
    }, [gameId]); // Re-run if gameId changes


    const [mode, setMode] = useState<Mode>("dev");
    const prevModeRef = useRef<Mode>(mode);
    const [runSession, setRunSession] = useState(0);
    const [dropModalFiles, setDropModalFiles] = useState<File[]>([]);
    const [dropAssetName, setDropAssetName] = useState("");
    const [dropAssetTag, setDropAssetTag] = useState("Character");
    const [recentAssets, setRecentAssets] = useState<Asset[]>(() => {
        try {
            const saved = localStorage.getItem("editor_recent_assets");
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    }); // Persistent state

    // Persist recent assets
    useEffect(() => {
        localStorage.setItem("editor_recent_assets", JSON.stringify(recentAssets));
    }, [recentAssets]);

    // const [isFileMenuOpen, setIsFileMenuOpen] = useState(false); // REMOVED
    const navigate = useNavigate();
    const [isUploadingAsset, setIsUploadingAsset] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const entityBackupRef = useRef<Map<string, EditorEntity> | null>(null);
    const copyEntityRef = useRef<EditorEntity | null>(null);

    // New State for Asset Library Modal
    const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);

    // Save Game Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isSavingProject, setIsSavingProject] = useState(false);

    // AI Wizard State
    const [isAiWizardOpen, setIsAiWizardOpen] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const handleAiGenerate = async (prompt: string, category: string, metadata: any) => {
        setIsGeneratingAi(true);
        console.log("Generating AI Asset:", prompt);
        try {
            // 1. Call AI Service
            // Default size 512 for now
            const base64Image = await generateSingleImage(prompt, 512, category.toLowerCase());

            // 2. Upload/Process as Asset (Convert Base64 to Blob)
            const res = await fetch(`data:image/png;base64,${base64Image}`);
            const blob = await res.blob();
            const file = new File([blob], `ai_gen_${Date.now()}.png`, { type: 'image/png' });

            // 3. Upload using AssetService
            const token = localStorage.getItem("token");
            const assetName = metadata.userPrompt.slice(0, 20) || "AI Asset"; // Use prompt snippet as name
            const result = await assetService.uploadAsset(file, assetName, category, token, metadata, false);

            // 4. Add to Editor Core
            const newAssetId = result.id;
            // IMPORTANT: We need the full URL. uploadAsset returns it.
            core.addAsset({
                id: result.id,
                tag: result.tag, // or category
                name: result.name,
                url: result.url,
                idx: -1,
                metadata: metadata
            });

            // 5. Auto-Place Entity in Center of Screen (or Camera View)
            const camera = core.getEntities().get('Main Camera'); // brittle lookup, better to get active camera
            // Default to 0,0 if no camera found
            const x = 0;
            const y = 0;

            const newEntity: EditorEntity = {
                id: crypto.randomUUID(),
                name: assetName,
                type: "sprite",
                x: x,
                y: y,
                z: 0,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                role: "neutral", // Default role
                logic: buildLogicItems({ components: [] }),
                components: [],
                variables: [],
                events: [],
                texture: result.name, // Sprite uses name or id? Usually name in this engine
                // But wait, core.addAsset(a) -> a.name is used as key? 
                // Let's check EditorCanvas logic. usually uses name or unique ID. 
                // In EditorCore, assets are stored map: id -> Asset. 
                // Phaser uses texture key. We should verify what key is used.
                // Assuming Name is Unique enough or ID is used. 
                // ACTUALLY: Let's use ID if the engine supports it, or Name if simpler.
                // For safety, let's look at dropped assets logic.
                // Dropped assets use result.name. So we stick to result.name.
            };

            // Ensure texture key logic matches. 
            // Ideally we shouldn't rely on Name being unique. 
            // If duplicate name, Phaser might conflict. 
            // UploadService should maybe append ID to name if we use name as key.

            core.addEntity(newEntity);
            core.setSelectedEntity(newEntity);
            setLocalSelectedEntity(newEntity); // Update UI

            console.log("AI Asset Placed:", newEntity);

        } catch (e) {
            console.error("AI Generation Failed:", e);
            alert("AI Generation Failed: " + (e instanceof Error ? e.message : 'Unknown'));
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleSaveProject = async (title: string, description: string) => {

        setIsSavingProject(true);
        try {
            const sceneJson = SceneSerializer.serialize(core);
            let id = gameId;

            // If ID is invalid (undefined or empty), create a new game
            if (!id) {
                const user = await authService.getCurrentUser();
                if (!user) {
                    alert("로그인이 필요합니다. (Login required to create a game)");
                    setIsSavingProject(false);
                    return;
                }
                const newGame = await createGame(user.id, title, description);
                id = String(newGame.gameId);
                navigate(`/editor/${id}`, { replace: true });
            } else {
                // Update existing game info
                await updateGameInfo(id, title, description);
            }

            // Save Version (Scene Data)
            // Use existing saveScenes or new saveGameVersion? 
            // saveScenes calls POST /games/{id}/versions, which is what we want.
            // Let's use the one imported or keep using logic.
            // gameService.saveGameVersion is essentially the same as api/sceneApi.saveScenes.
            // Let's use the new one for consistency if we imported it.
            await saveGameVersion(id, sceneJson);

            // Capture and Upload Thumbnail
            try {
                const canvasEl = document.querySelector('canvas') as HTMLCanvasElement | null;
                if (canvasEl) {
                    const thumbnailDataUrl = canvasEl.toDataURL('image/png', 0.8);
                    const response = await fetch(thumbnailDataUrl);
                    const blob = await response.blob();
                    const contentType = 'image/png';
                    const token = localStorage.getItem('token');

                    const presignParams = new URLSearchParams({
                        ownerType: 'GAME',
                        ownerId: id,
                        imageType: 'thumbnail',
                        contentType: contentType
                    });
                    const presignRes = await fetch(
                        `https://uniforge.kr/api/uploads/presign/image?${presignParams.toString()}`,
                        {
                            method: 'POST',
                            headers: token ? { Authorization: `Bearer ${token}` } : {}
                        }
                    );

                    if (presignRes.ok) {
                        const presignData = await presignRes.json();
                        const uploadUrl = presignData.uploadUrl || presignData.presignedUrl || presignData.url;

                        if (uploadUrl) {
                            const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });

                            if (uploadRes.ok) {
                                const thumbnailUrl = presignData.publicUrl || `https://uniforge.kr/api/games/${id}/thumbnail`;
                                // Update thumbnail via updateGameInfo (or updateGameThumbnail)
                                await updateGameInfo(id, undefined, undefined, thumbnailUrl);
                            } else {
                                console.error("Thumbnail upload to S3 failed:", uploadRes.status, uploadRes.statusText);
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Thumbnail upload failed:", err);
            }

            alert("프로젝트가 성공적으로 저장되었습니다!");
            setIsSaveModalOpen(false);
        } catch (e) {
            console.error("Save failed:", e);
            alert("저장에 실패했습니다: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsSavingProject(false);
        }
    };

    const dragClearTokenRef = useRef(0);
    const handleCreateActionVariable = (name: string, value: unknown, type?: EditorVariable["type"]) => {
        const activeEntity = localSelectedEntity ?? selectedEntity;
        if (!activeEntity) return;
        const variables = activeEntity.variables ?? [];
        if (variables.some((v) => v.name === name)) return;
        let nextType: EditorVariable["type"] = type ?? "string";
        let nextValue: EditorVariable["value"] = "";
        if (typeof value === "boolean") {
            nextType = "bool";
            nextValue = value;
        } else if (typeof value === "number" && !Number.isNaN(value)) {
            nextType = nextType === "int" || nextType === "float" ? nextType : (Number.isInteger(value) ? "int" : "float");
            nextValue = value;
        } else if (value === undefined || value === null) {
            nextType = "int";
            nextValue = 0;
        } else {
            nextValue = String(value);
        }
        const nextVar: EditorVariable = {
            id: crypto.randomUUID(),
            name,
            type: nextType,
            value: nextValue,
        };
        const nextEntity = { ...activeEntity, variables: [...variables, nextVar] };
        core.addEntity(nextEntity as any);
        core.setSelectedEntity(nextEntity as any);
        setLocalSelectedEntity(nextEntity);
    };

    const handleUpdateModuleVariable = (name: string, value: unknown, type?: EditorVariable["type"]) => {
        const activeEntity = localSelectedEntity ?? selectedEntity;
        if (!activeEntity) return;
        const variables = activeEntity.variables ?? [];
        const target = variables.find((v) => v.name === name);
        if (!target) return;
        let nextType: EditorVariable["type"] = type ?? target.type ?? "string";
        let nextValue: EditorVariable["value"] = target.value ?? "";
        if (typeof value === "boolean") {
            nextType = "bool";
            nextValue = value;
        } else if (typeof value === "number" && !Number.isNaN(value)) {
            nextType = nextType === "int" || nextType === "float" ? nextType : (Number.isInteger(value) ? "int" : "float");
            nextValue = value;
        } else if (value === undefined || value === null) {
            nextType = "int";
            nextValue = 0;
        } else {
            nextValue = String(value);
        }
        const nextVariables = variables.map((v) =>
            v.id === target.id ? { ...v, type: nextType, value: nextValue } : v
        );
        const nextEntity = { ...activeEntity, variables: nextVariables };
        core.addEntity(nextEntity as any);
        core.setSelectedEntity(nextEntity as any);
        setLocalSelectedEntity(nextEntity);
    };

    const changeSelectedAssetHandler = (a: Asset | null) => {
        core.setSelectedAsset(a);
        const cm = new CameraMode();
        const ctx: EditorContext = { currentMode: cm, currentSelectedAsset: a ?? undefined, mouse: "mousemove" };
        core.sendContextToEditorModeStateMachine(ctx);
    };

    const changeDraggedAssetHandler = (a: Asset | null, options?: { defer?: boolean }) => {
        if (a) {
            setRecentAssets(prev => {
                const filtered = prev.filter(x => x.id !== a.id);
                return [a, ...filtered].slice(0, 15);
            });
        }

        dragClearTokenRef.current += 1;
        const token = dragClearTokenRef.current;

        if (a == null && options?.defer) {
            window.setTimeout(() => {
                if (dragClearTokenRef.current !== token) return;
                core.setDraggedAsset(null);
                const cm = new CameraMode();
                core.sendContextToEditorModeStateMachine({ currentMode: cm, mouse: "mouseup" });
            }, 0);
            return;
        }

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

            if (isMeta && (e.key === "z" || e.key === "Z")) {
                if (mode !== "dev") return;
                e.preventDefault();
                if (e.shiftKey) {
                    core.redo();
                } else {
                    core.undo();
                }
                return;
            }

            if (isMeta && (e.key === "y" || e.key === "Y")) {
                if (mode !== "dev") return;
                e.preventDefault();
                core.redo();
                return;
            }

            if (isMeta && (e.key === "c" || e.key === "C")) {
                if (mode !== "dev") return;
                const selected = core.getSelectedEntity();
                if (selected) {
                    core.copy(selected);
                    e.preventDefault();
                }
                return;
            }

            if (isMeta && (e.key === "x" || e.key === "X")) {
                if (mode !== "dev") return;
                const selected = core.getSelectedEntity();
                if (selected) {
                    core.cut(selected);
                    e.preventDefault();
                }
                return;
            }

            if (isMeta && (e.key === "v" || e.key === "V")) {
                if (mode !== "dev") return;
                core.paste();
                e.preventDefault();
                return;
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                const selected = core.getSelectedEntity();
                if (selected) {
                    core.removeEntity(selected.id);
                } else {
                    // If no entity is selected, try to delete the current scene
                    // But we should confirm? Unity deletes without confirm usually, but let's be safe or strict?
                    // User said "Like entity", entities delete instantly.
                    // However, scene deletion is destructive.
                    // Let's add a small check: don't delete if it's the last scene.
                    const currentSceneId = core.getCurrentSceneId();
                    const scenes = core.getScenes();
                    // Allow deletion only if more than 1 scene exists
                    if (scenes.size > 1 && currentSceneId) {
                        core.removeScene(currentSceneId);
                    }
                }
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [core, mode]);

    const [localSelectedEntity, setLocalSelectedEntity] = useState<EditorEntity | null>(selectedEntity);
    const runtimeSyncPendingRef = useRef<EditorEntity | null>(null);
    const runtimeSyncTimerRef = useRef<number | null>(null);

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

    useEffect(() => {
        return () => {
            if (runtimeSyncTimerRef.current !== null) {
                clearTimeout(runtimeSyncTimerRef.current);
                runtimeSyncTimerRef.current = null;
            }
        };
    }, []);

    const selectedEntityId = selectedEntity?.id ?? null;

    const handleRuntimeEntitySync = useCallback(
        (runtimeEntity: EditorEntity) => {
            if (selectedEntityId && runtimeEntity.id !== selectedEntityId) {
                return;
            }
            runtimeSyncPendingRef.current = runtimeEntity;
            if (runtimeSyncTimerRef.current !== null) return;
            runtimeSyncTimerRef.current = window.setTimeout(() => {
                runtimeSyncTimerRef.current = null;
                const nextEntity = runtimeSyncPendingRef.current;
                runtimeSyncPendingRef.current = null;
                if (nextEntity) {
                    setLocalSelectedEntity(nextEntity);
                }
            }, 0);
        },
        [selectedEntityId]
    );

    useEffect(() => {
        const prevMode = prevModeRef.current;
        if (prevMode === mode) return;

        if (mode === "run") {
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
        } else if (prevMode === "run") {
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

        prevModeRef.current = mode;
    }, [mode, core]);

    const resetDropModal = () => {
        setDropModalFiles([]);
        setDropAssetName("");
        setDropAssetTag("Character");
        setIsUploadingAsset(false);
        setUploadError("");
    };

    // Auto-Load Asset from URL (when returning from Asset Editor)
    const [searchParams, setSearchParams] = useSearchParams();
    const newAssetId = searchParams.get("newAssetId");

    useEffect(() => {
        if (!newAssetId) return;

        const loadNewAsset = async () => {
            try {
                // Determine tag if possible, or default to Character. 
                // getAsset returns asset data.
                const asset = await assetService.getAsset(newAssetId);

                // Add to core
                // Note: asset structure vs core.addAsset expectation
                // assetService.getAsset returns Asset & { description? }
                // core.addAsset expects: { id, tag, name, url, idx, metadata?, description? }

                // We need to ensure we have the URL.
                // assetService.getAsset might return url or imageUrl depending on endpoint.
                const url = (asset as any).imageUrl || (asset as any).url;

                if (url) {
                    const resolvedTag =
                        typeof (asset as any).tag === 'string' && (asset as any).tag.length > 0
                            ? (asset as any).tag
                            : typeof (asset as any).genre === 'string' && (asset as any).genre.length > 0
                                ? (asset as any).genre
                                : 'Character';

                    core.addAsset({
                        id: (asset as any).id,
                        tag: resolvedTag,
                        name: (asset as any).name,
                        url: url,
                        idx: -1,
                        metadata: (asset as any).description ? JSON.parse((asset as any).description) : undefined,
                        description: (asset as any).description
                    });
                    console.log("Auto-imported asset:", (asset as any).name);
                }
            } catch (e) {
                console.error("Failed to auto-load new asset:", e);
            } finally {
                // Clear the param so we don't reload on refresh
                searchParams.delete("newAssetId");
                setSearchParams(searchParams, { replace: true });
            }
        };

        loadNewAsset();
    }, [newAssetId, core]);

    useEffect(() => {
        if (dropModalFiles.length === 0) return;
        if (dropModalFiles.length === 1) {
            const base = dropModalFiles[0].name.replace(/\.[^/.]+$/, "");
            setDropAssetName(base);
        } else {
            setDropAssetName(`${dropModalFiles.length} files`);
        }
    }, [dropModalFiles]);

    const handleAddAsset = async () => {
        if (dropModalFiles.length === 0 || isUploadingAsset) return;

        setIsUploadingAsset(true);
        setUploadError("");

        try {
            const token = localStorage.getItem("token");

            // Prepare uploads
            // If single file, use the manually input name.
            // If multiple, use filename as name.
            const uploads = dropModalFiles.map(file => {
                const name = dropModalFiles.length === 1 ? dropAssetName.trim() || file.name : file.name.replace(/\.[^/.]+$/, "");
                return { file, name, tag: dropAssetTag };
            });

            if (uploads.some(u => !u.name)) {
                throw new Error("Name is required.");
            }

            // Parallel Uploads
            // isPublic = false for editor uploads (Private)
            const results = await Promise.all(uploads.map(u =>
                assetService.uploadAsset(u.file, u.name, u.tag, token, undefined, false)
            ));

            results.forEach(result => {
                core.addAsset({
                    id: result.id,
                    tag: result.tag,
                    name: result.name,
                    url: result.url,
                    idx: -1,
                });
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
                            <MenuItem label="Save Project" onClick={() => {
                                console.error("[EditorLayout] Save Project Clicked. Setting isSaveModalOpen to true.");
                                setIsSaveModalOpen(true);
                            }} />
                            <MenuItem
                                label="Export"
                                onClick={() => {
                                    try {
                                        // 1. 현재 에디터 상태를 GameDataJSON으로 직렬화
                                        const sceneJson = SceneSerializer.serialize(core);

                                        // 2. BuildPage에서 읽을 수 있도록 sessionStorage에 저장
                                        sessionStorage.setItem(
                                            "UNITY_BUILD_SCENE_JSON",
                                            JSON.stringify(sceneJson)
                                        );

                                        console.log("✅ Export Scene JSON saved", sceneJson);

                                        // 3. Build 페이지로 이동
                                        navigate("/build");
                                    } catch (e) {
                                        console.error("❌ Export failed", e);
                                        alert("빌드 데이터를 생성하는 중 오류가 발생했습니다.");
                                    }
                                }}
                            />
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

                        {/* UI Menu */}
                        <TopBarMenu label="ui">
                            <MenuItem label="Add Text" onClick={() => {
                                const id = crypto.randomUUID();
                                const newEntity: EditorEntity = {
                                    id,
                                    name: "New Text",
                                    type: "sprite",
                                    x: 400,
                                    y: 300,
                                    z: 100,
                                    rotation: 0,
                                    scaleX: 1,
                                    scaleY: 1,
                                    role: "neutral",
                                    logic: buildLogicItems({ components: [] }),
                                    components: [],
                                    variables: [
                                        { id: crypto.randomUUID(), name: "isUI", type: "bool", value: true },
                                        { id: crypto.randomUUID(), name: "uiType", type: "string", value: "text" },
                                        { id: crypto.randomUUID(), name: "uiText", type: "string", value: "New Text" },
                                        { id: crypto.randomUUID(), name: "uiFontSize", type: "float", value: 16 },
                                        { id: crypto.randomUUID(), name: "uiColor", type: "string", value: "#ffffff" }
                                    ],
                                    events: [],
                                };
                                core.addEntity(newEntity);
                                core.setSelectedEntity(newEntity);
                                setLocalSelectedEntity(newEntity);
                            }} />
                            <MenuItem label="Add Panel" onClick={() => {
                                const id = crypto.randomUUID();
                                const newEntity: EditorEntity = {
                                    id,
                                    name: "New Panel",
                                    type: "sprite",
                                    x: 400,
                                    y: 300,
                                    z: 90,
                                    rotation: 0,
                                    scaleX: 1,
                                    scaleY: 1,
                                    role: "neutral",
                                    logic: buildLogicItems({ components: [] }),
                                    components: [],
                                    variables: [
                                        { id: crypto.randomUUID(), name: "isUI", type: "bool", value: true },
                                        { id: crypto.randomUUID(), name: "uiType", type: "string", value: "panel" },
                                        { id: crypto.randomUUID(), name: "uiBackgroundColor", type: "string", value: "#444444" },
                                        { id: crypto.randomUUID(), name: "width", type: "float", value: 200 },
                                        { id: crypto.randomUUID(), name: "height", type: "float", value: 100 }
                                    ],
                                    events: [],
                                };
                                core.addEntity(newEntity);
                                core.setSelectedEntity(newEntity);
                                setLocalSelectedEntity(newEntity);
                            }} />
                            <MenuItem label="Add Bar" onClick={() => {
                                const id = crypto.randomUUID();
                                const newEntity: EditorEntity = {
                                    id,
                                    name: "New Bar",
                                    type: "sprite",
                                    x: 400,
                                    y: 300,
                                    z: 100,
                                    rotation: 0,
                                    scaleX: 1,
                                    scaleY: 1,
                                    role: "neutral",
                                    logic: buildLogicItems({ components: [] }),
                                    components: [],
                                    variables: [
                                        { id: crypto.randomUUID(), name: "isUI", type: "bool", value: true },
                                        { id: crypto.randomUUID(), name: "uiType", type: "string", value: "bar" },
                                        { id: crypto.randomUUID(), name: "uiBarColor", type: "string", value: "#e74c3c" },
                                        { id: crypto.randomUUID(), name: "uiBackgroundColor", type: "string", value: "#2c3e50" },
                                        { id: crypto.randomUUID(), name: "uiValueVar", type: "string", value: "hp" },
                                        { id: crypto.randomUUID(), name: "uiMaxVar", type: "string", value: "maxHp" },
                                        { id: crypto.randomUUID(), name: "width", type: "float", value: 200 },
                                        { id: crypto.randomUUID(), name: "height", type: "float", value: 20 }
                                    ],
                                    events: [],
                                };
                                core.addEntity(newEntity);
                                core.setSelectedEntity(newEntity);
                                setLocalSelectedEntity(newEntity);
                            }} />
                        </TopBarMenu>

                        {/* Edit Menu */}
                        <TopBarMenu label="edit">
                            <MenuItem label="Undo (Ctrl+Z)" onClick={() => core.undo()} />
                            <MenuItem label="Redo (Ctrl+Y)" onClick={() => core.redo()} />
                            <MenuItem label="Cut (Ctrl+X)" onClick={() => core.cut(core.getSelectedEntity())} />
                            <MenuItem label="Copy (Ctrl+C)" onClick={() => core.copy(core.getSelectedEntity())} />
                            <MenuItem label="Paste (Ctrl+V)" onClick={() => core.paste()} />
                            <MenuItem label="Delete (Del)" onClick={() => {
                                const selected = core.getSelectedEntity();
                                if (selected) core.removeEntity(selected.id);
                            }} />
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
                            setMode((prev) => (prev === "dev" ? "run" : "dev"));
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
                {/* LEFT PANEL - Hierarchy */}
                <div style={{
                    width: '280px',
                    background: colors.bgSecondary,
                    borderRight: `2px solid ${colors.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <HierarchyPanel
                        core={core}
                        scenes={scenes}
                        currentSceneId={currentSceneId}
                        selectedId={selectedEntity?.id ?? null}
                        onSelect={(entity) => {
                            core.setSelectedEntity(entity);
                            setLocalSelectedEntity(entity);
                        }}
                    />
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
                            onExternalImageDrop={(files) => setDropModalFiles(Array.from(files))}
                            addEntity={(entity) => {
                                console.log("? [EditorLayout] new entity:", entity);
                                core.addEntity(entity as any);
                                core.setSelectedEntity(entity as any);
                            }}
                        />
                    ) : (
                        <RunTimeCanvas
                            key={`run-${runSession}`}
                            onRuntimeEntitySync={handleRuntimeEntitySync}
                        />
                    )}

                    {/* Asset Panel (Center Bottom) */}
                    <div style={{
                        height: '280px',
                        borderTop: `2px solid ${colors.borderAccent}`,
                        zIndex: 10
                    }}>
                        <AssetPanelNew
                            assets={assets}
                            changeSelectedAsset={(a) => changeSelectedAssetHandler(a)}
                            changeDraggedAsset={(a) => changeDraggedAssetHandler(a)}
                            modules={modules}
                            addModule={(module) => core.addModule(module)}
                            updateModule={(module) => core.updateModule(module)}
                            selectedEntityVariables={(localSelectedEntity ?? selectedEntity)?.variables ?? []}
                            actionLabels={{}}
                            onCreateVariable={handleCreateActionVariable}
                            onUpdateVariable={handleUpdateModuleVariable}
                            onDeleteAsset={(asset) => {
                                // Just remove from local editor, do not delete from S3
                                const currentAssets = Array.from(core.getAssets());
                                core.setAssets(currentAssets.filter(a => a.id !== asset.id));
                            }}
                        />
                    </div>
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
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {/* Asset Animation Settings (when asset is selected) */}
                        {selectedAsset && (
                            <AssetAnimationSettings asset={selectedAsset} />
                        )}
                        {/* Entity Inspector */}
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




            {/* AI Wizard FAB */}
            <div style={{
                position: 'fixed',
                bottom: '30px',
                right: '300px', // Left of inspector
                zIndex: 100,
            }}>
                <button
                    onClick={() => setIsAiWizardOpen(true)}
                    style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white', border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title="Generate AI Asset"
                >
                    ✨
                </button>
            </div>

            {/* AI Wizard Modal */}
            <AiWizardModal
                isOpen={isAiWizardOpen}
                onClose={() => setIsAiWizardOpen(false)}
                onGenerate={handleAiGenerate}
            />

            {/* Save Game Modal */}
            <SaveGameModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleSaveProject}
                isSaving={isSavingProject}
                initialTitle={gameId && gameId !== 'undefined' ? "Project" : "New Project"}
            />

            {/* Asset Library Modal */}
            {isAssetLibraryOpen && (
                <AssetLibraryModal
                    onClose={() => setIsAssetLibraryOpen(false)}
                    onAssetSelect={(libItem) => {
                        // Convert library item to editor asset
                        const newAsset: Asset = {
                            id: libItem.id, // Use asset ID from backend
                            tag: libItem.assetType || "Character",
                            name: libItem.title,
                            url: libItem.thumbnail, // Use the image URL
                            idx: 0, // Default index
                            metadata: libItem.metadata, // Pass the parsed metadata!
                            description: libItem.description // Pass description for recovery
                        };
                        core.addAsset(newAsset);
                        setIsAssetLibraryOpen(false);
                        console.log("Imported asset from library:", newAsset);
                    }}
                />
            )}

            {dropModalFiles.length > 0 && (
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
                            {dropModalFiles.length > 1 ? "Bulk Upload Assets" : "Import Asset"}
                        </div>
                        {/* Content replaced by previous chunks */}
                        {dropModalFiles.length === 0 && null}
                        {dropModalFiles.length > 0 && (
                            <div style={{
                                background: colors.bgTertiary,
                                border: `1px solid ${colors.borderColor}`,
                                borderRadius: "8px",
                                padding: "12px",
                                color: colors.textSecondary,
                                fontSize: "12px",
                                lineHeight: 1.6,
                                maxHeight: "150px",
                                overflowY: "auto"
                            }}>
                                {dropModalFiles.length === 1 ? (
                                    <>
                                        <div>Filename: {dropModalFiles[0].name}</div>
                                        <div>Type: {dropModalFiles[0].type || "unknown"}</div>
                                        <div>Size: {Math.ceil(dropModalFiles[0].size / 1024)} KB</div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>
                                            {dropModalFiles.length} files selected:
                                        </div>
                                        {dropModalFiles.map((f, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                                    {f.name}
                                                </span>
                                                <span>{Math.ceil(f.size / 1024)}KB</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div style={{
                            marginTop: "14px",
                            display: "grid",
                            gap: "10px",
                        }}>
                            {dropModalFiles.length === 1 && (
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
                            )}
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
            {/* AI Wizard Modal & FAB */}
            <AiWizardModal
                isOpen={isAiWizardOpen}
                onClose={() => setIsAiWizardOpen(false)}
                onGenerate={handleAiGenerate}
            />

            {!isAiWizardOpen && (
                <button
                    onClick={() => setIsAiWizardOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '360px', // Moved left to avoid RightPanel (320px) overlap
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        borderRadius: '9999px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.5)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <span style={{ fontSize: '18px' }}>✨</span>
                    <span>AI Generate</span>
                </button>
            )}

            {/* Asset Library Modal */}
            {isAssetLibraryOpen && (
                <AssetLibraryModal
                    onClose={() => setIsAssetLibraryOpen(false)}
                    onAssetSelect={(asset) => {
                        core.setDraggedAsset(asset);
                        setIsAssetLibraryOpen(false);
                    }}
                />
            )}

            {/* Save Game Modal */}
            {isSaveModalOpen && (
                <SaveGameModal
                    isOpen={isSaveModalOpen}
                    onClose={() => setIsSaveModalOpen(false)}
                    onSave={handleSaveProject}
                    initialTitle=""
                    initialDescription=""
                    isSaving={isSavingProject}
                />
            )}
        </div>
    );
}
