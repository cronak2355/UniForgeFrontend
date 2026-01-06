import { EditorState, TilePlacement } from "../EditorCore";
import type { EditorEntity } from "./types/Entity";
import type { GameRule } from "./events/RuleEngine";
import type { Asset } from "./types/Asset";

// --- Scene JSON Interfaces ---
export interface SceneEventJSON {
    id: string;
    trigger: string;
    action: string;
    params?: Record<string, unknown>;
    // 조건을 포함하려면 여기에 추가해야 함. 현재 예시에는 없음.
    // 예: conditions?: Array<{ type: string, params: ... }>
}

export interface SceneVariableJSON {
    id: string;
    name: string;
    type: string;
    value: any;
}

export interface SceneEntityJSON {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    // z, scale, rotation 등 추가 속성 필요시 확장
    variables: SceneVariableJSON[];
    events: SceneEventJSON[];

    // EditorModule 데이터를 저장하기 위한 커스텀 필드 (양식에 없지만 필수)
    // 양식에 맞추기 위해 'modules' 대신 'components'나 'properties'로 넣거나,
    // 별도 필드로 합의해야 함. 일단 양식을 지키되 확장을 위해 metaData 등을 사용.
    // 혹은 User가 제시한 양식은 '예시'이므로 필수 데이터인 modules를 포함시킴.
    modules?: any[];
}

export interface TileJSON {
    x: number;
    y: number;
    idx: number; // tile index inside tileset
}

export interface SceneJSON {
    sceneId: string;
    name: string;
    entities: SceneEntityJSON[];
    tiles: TileJSON[];
    assets: Asset[]; // 에셋 정보도 저장해야 불러올 때 텍스처 로드 가능
}

// --- Serializer ---

export class SceneSerializer {
    static serialize(state: EditorState, sceneName: string = "Scene 1"): SceneJSON {
        const entities = Array.from(state.getEntities().values()).map(e => this.serializeEntity(e));
        const tiles = Array.from(state.getTiles().values()).map(t => ({
            x: t.x,
            y: t.y,
            idx: t.tile
        }));

        return {
            sceneId: `scene_${Date.now()}`,
            name: sceneName,
            entities,
            tiles,
            assets: state.getAssets()
        };
    }

    private static serializeEntity(e: EditorEntity): SceneEntityJSON {
        // Rules -> Events 변환
        // Rule 하나가 여러 Action을 가질 수 있으므로, 펼쳐서 Event 리스트로 만듦.
        // (단, 조건Condition은 현재 단순 Event Trigger 구조에 매핑하기 어려우므로, 
        //  User 양식에 condition 필드가 없다면 손실될 수 있음. 
        //  일단 가장 근접하게 trigger -> action 매핑)
        const events: SceneEventJSON[] = [];

        e.rules.forEach(rule => {
            const triggerType = rule.trigger.type;

            rule.actions.forEach((action, idx) => {
                events.push({
                    id: `ev_${rule.id}_${idx}`,
                    trigger: triggerType,
                    action: action.type, // Move, ShowDialogue, etc.
                    params: {
                        ...action,
                        type: undefined // params에는 type 제외
                    }
                });
            });
        });

        // Variables 변환
        const variables = e.variables.map(v => ({
            id: v.id,
            name: v.name,
            type: v.type,
            value: v.value
        }));

        return {
            id: e.id,
            type: e.type, // "sprite" etc.
            name: e.name,
            x: e.x,
            y: e.y,
            variables,
            events,
            modules: e.modules // 원본 데이터 보존
        };
    }

    static deserialize(json: SceneJSON, state: EditorState): void {
        // 1. Reset State (Method needs to be added to EditorState)
        // state.clear(); 

        // 2. Restore Tiles
        json.tiles.forEach(t => {
            state.setTile(t.x, t.y, t.idx);
        });

        // 3. Restore Entities
        json.entities.forEach(e => {
            // Events -> Rules 역변환
            // (1:1 매핑으로 복원. 조건Condition 데이터 손실 주의)
            const rules: GameRule[] = e.events.map((ev, i) => ({
                id: ev.id || `rule_${i}`,
                name: `Rule ${i}`,
                trigger: { type: ev.trigger, params: {} },
                conditions: [], // JSON 양식에 조건 필드가 없어서 빈 배열
                actions: [{
                    type: ev.action,
                    ...ev.params
                }]
            }));

            const entity: EditorEntity = {
                id: e.id,
                type: e.type,
                name: e.name,
                x: e.x,
                y: e.y,
                z: 0, // Default
                texture: e.type === "asset_player" ? "player" : (e.name.toLowerCase().includes("dragon") ? "dragon" : "test1"), // Texture mapping logic needed
                variables: e.variables.map(v => ({ ...v })),
                events: [],
                components: [], // Basic components
                modules: e.modules || [], // Restore modules
                rules
            };

            state.addEntity(entity);
        });
    }
}
