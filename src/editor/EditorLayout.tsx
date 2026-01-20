import { useState, useEffect, useRef, useCallback } from "react";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { AssetAnimationSettings } from "./inspector/AssetAnimationSettings";
import { PrefabInspector } from "./inspector/PrefabInspector";
import { RecentAssetsPanel } from "./RecentAssetsPanel";
import { AssetPanelNew } from "./AssetPanelNew";
import { TileToolsPanel } from "./inspector/TileToolsPanel";
import { TilePalettePanel } from "./inspector/TilePalettePanel";

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
import { ComponentHelper } from "./inspector/ComponentHelper";
import { LoadingOverlay } from "./ui/LoadingOverlay";

// Entry Style Color Palette
// const colors = { ... } replaced by import

export default function EditorLayout({ isPlayMode = false }: { isPlayMode?: boolean }) {
    return (
        <EditorCoreProvider>
            <EditorLayoutInner isPlayMode={isPlayMode} />
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

function EditorLayoutInner({ isPlayMode = false }: { isPlayMode?: boolean }) {
    const { gameId } = useParams<{ gameId: string }>();
    const { core, assets, entities, modules, selectedAsset, draggedAsset, selectedEntity, scenes, currentSceneId } = useEditorCoreSnapshot();
    const [runtimeCore, setRuntimeCore] = useState<any>(null); // Store Runtime Core when in Play mode
    const [isDirty, setIsDirty] = useState(false);
    const [saveToast, setSaveToast] = useState<string | null>(null); // Toast message
    const [isEditorReady, setIsEditorReady] = useState(false);

    // Asset Panel Resize State (Removed - layout changed to Sidebar Tabs)
    // const [assetPanelHeight, setAssetPanelHeight] = useState(280); 
    // const [isResizingAssetPanel, setIsResizingAssetPanel] = useState(false);

    // Sidebar Tab State
    const [activeLeftTab, setActiveLeftTab] = useState<"hierarchy" | "assets">("hierarchy");

    // Removed resize effect
    /* useEffect(() => { ... resize logic ... }, []); */

    // Resize logic removed

    // Prompt on exit if dirty
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Auto-save / Load Logic
    // Auto-save / Load Logic
    useEffect(() => {
        let saveTimer: any = null;

        const initEditor = async () => {
            setIsLoading(true);
            setLoadingMessage("서버 연결 확인 중...");

            try {
                // 1. Try key loading from server first
                let loadedFromServer = false;
                if (gameId && gameId !== "undefined") {
                    setLoadingMessage(`게임 데이터 로드 중... (ID: ${gameId})`);
                    if (gameId === 'new') {
                        setLoadingMessage("새 게임 생성 중...");
                        core.clear();
                        loadedFromServer = true;
                        setIsDirty(false);
                    } else {
                        try {
                            console.log("[EditorLayout] Loading scene for gameId:", gameId);
                            const sceneJson = await loadScene(gameId);
                            setLoadingMessage("씬 데이터 해석 중...");
                            console.log("[EditorLayout] Scene loaded:", sceneJson ? "success" : "null");
                            if (sceneJson) {
                                setLoadingMessage("씬 데이터 적용 중...");
                                core.clear();
                                SceneSerializer.deserialize(sceneJson, core);
                                loadedFromServer = true;
                            } else {
                                // Loaded but empty (New Game)
                                setLoadingMessage("빈 프로젝트 초기화 중...");
                                core.clear();
                                loadedFromServer = true; // Mark as loaded so we don't fall back to autosave (which is for scratchpad)
                            }
                        } catch (e) {
                            console.warn("[EditorLayout] Server load failed:", e);
                            setLoadingMessage("서버 로드 실패 (새 게임으로 시작)");
                            // If server load fails (e.g. 404 Not Found because no version exists yet), 
                            // we should treat it as a fresh new game, NOT fall back to local autosave.
                            core.clear();
                            loadedFromServer = true;
                        }
                    }
                }
                console.log("[EditorLayout] initEditor complete", { loadedFromServer, entities: core.getEntities().size });

                if (!loadedFromServer) {
                    // 2. Fallback to local autosave
                    setLoadingMessage("로컬 저장소 확인 중...");
                    const saved = localStorage.getItem("editor_autosave");
                    if (saved) {
                        try {
                            const json = JSON.parse(saved);
                            core.clear();
                            SceneSerializer.deserialize(json, core);
                        } catch (e) {
                            console.error("[EditorLayout] Failed to parse local autosave", e);
                        }
                    }
                }

                // 3. Ensure Main Camera exists after loading (fallback for legacy or empty scenes)
                const scene = core.getCurrentScene();
                if (scene) {
                    let cameraEntity = Array.from(scene.entities.values()).find(e => e.name === "Main Camera");
                    if (!cameraEntity) {
                        const newCam = {
                            id: crypto.randomUUID(),
                            name: "Main Camera",
                            type: "container",
                            role: "neutral", // Added missing field
                            active: true,
                            position: { x: 0, y: 0, z: -10 },
                            rotation: { x: 0, y: 0, z: 0 },
                            scale: { x: 1, y: 1, z: 1 },
                            // Flat properties matching EditorEntity interface
                            x: 0,
                            y: 0,
                            z: -10,
                            rotationX: 0, // Added missing field
                            rotationY: 0,
                            rotationZ: 0,
                            scaleX: 1,
                            scaleY: 1,
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
                            scripts: [],
                            logic: [], // Added missing field
                            events: [], // Added missing field
                            texture: undefined // Explicitly undefined
                        };
                        core.addEntity(newCam as any);
                        core.setSelectedEntity(newCam as any); // Select it too
                    } else if (cameraEntity.texture === "Main Camera") {
                        // [Fix] Clean up bad texture data
                        cameraEntity.texture = undefined;
                        // Force update via addEntity to trigger notify/snapshot if needed, or just set in map?
                        // Core.addEntity handles logic wrapping.
                        // Let's use updateEntityAnywhere or just modify and notify.
                        // Since we are in init logic, direct modification + notify might be best, but core.updateEntity is safer.
                        core.updateEntity({ ...cameraEntity, texture: undefined });
                    }
                }
            } catch (err) {
                console.error("[EditorLayout] Critical error in initEditor", err);
            } finally {
                console.log("[EditorLayout] Entering finally block. message:", loadingMessage);
                // Minimum loading time for better UX (prevent flicker)
                setTimeout(() => {
                    console.log("[EditorLayout] First timeout executed. Setting message to 'Complete'");
                    setLoadingMessage("에디터 초기화 완료!");
                    setTimeout(() => {
                        console.log("[EditorLayout] Second timeout executed. Setting isLoading to false");
                        setIsLoading(false);
                    }, 500);
                }, 500);
            }
        };

        if (core) {
            initEditor();
        }

        return () => {
            window.removeEventListener('beforeunload', () => { });
        };
    }, [core, gameId]);

    // Auto-save Logic
    useEffect(() => {
        let saveTimer: any = null;

        saveTimer = setInterval(() => {
            if (isDirty && core) {
                const json = SceneSerializer.serialize(core);
                localStorage.setItem("editor_autosave", JSON.stringify(json));
                // console.log("[EditorLayout] Auto-saved to local storage");
            }
        }, 5000); // 5 seconds

        return () => {
            if (saveTimer) clearInterval(saveTimer);
        };
    }, [core, isDirty]);

    // Prevent context menu (right-click) globally in the editor
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        // Add listener with capture: true to intercept before children
        window.addEventListener("contextmenu", handleContextMenu, { capture: true }); // [Modified] Use capture phase

        return () => {
            window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
        };
    }, []);

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

    // Force Play Mode if isPlayMode prop is true
    useEffect(() => {
        if (isPlayMode) {
            setMode("run");
        }
    }, [isPlayMode]);

    // [New] Show loading screen when switching to Run Mode
    useEffect(() => {
        if (mode === 'run') {
            setIsLoading(true);
            setLoadingMessage("런타임 환경 구성 중...");

            // Brief artificial delay sequence to show loading messages
            setTimeout(() => setLoadingMessage("게임 데이터 동기화 중..."), 400);

            // Note: We DO NOT auto-dismiss here. We wait for <RunTimeCanvas onLoaded /> to trigger.
        }
    }, [mode]);

    // Persist recent assets
    useEffect(() => {
        localStorage.setItem("editor_recent_assets", JSON.stringify(recentAssets));
    }, [recentAssets]);

    // [New] Show loading screen during scene switch
    useEffect(() => {
        if (!currentSceneId) return;

        // Skip loading screen on initial load (handled by initEditor)
        // We can check if isLoading is already true, or use a ref to skip first mount
        // logic: if isLoading is false, and scene ID changes, it's a switch.

        // Simple heuristic: Scene ID changed and we are not in simple init
        // But initEditor sets isLoading true anyway.
        // Let's just trigger it. If it overlaps with init, no harm.

        // However, to avoid "double flash", we might want to check.
        // The user specifically asked for scene switching feedback.

        console.log(`[EditorLayout] Scene Switched to: ${currentSceneId}`);
    }, [currentSceneId]);

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
    const [isComponentHelperOpen, setIsComponentHelperOpen] = useState(false);
    const [isComponentHelperHover, setIsComponentHelperHover] = useState(false);

    // Tiling Tools State
    const [tilingTool, setTilingTool] = useState<"" | "drawing" | "erase" | "bucket" | "shape" | "connected_erase">("");
    const [selectedObject, setSelectedObject] = useState<string | null>(null);
    const [selectedTileIndex, setSelectedTileIndex] = useState<number>(0);

    // Loading State
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("초기화 중...");


    const handleAiGenerate = async (prompt: string, category: string, metadata: any) => {
        setIsGeneratingAi(true);

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



        } catch (e) {
            console.error("AI Generation Failed:", e);
            alert("AI Generation Failed: " + (e instanceof Error ? e.message : 'Unknown'));
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleSaveProject = async () => {
        setIsSavingProject(true);
        try {
            // 0. Pre-check Login
            const user = await authService.getCurrentUser();
            if (!user) {
                alert("로그인이 필요합니다. (Login required to save)");
                setIsSavingProject(false);
                return;
            }

            const sceneJson = SceneSerializer.serialize(core);
            let id = gameId;
            let isNewGame = false;

            // 1. Create fallback (Should rarely happen with new flow)
            if (!id || id === "undefined" || id === 'new') {
                const newGame = await createGame(user.id, "Untitled Project", "Restored Project");
                id = String(newGame.gameId);
                isNewGame = true;

            }

            // 2. Save Version
            await saveGameVersion(id, sceneJson);


            // 3. Capture and Upload Thumbnail (Best Effort)
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
                                const s3Url = uploadUrl.split('?')[0];
                                const thumbnailUrl = presignData.publicUrl || s3Url;
                                // Update thumbnail via updateGameInfo
                                await updateGameInfo(id, undefined, undefined, thumbnailUrl);

                            } else {
                                console.warn("Thumbnail upload to S3 failed:", uploadRes.status);
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Thumbnail upload failed (non-critical):", err);
            }

            // 4. Navigate if New Game (Update URL)
            // Doing this LAST prevents race conditions where the component reloads before saving.
            if (isNewGame) {
                navigate(`/editor/${id}`, { replace: true });
            }

            // Show Toast
            setSaveToast("프로젝트가 성공적으로 저장되었습니다.");
            setTimeout(() => setSaveToast(null), 3000);
            setIsDirty(false);
            setIsSaveModalOpen(false);

        } catch (e) {
            console.error("Save Failed:", e);
            alert("저장 실패: " + (e instanceof Error ? e.message : "Unknown Error"));
        } finally {
            setIsSavingProject(false);
        }
    };

    // Hotkey: Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                handleSaveProject();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [core, gameId]);

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

    // [UI FIX] Camera Control
    const [cameraControl, setCameraControl] = useState<{ setCameraPosition: (x: number, y: number) => void } | null>(null);

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
            // [REMOVED] setRunSession causes RunTimeCanvas to unmount/remount via key change
            // setRunSession((v) => v + 1);
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

    const handleInspectorUpdate = (updatedEntity: EditorEntity) => {
        const normalized = syncLegacyFromLogic(updatedEntity);
        core.addEntity(normalized as any);
        core.setSelectedEntity(normalized as any);
        setLocalSelectedEntity(normalized);
        setIsDirty(true);
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

            results.forEach((result, index) => {
                // [FIX] Use the user-selected tag from uploads array instead of server-returned tag
                // to ensure "Tile" tag is preserved for tile palette recognition
                const selectedTag = uploads[index]?.tag ?? result.tag;
                core.addAsset({
                    id: result.id,
                    tag: selectedTag,
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



    /* Legacy loading screen removed - controlled by LoadingOverlay now
    if (!isEditorReady) {
        return (
            <div style={{
                width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: colors.bgPrimary, color: colors.textSecondary, flexDirection: 'column', gap: '16px'
            }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '32px', color: colors.accent }}></i>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>프로젝트를 불러오는 중...</div>
            </div>
        );
    }
    */

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
            {!isPlayMode && (
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
                            onClick={() => {
                                if (isDirty) {
                                    if (!confirm("저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?")) return;
                                }
                                navigate('/projects');
                            }}
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
                            <TopBarMenu label="파일">
                                <MenuItem label="프로젝트 불러오기" onClick={() => {
                                    document.getElementById('hidden-load-input')?.click();
                                }} />
                                <MenuItem label="프로젝트 저장" onClick={() => {
                                    handleSaveProject();
                                }} />
                                <MenuItem
                                    label="내보내기 (Export)"
                                    onClick={() => {
                                        try {
                                            // 1. 현재 에디터 상태를 GameDataJSON으로 직렬화
                                            const sceneJson = SceneSerializer.serialize(core);

                                            // 2. BuildPage에서 읽을 수 있도록 sessionStorage에 저장
                                            sessionStorage.setItem(
                                                "UNITY_BUILD_SCENE_JSON",
                                                JSON.stringify(sceneJson)
                                            );



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
                            <TopBarMenu label="에셋">
                                <MenuItem label="에셋 가져오기 (준비중)" onClick={() => { alert("Import Asset - Coming Soon"); }} />
                                <MenuItem label="에셋 라이브러리" onClick={() => { setIsAssetLibraryOpen(true); }} />
                            </TopBarMenu>

                            {/* UI Menu */}

                            {/* Edit Menu */}
                            <TopBarMenu label="편집">
                                <MenuItem label="실행 취소 (Ctrl+Z)" onClick={() => core.undo()} />
                                <MenuItem label="다시 하기 (Ctrl+Y)" onClick={() => core.redo()} />
                                <MenuItem label="잘라내기 (Ctrl+X)" onClick={() => core.cut(core.getSelectedEntity())} />
                                <MenuItem label="복사 (Ctrl+C)" onClick={() => core.copy(core.getSelectedEntity())} />
                                <MenuItem label="붙여넣기 (Ctrl+V)" onClick={() => core.paste()} />
                                <MenuItem label="삭제 (Del)" onClick={() => {
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
            )}

            {/* Play Mode Overlay */}
            {isPlayMode && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 1000
                }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backdropFilter: 'blur(4px)'
                        }}
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                        나가기 (Exit)
                    </button>
                </div>
            )}

            {/* ===== MAIN EDITOR AREA (Refactored) ===== */}
            <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
            }}>

                {/* LEFT SIDEBAR (Tabs: Hierarchy / Assets) */}
                {!isPlayMode && (
                    <div style={{
                        width: '320px', // Slightly wider for Assets
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: `1px solid ${colors.borderColor}`,
                        background: colors.bgSecondary
                    }}>
                        {/* Sidebar Tabs */}
                        <div style={{
                            display: 'flex',
                            borderBottom: `1px solid ${colors.borderColor}`,
                            background: colors.bgTertiary
                        }}>
                            <button
                                onClick={() => setActiveLeftTab("hierarchy")}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: 'none',
                                    background: activeLeftTab === "hierarchy" ? colors.bgSecondary : 'transparent',
                                    color: activeLeftTab === "hierarchy" ? colors.textPrimary : colors.textSecondary,
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    borderBottom: activeLeftTab === "hierarchy" ? `2px solid ${colors.accent}` : 'none'
                                }}
                            >
                                <i className="fa-solid fa-list-ul" style={{ marginRight: '6px' }}></i>
                                계층 구조 (Hierarchy)
                            </button>
                            <button
                                onClick={() => setActiveLeftTab("assets")}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: 'none',
                                    background: activeLeftTab === "assets" ? colors.bgSecondary : 'transparent',
                                    color: activeLeftTab === "assets" ? colors.textPrimary : colors.textSecondary,
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    borderBottom: activeLeftTab === "assets" ? `2px solid ${colors.accent}` : 'none'
                                }}
                            >
                                <i className="fa-solid fa-layer-group" style={{ marginRight: '6px' }}></i>
                                에셋 (Assets)
                            </button>
                        </div>

                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {activeLeftTab === "hierarchy" ? (
                                <HierarchyPanel
                                    core={core}
                                    scenes={scenes}
                                    currentSceneId={currentSceneId}
                                    selectedId={selectedEntity?.id ?? null}
                                    onSelect={(entity) => {
                                        core.setSelectedEntity(entity);
                                        setLocalSelectedEntity(entity);
                                    }}
                                    runtimeCore={mode === "run" ? runtimeCore : null}
                                    onFocusCamera={(x, y) => {
                                        if (cameraControl) {
                                            cameraControl.setCameraPosition(x, y);
                                        }
                                    }}
                                />
                            ) : (
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
                                        const currentAssets = Array.from(core.getAssets());
                                        core.setAssets(currentAssets.filter(a => a.id !== asset.id));
                                    }}
                                />
                            )}
                        </div>
                        {/* Tile Tools & Palette (Always Visible in Assets Tab) */}
                        {activeLeftTab === "assets" && (
                            <div style={{
                                height: '320px', // Increased fixed height for better visibility
                                display: 'flex',
                                flexDirection: 'column',
                                borderTop: `1px solid ${colors.borderColor}`,
                                background: colors.bgSecondary
                            }}>
                                {/* Header removed as requested */}
                                <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <TileToolsPanel
                                        currentTool={tilingTool}
                                        setTool={setTilingTool}
                                    />
                                    <div style={{ height: '8px', flexShrink: 0 }} />
                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <TilePalettePanel
                                            assets={assets}
                                            selectedTileIndex={selectedTileIndex}
                                            onSelectTile={setSelectedTileIndex}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* CENTER: Canvas */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Top Toolbar - Hide in Play Mode */}
                    {!isPlayMode && (
                        <div style={{
                            height: '40px',
                            borderBottom: `1px solid ${colors.borderColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 16px',
                            justifyContent: 'space-between',
                            background: colors.bgSecondary
                        }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {/* Toolbar Buttons if any */}
                            </div>
                            <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                                {mode === "dev" ? "에디터 모드 (EDITOR MODE)" : "런타임 모드 (RUNTIME MODE)"}
                            </div>
                        </div>
                    )}

                    {/* Canvas Area - FULL HEIGHT */}
                    <div style={{ flex: 1, position: 'relative', background: '#000', display: 'flex', flexDirection: 'column' }}>
                        {/* Loading Overlay inside Canvas */}
                        <LoadingOverlay isVisible={isLoading} message={loadingMessage} />

                        {mode === "dev" ? (
                            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                                <EditorCanvas
                                    key={`edit-${runSession}`}
                                    assets={assets}
                                    selected_asset={selectedAsset}
                                    draggedAsset={draggedAsset}
                                    onExternalImageDrop={(files) => setDropModalFiles(Array.from(files))}
                                    addEntity={(entity) => {
                                        core.addEntity(entity as any);
                                        core.setSelectedEntity(entity as any);
                                        setIsDirty(true);
                                    }}
                                    tilingTool={tilingTool}
                                    selectedTileIndex={selectedTileIndex}
                                    onRendererReady={(renderer) => setCameraControl(renderer)}
                                />
                            </div>
                        ) : (
                            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                                <RunTimeCanvas
                                    key={`run-${runSession}-${currentSceneId}`}
                                    onRuntimeEntitySync={handleRuntimeEntitySync}
                                    onGameReady={setRuntimeCore}
                                    onLoaded={() => {
                                        // Dismiss loading screen when runtime reports ready
                                        setLoadingMessage("실행 준비 완료!");
                                        setTimeout(() => setIsLoading(false), 200);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL - Inspector */}
                {!isPlayMode && (
                    <div style={{
                        width: '280px',
                        background: colors.bgSecondary,
                        borderLeft: `2px solid ${colors.borderColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
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
                            속성 (Inspector)
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                            {selectedAsset && selectedAsset.tag !== "Prefab" && (
                                <AssetAnimationSettings asset={selectedAsset} />
                            )}
                            {selectedAsset && selectedAsset.tag === "Prefab" && (
                                <PrefabInspector asset={selectedAsset} />
                            )}
                            {localSelectedEntity && !selectedAsset && (
                                <InspectorPanel
                                    entity={localSelectedEntity}
                                    onUpdateEntity={handleInspectorUpdate}
                                />
                            )}
                        </div>
                        <button
                            type="button"
                            aria-label="Add inspector item"
                            onClick={() => setIsComponentHelperOpen(true)}
                            style={{
                                position: 'absolute',
                                right: '24px',
                                bottom: '22px',
                                width: isComponentHelperHover ? '160px' : '44px',
                                height: '44px',
                                borderRadius: '999px',
                                border: `1px solid ${colors.borderColor}`,
                                background: colors.accent,
                                color: colors.textPrimary,
                                fontSize: '24px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '0 12px',
                                transition: 'width 0.2s ease',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={() => setIsComponentHelperHover(true)}
                            onMouseLeave={() => setIsComponentHelperHover(false)}
                        >
                            <span>+</span>
                            {isComponentHelperHover && (
                                <span style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    컴포넌트 마술사
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Play Mode Overlay removed as requested */}
            </div>

            <ComponentHelper
                isOpen={isComponentHelperOpen}
                onClose={() => setIsComponentHelperOpen(false)}
                entity={localSelectedEntity}
                onUpdateEntity={handleInspectorUpdate}
            />

            {/* AI Wizard Modal */}
            <AiWizardModal
                isOpen={isAiWizardOpen}
                onClose={() => setIsAiWizardOpen(false)}
                onGenerate={handleAiGenerate}
            />

            {/* Save Toast */}
            {saveToast && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: '#2563eb',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 2000,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <i className="fa-solid fa-check-circle"></i>
                    {saveToast}
                </div>
            )}

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
                    }}
                />
            )}

            {/* Drag & Drop Modal - New Modern Design */}
            {!isPlayMode && dropModalFiles.length > 0 && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        width: '420px',
                        background: '#18181b', // Zero-dark
                        border: '1px solid #27272a',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #27272a',
                            background: '#27272a', // Slightly lighter header
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '14px',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)'
                            }}>
                                <i className="fa-solid fa-cloud-arrow-up"></i>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f4f4f5' }}>
                                새 에셋 추가 (Import Asset)
                            </h3>
                        </div>

                        {/* Preview Area */}
                        <div style={{
                            padding: '24px',
                            background: '#09090b', // Deep dark for preview
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '180px',
                            borderBottom: '1px solid #27272a'
                        }}>
                            {dropModalFiles[0] && (dropModalFiles[0].type.startsWith('image/') ? (
                                <img
                                    src={URL.createObjectURL(dropModalFiles[0])}
                                    alt="Preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '160px',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                        objectFit: 'contain'
                                    }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', color: '#71717a' }}>
                                    <i className="fa-solid fa-file-code" style={{ fontSize: '48px', marginBottom: '12px', color: '#52525b' }}></i>
                                    <p style={{ fontSize: '13px' }}>{dropModalFiles[0].name}</p>
                                </div>
                            ))}
                        </div>

                        {/* Form Area */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#71717a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Asset Name
                                </label>
                                <input
                                    type="text"
                                    value={dropAssetName}
                                    onChange={(e) => setDropAssetName(e.target.value)}
                                    placeholder="Enter asset name..."
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: '#27272a',
                                        border: '1px solid #3f3f46',
                                        borderRadius: '8px',
                                        color: '#e4e4e7',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#3f3f46'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#3f3f46'; e.target.style.background = '#27272a'; }}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#f4f4f5', marginBottom: '12px' }}>
                                    카테고리 (타입)
                                </label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[
                                        { label: "캐릭터", value: "Character" },
                                        { label: "배경/타일", value: "Tile" },
                                        { label: "무기/장비", value: "Item" },
                                        { label: "오브젝트", value: "Prop" },
                                        { label: "VFX", value: "Effect" },
                                        { label: "UI", value: "UI" },
                                        { label: "사운드", value: "Sound" },
                                        { label: "기타", value: "Default" }
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setDropAssetTag(opt.value)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '9999px',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                background: dropAssetTag === opt.value ? '#3b82f6' : '#27272a',
                                                color: dropAssetTag === opt.value ? 'white' : '#a1a1aa',
                                                boxShadow: dropAssetTag === opt.value ? '0 4px 6px -1px rgba(59, 130, 246, 0.4)' : 'inset 0 1px 2px rgba(0,0,0,0.2)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (dropAssetTag !== opt.value) {
                                                    e.currentTarget.style.background = '#3f3f46';
                                                    e.currentTarget.style.color = '#e4e4e7';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (dropAssetTag !== opt.value) {
                                                    e.currentTarget.style.background = '#27272a';
                                                    e.currentTarget.style.color = '#a1a1aa';
                                                }
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid #27272a',
                            background: '#18181b', // Footer matches body
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <button
                                onClick={() => {
                                    setDropModalFiles([]);
                                    setDropAssetName("");
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: 'transparent',
                                    border: '1px solid #3f3f46',
                                    borderRadius: '8px',
                                    color: '#a1a1aa',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#27272a'; e.currentTarget.style.color = '#e4e4e7'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}
                            >
                                취소 (Cancel)
                            </button>
                            <button
                                disabled={isUploadingAsset}
                                onClick={handleAddAsset}
                                style={{
                                    padding: '10px 24px',
                                    background: isUploadingAsset ? '#2563eb' : '#3b82f6',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: isUploadingAsset ? 'not-allowed' : 'pointer',
                                    opacity: isUploadingAsset ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'background 0.2s',
                                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
                                }}
                                onMouseEnter={(e) => { if (!isUploadingAsset) e.currentTarget.style.background = '#2563eb'; }}
                                onMouseLeave={(e) => { if (!isUploadingAsset) e.currentTarget.style.background = '#3b82f6'; }}
                            >
                                {isUploadingAsset ? (
                                    <>
                                        <i className="fa-solid fa-circle-notch fa-spin"></i> Uploading...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-check"></i> 추가하기 (Add)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SaveGameModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                initialTitle={"My Game"}
                onSave={async (title, description) => {
                    handleSaveProject();
                }}
            />

            {/* Global Saving Overlay */}
            {isSavingProject && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    pointerEvents: 'all' // Block all interaction
                }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '48px', marginBottom: '12px', color: '#3b82f6' }}></i>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>프로젝트 저장 중...</h2>
                    <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#a1a1aa' }}>잠시만 기다려 주세요. 변경 사항을 서버에 동기화하고 있습니다.</p>
                </div>
            )}

        </div>
    );
}
