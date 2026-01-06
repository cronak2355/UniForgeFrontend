import { EditorState } from "../EditorCore";
import type { EditorEntity } from "../types/Entity";
import type { Asset } from "../types/Asset";
import { buildLogicItems, splitLogicItems } from "../types/Logic";
import type { LogicComponent } from "../types/Component";

export interface SceneEventJSON {
  id: string;
  trigger: string;
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
      rule.actions.forEach((action: any, actionIdx: number) => {
        events.push({
          id: `ev_${idx}_${actionIdx}`,
          trigger: triggerType,
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
    json.tiles.forEach((t) => {
      state.setTile(t.x, t.y, t.idx);
    });

    json.entities.forEach((e) => {
      const legacyModules = (e as SceneEntityJSON & { modules?: any[] }).modules ?? [];
      const variables = (e.variables ?? []).map((v) => ({ ...v }));
      const logicComponents: LogicComponent[] = (e.events ?? []).map((ev, i) => ({
        id: `logic_${i}`,
        type: "Logic",
        event: ev.trigger,
        eventParams: {},
        conditions: [],
        conditionLogic: "AND",
        actions: [{ type: ev.action, ...(ev.params || {}) }],
      }));
      const existingNames = new Set(variables.map((v) => v.name));
      const pushVar = (name: string, type: string, value: any) => {
        if (existingNames.has(name)) return;
        variables.push({ id: crypto.randomUUID(), name, type, value });
        existingNames.add(name);
      };

      if (legacyModules.length > 0) {
        for (const mod of legacyModules) {
          if (!mod || typeof mod !== "object") continue;
          if (mod.type === "Status") {
            pushVar("hp", "float", mod.hp ?? 100);
            pushVar("maxHp", "float", mod.maxHp ?? 100);
            pushVar("mp", "float", mod.mp ?? 50);
            pushVar("maxMp", "float", mod.maxMp ?? 50);
            pushVar("attack", "float", mod.attack ?? 10);
            pushVar("defense", "float", mod.defense ?? 0);
            pushVar("speed", "float", mod.speed ?? 200);
          }
          if (mod.type === "Kinetic") {
            pushVar("physicsMode", "string", mod.mode ?? "TopDown");
            pushVar("maxSpeed", "float", mod.maxSpeed ?? 200);
            pushVar("gravity", "float", mod.gravity ?? 800);
            pushVar("jumpForce", "float", mod.jumpForce ?? 400);
          }
          if (mod.type === "Combat") {
            pushVar("attackRange", "float", mod.attackRange ?? 100);
            pushVar("attackInterval", "float", mod.attackInterval ?? 500);
            pushVar("damage", "float", mod.damage ?? 10);
            pushVar("projectileSpeed", "float", mod.projectileSpeed ?? 300);
          }
        }
      }

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
