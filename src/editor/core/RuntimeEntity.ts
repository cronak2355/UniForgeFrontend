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
    role?: string;

    // Legacy / Compatibility
    modules?: any[];

    // NOTE: Variables are stored in RuntimeContext, but we keep a reference 
    // here for easy initialization or editor sync if needed. 
    variables: EditorVariable[];

    // Tags
    tags?: string[];
}
