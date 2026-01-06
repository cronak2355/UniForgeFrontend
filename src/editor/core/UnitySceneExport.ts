// UnitySceneExporter.ts

import { EditorState } from "../EditorCore";
import type { EditorEntity } from "../types/Entity"

// --- Unity Export JSON ---

export interface UnitySceneJSON {
    sceneId: string;
    name: string;
    entities: UnityEntityJSON[];
    tiles: UnityTileJSON[];
    assets: any[];
}

export interface UnityEntityJSON {
    id: string;
    type: string;
    name: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    variables: UnityVariableJSON[];
    events: UnityEventJSON[];
    modules?: any[];
}

export interface UnityVariableJSON {
    id: string;
    name: string;
    type: string;
    value: any;
}

export interface UnityEventJSON {
    id: string;
    trigger: string;
    action: string;
    params?: Record<string, unknown>;
}

export interface UnityTileJSON {
    x: number;
    y: number;
    index: number;
}

export class UnitySceneExporter {
    static export(state: EditorState, sceneName = "Scene"): UnitySceneJSON {
        return {
            sceneId: `scene_${Date.now()}`,
            name: sceneName,
            entities: Array.from(state.getEntities().values()).map(e =>
                this.exportEntity(e)
            ),
            tiles: Array.from(state.getTiles().values()).map(t => ({
                x: t.x,
                y: t.y,
                index: t.tile,
            })),
            assets: state.getAssets(),
        };
    }

    private static exportEntity(e: EditorEntity): UnityEntityJSON {
        const events: UnityEventJSON[] = [];

        e.rules.forEach(rule => {
            rule.actions.forEach((action, idx) => {
                events.push({
                    id: `ev_${rule.id}_${idx}`,
                    trigger: rule.trigger.type,
                    action: action.type,
                    params: {
                        ...action,
                        type: undefined,
                    },
                });
            });
        });

        return {
            id: e.id,
            type: e.type,
            name: e.name,
            position: {
                x: e.x,
                y: e.y,
                z: e.z ?? 0,
            },
            variables: e.variables.map(v => ({
                id: v.id,
                name: v.name,
                type: v.type,
                value: v.value,
            })),
            events,
            modules: e.modules,
        };
    }
}
