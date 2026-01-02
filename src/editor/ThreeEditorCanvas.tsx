import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { useEditorCore, useEditorCoreSnapshot } from "../contexts/EditorCoreContext";
import type { EditorEntity, PrimitiveType } from "./types/Entity";
import type { IEditorMode } from "./editorMode/IEditorMode";
import { ThreeCameraMode, type ThreeEditorScene, type ThreePointer } from "./editorMode/threeModes";

type GizmoMode = "translate" | "rotate" | "scale";

export function ThreeEditorCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const transformRef = useRef<TransformControls | null>(null);
    const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const selectedIdRef = useRef<string | null>(null);
    const isTransformingRef = useRef(false);
    const frameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number | null>(null);
    const isLookingRef = useRef(false);
    const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
    const yawRef = useRef(0);
    const pitchRef = useRef(0);
    const keyStateRef = useRef({
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        shift: false,
    });
    const moveSpeedRef = useRef(6);

    const { entities, selectedEntity } = useEditorCoreSnapshot();
    const core = useEditorCore();
    const [gizmoMode, setGizmoMode] = useState<GizmoMode>("translate");
    const modeRef = useRef<IEditorMode<ThreeEditorScene, ThreePointer>>(new ThreeCameraMode());
    const threeSceneAdapterRef = useRef<ThreeEditorScene>({
        pickEntityId: () => null,
        getEntityById: () => undefined,
        setSelectedEntity: () => { /* noop */ },
        attachTransformTo: () => { /* noop */ },
    });

    useEffect(() => {
        if (!containerRef.current || rendererRef.current) return;

        const container = containerRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d1117);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
        camera.position.set(6, 6, 8);
        camera.rotation.order = "YXZ";
        yawRef.current = camera.rotation.y;
        pitchRef.current = camera.rotation.x;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        rendererRef.current = renderer;
        container.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(6, 10, 4);
        scene.add(directional);

        const grid = new THREE.GridHelper(50, 50, 0x2f3b46, 0x1f2a33);
        scene.add(grid);

        const axes = new THREE.AxesHelper(3);
        scene.add(axes);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        const transform = new TransformControls(camera, renderer.domElement);
        transform.addEventListener("dragging-changed", (event) => {
            isTransformingRef.current = event.value;
        });
        transform.addEventListener("objectChange", () => {
            const id = selectedIdRef.current;
            if (!id) return;
            const mesh = meshesRef.current.get(id);
            if (!mesh) return;

            const current = core.getEntities().get(id);
            if (!current) return;

            const updated: EditorEntity = {
                ...current,
                x: mesh.position.x,
                y: mesh.position.y,
                z: mesh.position.z,
                rotationX: mesh.rotation.x,
                rotationY: mesh.rotation.y,
                rotationZ: mesh.rotation.z,
                scaleX: mesh.scale.x,
                scaleY: mesh.scale.y,
                scaleZ: mesh.scale.z,
            };

            core.addEntity(updated);
            core.setSelectedEntity(updated);
        });
        scene.add(transform);
        transformRef.current = transform;

        threeSceneAdapterRef.current = {
            pickEntityId: (pointerEvent) => {
                if (!rendererRef.current || !cameraRef.current) return null;
                const rect = rendererRef.current.domElement.getBoundingClientRect();
                pointer.x = ((pointerEvent.clientX - rect.left) / rect.width) * 2 - 1;
                pointer.y = -((pointerEvent.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(pointer, cameraRef.current);
                const meshes = Array.from(meshesRef.current.values());
                const hits = raycaster.intersectObjects(meshes, false);
                if (hits.length === 0) return null;
                const hit = hits[0].object as THREE.Mesh;
                return (hit.userData?.entityId as string | undefined) ?? null;
            },
            getEntityById: (id) => core.getEntities().get(id),
            setSelectedEntity: (entity) => {
                core.setSelectedEntity(entity);
            },
            attachTransformTo: (id) => {
                const transformControls = transformRef.current;
                if (!transformControls) return;
                if (!id) {
                    transformControls.detach();
                    return;
                }
                const mesh = meshesRef.current.get(id);
                if (!mesh) {
                    transformControls.detach();
                    return;
                }
                transformControls.attach(mesh);
            },
        };

        const resize = () => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;
            rendererRef.current.setSize(clientWidth, clientHeight, false);
            cameraRef.current.aspect = clientWidth / Math.max(1, clientHeight);
            cameraRef.current.updateProjectionMatrix();
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(container);

        const onPointerDown = (event: PointerEvent) => {
            if (isTransformingRef.current) return;
            const mode = modeRef.current;
            const pointerEvent: ThreePointer = { clientX: event.clientX, clientY: event.clientY };
            mode.onPointerDown(threeSceneAdapterRef.current, pointerEvent);
            core.sendContextToEditorModeStateMachine({
                currentMode: mode,
                mouse: "mousedown",
            });

            if (event.button === 0) {
                isLookingRef.current = true;
                lastPointerRef.current = { x: event.clientX, y: event.clientY };
            }
        };

        const onPointerMove = (event: PointerEvent) => {
            const mode = modeRef.current;
            const pointerEvent: ThreePointer = { clientX: event.clientX, clientY: event.clientY };
            mode.onPointerMove(threeSceneAdapterRef.current, pointerEvent);
            core.sendContextToEditorModeStateMachine({
                currentMode: mode,
                mouse: "mousemove",
            });

            if (!isLookingRef.current || isTransformingRef.current) return;
            const prev = lastPointerRef.current;
            if (!prev) {
                lastPointerRef.current = { x: event.clientX, y: event.clientY };
                return;
            }

            const dx = event.clientX - prev.x;
            const dy = event.clientY - prev.y;
            lastPointerRef.current = { x: event.clientX, y: event.clientY };

            const sensitivity = 0.0025;
            yawRef.current -= dx * sensitivity;
            pitchRef.current -= dy * sensitivity;
            const maxPitch = Math.PI / 2 - 0.01;
            pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));

            camera.rotation.order = "YXZ";
            camera.rotation.y = yawRef.current;
            camera.rotation.x = pitchRef.current;
        };

        const onPointerUp = (event: PointerEvent) => {
            const mode = modeRef.current;
            const pointerEvent: ThreePointer = { clientX: event.clientX, clientY: event.clientY };
            mode.onPointerUp(threeSceneAdapterRef.current, pointerEvent);
            core.sendContextToEditorModeStateMachine({
                currentMode: mode,
                mouse: "mouseup",
            });
            if (event.button === 0) {
                isLookingRef.current = false;
                lastPointerRef.current = null;
            }
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerup", onPointerUp);

        const animate = (time: number) => {
            frameRef.current = requestAnimationFrame(animate);

            const last = lastFrameTimeRef.current ?? time;
            const dt = Math.min((time - last) / 1000, 0.05);
            lastFrameTimeRef.current = time;

            if (!isTransformingRef.current) {
                applyWASDMovement(camera, keyStateRef.current, dt, moveSpeedRef.current);
            }

            renderer.render(scene, camera);
        };
        animate();

        const onKeyDown = (event: KeyboardEvent) => {
            switch (event.code) {
                case "KeyW":
                    keyStateRef.current.w = true;
                    break;
                case "KeyA":
                    keyStateRef.current.a = true;
                    break;
                case "KeyS":
                    keyStateRef.current.s = true;
                    break;
                case "KeyD":
                    keyStateRef.current.d = true;
                    break;
                case "Space":
                    keyStateRef.current.space = true;
                    break;
                case "ShiftLeft":
                case "ShiftRight":
                    keyStateRef.current.shift = true;
                    break;
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            switch (event.code) {
                case "KeyW":
                    keyStateRef.current.w = false;
                    break;
                case "KeyA":
                    keyStateRef.current.a = false;
                    break;
                case "KeyS":
                    keyStateRef.current.s = false;
                    break;
                case "KeyD":
                    keyStateRef.current.d = false;
                    break;
                case "Space":
                    keyStateRef.current.space = false;
                    break;
                case "ShiftLeft":
                case "ShiftRight":
                    keyStateRef.current.shift = false;
                    break;
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            observer.disconnect();
            renderer.domElement.removeEventListener("pointerdown", onPointerDown);
            renderer.domElement.removeEventListener("pointermove", onPointerMove);
            renderer.domElement.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            transform.dispose();
            renderer.dispose();
            if (renderer.domElement.parentElement) {
                renderer.domElement.parentElement.removeChild(renderer.domElement);
            }
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
            lastFrameTimeRef.current = null;
            meshesRef.current.forEach((mesh) => {
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((mat) => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            });
            meshesRef.current.clear();
            rendererRef.current = null;
            sceneRef.current = null;
            cameraRef.current = null;
            transformRef.current = null;
        };
    }, [core]);

    useEffect(() => {
        core.sendContextToEditorModeStateMachine({
            currentMode: modeRef.current,
            mouse: "mouseup",
        });
    }, [core]);

    useEffect(() => {
        const transform = transformRef.current;
        if (!transform) return;
        transform.setMode(gizmoMode);
    }, [gizmoMode]);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        const meshMap = meshesRef.current;
        const nextIds = new Set(
            entities.filter((e) => e.renderMode === "3D").map((e) => e.id)
        );

        for (const [id, mesh] of meshMap.entries()) {
            if (!nextIds.has(id)) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((mat) => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
                meshMap.delete(id);
            }
        }

        for (const entity of entities) {
            if (entity.renderMode !== "3D") continue;
            let mesh = meshMap.get(entity.id);
            if (!mesh) {
                mesh = createMesh(entity.primitive ?? "box");
                mesh.userData.entityId = entity.id;
                scene.add(mesh);
                meshMap.set(entity.id, mesh);
            }
            applyTransform(mesh, entity);
        }
    }, [entities]);

    useEffect(() => {
        const transform = transformRef.current;
        if (!transform) return;

        if (!selectedEntity || selectedEntity.renderMode !== "3D") {
            selectedIdRef.current = null;
            transform.detach();
            return;
        }

        const mesh = meshesRef.current.get(selectedEntity.id);
        if (!mesh) {
            selectedIdRef.current = null;
            transform.detach();
            return;
        }

        selectedIdRef.current = selectedEntity.id;
        transform.attach(mesh);
    }, [selectedEntity]);

    const createPrimitiveEntity = (primitive: PrimitiveType) => {
        const id = crypto.randomUUID();
        const entity: EditorEntity = {
            id,
            type: "mesh",
            renderMode: "3D",
            primitive,
            name: `Mesh_${primitive}_${id.slice(0, 4)}`,
            x: 0,
            y: 0.5,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
            variables: [],
            events: [],
            components: [],
            rules: [],
            modules: [],
        };

        core.addEntity(entity);
        core.setSelectedEntity(entity);
    };

    return (
        <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "12px",
            overflow: "hidden",
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                padding: "8px 12px",
                background: "#161b22",
                border: "2px solid #30363d",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#8b949e",
            }}>
                <span>3D Scene</span>
                <div style={{ display: "flex", gap: "6px", marginLeft: "12px" }}>
                    <button
                        type="button"
                        onClick={() => createPrimitiveEntity("box")}
                        style={toolbarButtonStyle}
                    >
                        + Cube
                    </button>
                    <button
                        type="button"
                        onClick={() => createPrimitiveEntity("sphere")}
                        style={toolbarButtonStyle}
                    >
                        + Sphere
                    </button>
                    <button
                        type="button"
                        onClick={() => createPrimitiveEntity("plane")}
                        style={toolbarButtonStyle}
                    >
                        + Plane
                    </button>
                </div>
                <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                    {(["translate", "rotate", "scale"] as GizmoMode[]).map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setGizmoMode(mode)}
                            style={{
                                ...toolbarButtonStyle,
                                background: gizmoMode === mode ? "#1f6feb" : "#21262d",
                            }}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    background: "#0d1117",
                    border: "2px solid #30363d",
                    borderRadius: "6px",
                    overflow: "hidden",
                }}
            />
        </div>
    );
}

