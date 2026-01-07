// UnitySceneExporter.ts

import { EditorState } from "../EditorCore";
import type { EditorEntity } from "../types/Entity";
import { splitLogicItems } from "../types/Logic";
import type { LogicComponent } from "../types/Component";

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
    x: number;
    y: number;
    variables: UnityVariableJSON[];
    events: UnityEventJSON[];
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
    triggerParams?: Record<string, unknown>;
    action: string;
    params?: Record<string, unknown>;
}

export interface UnityTileJSON {
    x: number;
    y: number;
    idx: number;
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
                idx: t.tile,
            })),
            assets: state.getAssets(),
        };
    }

    private static exportEntity(e: EditorEntity): UnityEntityJSON {
        const events: UnityEventJSON[] = [];
        const components = splitLogicItems(e.logic);
        const logicComponents = components.filter((component): component is LogicComponent => component.type === "Logic");

        logicComponents.forEach((component) => {
            component.actions.forEach((action, idx) => {
                events.push({
                    id: `ev_${component.id}_${idx}`,
                    trigger: component.event,
                    triggerParams: component.eventParams,
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
            x: e.x,
            y: e.y,
            variables: e.variables.map(v => ({
                id: v.id,
                name: v.name,
                type: v.type,
                value: v.value,
            })),
            events,
        };
    }
}
