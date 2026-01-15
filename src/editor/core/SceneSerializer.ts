import { EditorState } from "../EditorCore";
import type { EditorEntity } from "../types/Entity";
import type { Asset } from "../types/Asset";
import { buildLogicItems, splitLogicItems } from "../types/Logic";
import type { LogicComponent } from "../types/Component";
import type { ModuleGraph } from "../types/Module";

// ===== URL Conversion for Unity =====

/**
 * API 호스트 URL (환경변수 또는 현재 Origin 사용)
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

/**
 * Converts a relative proxy URL to an absolute URL that Unity can access directly.
 * - `/api/assets/s3/...` → `https://yourdomain.com/api/assets/s3/...`
 * - Already absolute URLs are returned as-is.
 * - Data URLs (base64) are returned as-is.
 */
function toAbsoluteUrl(url: string | undefined): string {
  if (!url) return "";

  // Already absolute or data URL
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }

  // Relative URL → Absolute URL
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  // Fallback: return as-is
  return url;
}

/**
 * Converts Asset URLs to Unity-accessible absolute URLs.
 */
function exportAssetForUnity(asset: Asset): Asset {
  return {
    ...asset,
    url: toAbsoluteUrl(asset.url),
    imageUrl: asset.imageUrl ? toAbsoluteUrl(asset.imageUrl) : undefined,
  };
}

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
  components?: any[]; // Full component list for high-fidelity export
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
      assets: state.getAssets().map(exportAssetForUnity),
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
      components, // Export ALL components to preserve data fidelity
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
          // Retroactive fix: if metadata is missing but description has JSON, parse it
          if (!a.metadata && a.description && a.description.startsWith('{')) {
            try {
              a.metadata = JSON.parse(a.description);
            } catch (e) { /* ignore invalid json */ }
          }
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
      // Migration: Fix corrupted variable types (e.g., "any" -> detect actual type from value)
      const variables = (e.variables ?? []).map((v) => {
        let fixedType = v.type;
        // If type is "any" or missing, infer from value
        if (!fixedType || fixedType === "any") {
          if (typeof v.value === 'object' && v.value !== null && 'x' in v.value && 'y' in v.value) {
            fixedType = "vector2";
            console.log(`[SceneSerializer] Migrating var '${v.name}' type 'any' -> 'vector2'`);
          } else if (typeof v.value === "boolean") {
            fixedType = "bool";
          } else if (typeof v.value === "number") {
            fixedType = Number.isInteger(v.value) ? "int" : "float";
          } else {
            fixedType = "string";
          }
        }
        return { ...v, type: fixedType };
      });
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
