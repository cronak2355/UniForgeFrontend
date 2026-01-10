import { EditorState } from "../EditorCore";
import type { EditorEntity } from "../types/Entity";
import type { Asset } from "../types/Asset";
import { buildLogicItems, splitLogicItems } from "../types/Logic";
import type { LogicComponent } from "../types/Component";
import type { ModuleGraph } from "../types/Module";

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
  texture?: string;
  x: number;
  y: number;
  variables: SceneVariableJSON[];
  events: SceneEventJSON[];
  modules?: ModuleGraph[];
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
  modules?: ModuleGraph[];
}

// NEW: Game Data Structure
export interface GameDataJSON {
  formatVersion: number; // 2
  activeSceneId: string;
  scenes: SceneJSON[];
  assets: Asset[];
  modules?: ModuleGraph[];
}

export class SceneSerializer {
  static serialize(state: EditorState): GameDataJSON {
    const scenes: SceneJSON[] = [];

    state.getScenes().forEach((sceneData) => {
      const entities = Array.from(sceneData.entities.values()).map((e) => this.serializeEntity(e));
      const tiles = Array.from(sceneData.tiles.values()).map((t) => ({
        x: t.x,
        y: t.y,
        idx: t.tile,
      }));

      scenes.push({
        sceneId: sceneData.id,
        name: sceneData.name,
        entities,
        tiles,
        assets: [] // Assets are global now, stored at root
      });
    });

    return {
      formatVersion: 2,
      activeSceneId: state.getCurrentSceneId(),
      scenes,
      assets: state.getAssets(),
      modules: state.getModules(),
    };
  }

  // Helper for single entity serialization
  private static serializeEntity(e: EditorEntity): SceneEntityJSON {
    // ... (same as before) ...
    const components = splitLogicItems(e.logic);
    const logicComponents = components.filter((comp) => comp.type === "Logic") as LogicComponent[];
    const events: SceneEventJSON[] = [];

    logicComponents.forEach((rule, idx) => {
      const triggerType = rule.event;
      if (rule.conditions && rule.conditions.length > 0) {
        // console.log(`[Serialize] Entity ${e.id} Rule ${idx} conditions:`, JSON.stringify(rule.conditions));
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
      texture: e.texture,
      x: e.x,
      y: e.y,
      variables,
      events,
      modules: e.modules ?? [],
    };
  }

  static deserialize(json: any, state: EditorState): void {
    // 1. Load Assets (Global)
    if (json.assets) {
      // Clear existing assets on full load
      // state.assets = []; // EditorState.clearAll() should have handled this

      json.assets.forEach((a: Asset) => {
        if (!state.getAssets().find((existing) => existing.id === a.id)) {
          state.addAsset(a);
        }
      });
    }

    // 2. Clear default scene if generated
    if (state.getScenes().size === 1 && state.getCurrentScene()?.entities.size === 0) {
      // It's clean state, we can overwrite or just add. 
      // Ideally state.clearAll() should be called before deserialize.
    }

    // 3. Handle Legacy Format (SceneJSON)
    if (!json.formatVersion) {
      console.log("[SceneSerializer] Detected legacy single-scene format.");
      const legacyScene = json as SceneJSON;

      // Use the existing default scene (or create one)
      let targetSceneId = state.getCurrentSceneId();
      const defaultScene = state.getCurrentScene();
      if (defaultScene) {
        state.renameScene(targetSceneId, legacyScene.name || "Imported Scene");
      } else {
        targetSceneId = state.createScene(legacyScene.name || "Imported Scene");
      }

      this.deserializeSceneContent(legacyScene, state, targetSceneId);
      return;
    }

    // 4. Handle New Format (GameDataJSON)
    const gameData = json as GameDataJSON;
    console.log(`[SceneSerializer] Loading V${gameData.formatVersion} project with ${gameData.scenes.length} scenes.`);

    if (gameData.modules && gameData.modules.length > 0) {
      state.setModules(gameData.modules);
    }

    // Remove default scene if empty
    // (Optimization: EditorState could have a loadProject method)

    // Load Scenes
    gameData.scenes.forEach(sceneJson => {
      // checks if scene already exists (for merge) or create new
      // For full load, we usually assume clean state.
      const sceneId = state.createScene(sceneJson.name, sceneJson.sceneId);
      this.deserializeSceneContent(sceneJson, state, sceneId);
    });

    // Set Active Scene
    if (gameData.activeSceneId) {
      state.switchScene(gameData.activeSceneId);
    }
  }

  private static deserializeSceneContent(json: SceneJSON, state: EditorState, sceneId: string) {
    // Switch to target scene temporarily to use addEntity/setTile which act on current scene
    // OR update EditorState to accept sceneId in addEntity logic. 
    // Current EditorState.addEntity uses getCurrentScene(), so we should switch or refactor.

    // Let's rely on temporary switch for now to avoid massive refactor of addEntity
    const prevSceneId = state.getCurrentSceneId();
    state.switchScene(sceneId);

    if (json.modules && state.getModules().length === 0) {
      state.setModules(json.modules);
    }

    json.tiles.forEach((t) => {
      state.setTile(t.x, t.y, t.idx);
    });

    json.entities.forEach((e) => {
      const variables = (e.variables ?? []).map((v) => ({ ...v }));
      const logicComponents: LogicComponent[] = (e.events ?? []).map((ev, i) => {
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
        texture: e.texture ?? e.name,
        variables: variables as any[],
        events: [],
        logic: buildLogicItems({
          components: logicComponents,
        }),
        components: logicComponents,
        modules: e.modules ?? [],
      };

      state.addEntity(entity);
    });

    // Restore previous scene if we are just loading data
    if (prevSceneId !== sceneId) {
      state.switchScene(prevSceneId);
    }
  }
}
