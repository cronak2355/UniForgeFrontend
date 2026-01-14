import type { EditorVariable } from "../types/Variable";

/**
 * Runtime Entity
 * 
 * Pure data structure representing an entity in the runtime.
 * Does NOT contain logic.
 */
export interface RuntimeEntity {
    readonly id: string;

    // Core Transform Data (Hot Path)
    x: number;
    y: number;
    rotation: number; // Z-rotation in 2D
    scaleX: number;
    scaleY: number;

    // Optional 3D/Layer Data
    z: number;
    rotationX: number;
    rotationY: number;
    scaleZ: number;

    // Metadata
    name: string;
    active: boolean;

    // Legacy / Compatibility
    modules?: any[];

    // NOTE: Variables are stored in RuntimeContext, but we keep a reference 
    // here for easy initialization or editor sync if needed. 
    // In a pure DOTS approach, these might be separate, but we keep them accessible.
    // variables: Map<string, RuntimeVariable>; 
}
