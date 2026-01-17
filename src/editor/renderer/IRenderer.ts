export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface ScreenCoord {
    x: number;
    y: number;
}

export interface SpawnOptions {
    texture?: string;
    name?: string;
    width?: number;
    height?: number;
    color?: number;
    events?: any[];
}

export interface IRenderer {
    init(container: HTMLElement, config?: { width: number; height: number }): Promise<void>;
    destroy(): void;

    // Core Entity Lifecycle
    spawn(id: string, type: string, x: number, y: number, z: number, options?: SpawnOptions): void;
    remove(id: string): void;
    clear(): void; // Scene Change Cleanup

    update(id: string, x: number, y: number, z?: number, rotation?: number): void;
    setScale(id: string, scaleX: number, scaleY: number, scaleZ?: number): void;
    setAlpha(id: string, alpha: number): void;
    setTint(id: string, color: number): void;

    // Visuals
    setText(id: string, text: string): void;
    updateText(id: string, text: string): void;
    setBarValue(id: string, value: number, max?: number): void;
    updateBar(id: string, ratio: number): void; // ratio 0.0 ~ 1.0

    // Camera
    setCameraPosition(x: number, y: number): void;
    setCameraZoom(zoom: number): void;

    // Animation
    playAnim(id: string, animName: string, loop?: boolean): void;

    // Assets
    setPreloadAssets(assets: any[]): void;
    updateAssets?(assets: any[]): void;
    addCanvasTexture(key: string, canvas: HTMLCanvasElement): void;
    initTilemap(tilesetKey: string): void;
    setTile(x: number, y: number, tileIdx: number): void;
    removeTile(x: number, y: number): void;
    refreshEntityTexture(id: string, textureKey: string): void;

    // State props
    gameCore?: any;
    gameConfig?: any;
    useEditorCoreRuntimePhysics?: boolean;
    isRuntimeMode?: boolean;

    // Inputs / Callbacks
    onUpdateCallback?: (time: number, delta: number) => void;
    getRuntimeContext?: () => any;
    onInputState?: (input: any) => void;
    // [FIX] Update signature to match PhaserRenderer implementation (3 args)
    onEntityClick?: (id: string, worldX: number, worldY: number) => void;
}
