import { EditorState } from "../EditorCore";
import type { EditorEntity } from "../types/Entity";
import type { Asset } from "../types/Asset";
import { buildLogicItems, splitLogicItems } from "../types/Logic";
import type { LogicComponent } from "../types/Component";

export interface SceneEventJSON {
  id: string;
  trigger: string;
  triggerParams?: Record<string, unknown>;
  conditionLogic?: "AND" | "OR";
  conditions?: Array<{ type: string;[key: string]: unknown }>;
  action: string;
  params?: Record<string, unknown>;
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
  variables: SceneVariableJSON[];
  events: SceneEventJSON[];
}

export interface TileJSON {
  x: number;
  y: number;
  idx: number;
}

export interface SceneJSON {
  sceneId: string;
  name: string;
  entities: SceneEntityJSON[];
  tiles: TileJSON[];
  assets: Asset[];
}

export class SceneSerializer {
  static serialize(state: EditorState, sceneName: string = "Scene 1"): SceneJSON {
    const entities = Array.from(state.getEntities().values()).map((e) => this.serializeEntity(e));
    const tiles = Array.from(state.getTiles().values()).map((t) => ({
      x: t.x,
      y: t.y,
      idx: t.tile,
    }));

    return {
      sceneId: `scene_${Date.now()}`,
      name: sceneName,
      entities,
      tiles,
      assets: state.getAssets(),
    };
  }

  private static serializeEntity(e: EditorEntity): SceneEntityJSON {
    const components = splitLogicItems(e.logic);
    const logicComponents = components.filter((comp) => comp.type === "Logic") as LogicComponent[];
    const events: SceneEventJSON[] = [];

    logicComponents.forEach((rule, idx) => {
      const triggerType = rule.event;
      // Debug: Log conditions during serialization
      if (rule.conditions && rule.conditions.length > 0) {
        console.log(`[Serialize] Entity ${e.id} Rule ${idx} conditions:`, JSON.stringify(rule.conditions));
      }
      rule.actions.forEach((action: any, actionIdx: number) => {
        events.push({
          id: `ev_${idx}_${actionIdx}`,
          trigger: triggerType,
          triggerParams: rule.eventParams,
          conditionLogic: rule.conditionLogic,
          conditions: rule.conditions ?? [],
          action: action.type,
          params: {
            ...action,
            type: undefined,
          },
        });
      });
    });

    const variables = e.variables.map((v: any) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      value: v.value,
    }));

    return {
      id: e.id,
      type: e.type,
      name: e.name,
      x: e.x,
      y: e.y,
      variables,
      events,
    };
  }

  static deserialize(json: SceneJSON, state: EditorState): void {
    if (json.assets) {
      json.assets.forEach((a) => {
        if (!state.getAssets().find((existing) => existing.id === a.id)) {
          state.addAsset(a);
        }
      });
    }

    json.tiles.forEach((t) => {
      state.setTile(t.x, t.y, t.idx);
    });

    json.entities.forEach((e) => {
      const variables = (e.variables ?? []).map((v) => ({ ...v }));
      const logicComponents: LogicComponent[] = (e.events ?? []).map((ev, i) => {
        // Debug: Log conditions during deserialization
        if (ev.conditions && ev.conditions.length > 0) {
          console.log(`[Deserialize] Entity ${e.id} Event ${i} conditions:`, JSON.stringify(ev.conditions));
        }
        return {
          id: `logic_${i}`,
          type: "Logic",
          event: ev.trigger,
          eventParams: ev.triggerParams ?? {},
          conditions: ev.conditions ?? [],
          conditionLogic: ev.conditionLogic ?? "AND",
          actions: [{ type: ev.action, ...(ev.params || {}) }],
        };
      });

      const entity: EditorEntity = {
        id: e.id,
        type: e.type as "sprite" | "container" | "nineSlice",
        name: e.name,
        x: e.x,
        y: e.y,
        z: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        role: "neutral",
        texture:
          e.type === "asset_player"
            ? "player"
            : e.name.toLowerCase().includes("dragon")
              ? "dragon"
              : "test1",
        variables: variables as any[],
        events: [],
        logic: buildLogicItems({
          components: logicComponents,
        }),
        components: logicComponents,
      };

      state.addEntity(entity);
    });
  }
}