const toolbarButtonStyle: CSSProperties = {
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 600,
    background: "#21262d",
    border: "1px solid #30363d",
    borderRadius: "4px",
    color: "#f0f6fc",
    cursor: "pointer",
};

function createMesh(primitive: PrimitiveType): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    switch (primitive) {
        case "sphere":
            geometry = new THREE.SphereGeometry(0.5, 32, 16);
            break;
        case "plane":
            geometry = new THREE.PlaneGeometry(2, 2);
            break;
        case "box":
        default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
            break;
    }

    const material = new THREE.MeshStandardMaterial({ color: 0x7cc7ff });
    const mesh = new THREE.Mesh(geometry, material);
    if (primitive === "plane") {
        mesh.rotation.x = -Math.PI / 2;
    }
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
}

function applyTransform(mesh: THREE.Mesh, entity: EditorEntity) {
    mesh.position.set(entity.x, entity.y, entity.z);
    mesh.rotation.set(entity.rotationX, entity.rotationY, entity.rotationZ);
    mesh.scale.set(entity.scaleX, entity.scaleY, entity.scaleZ);
}

function applyWASDMovement(
    camera: THREE.PerspectiveCamera,
    keys: { w: boolean; a: boolean; s: boolean; d: boolean; space: boolean; shift: boolean },
    dt: number,
    speed: number
) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() === 0) return;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const move = new THREE.Vector3();

    if (keys.w) move.add(forward);
    if (keys.s) move.addScaledVector(forward, -1);
    if (keys.d) move.add(right);
    if (keys.a) move.addScaledVector(right, -1);

    if (keys.space) {
        move.y += 1;
    }
    if (keys.shift) {
        move.y -= 1;
    }

    if (move.lengthSq() === 0) return;
    move.normalize().multiplyScalar(speed * dt);

    camera.position.add(move);
}
