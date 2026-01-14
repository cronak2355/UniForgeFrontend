import type { EditorComponent } from "../types/Component";

/**
 * Runtime Component
 * 
 * Data holder for component state.
 * Actual logic is handled by Systems/Pipelines using this data.
 */
export interface RuntimeComponent {
    /** The entity this component belongs to */
    readonly entityId: string;

    /** Component Type Identifier */
    readonly type: string;

    /** 
     * Raw data from the editor component. 
     * Systems should cast this to specific component types.
     */
    readonly data: EditorComponent;

    /**
     * Runtime-specific temporary state for this component.
     * (e.g. current tween progress, internal timers)
     */
    executionState?: Record<string, unknown>;
}
