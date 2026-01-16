// UnitySceneExporter.ts

import { EditorState } from "../EditorCore";
import type { EditorEntity } from "../types/Entity";
import type { Asset } from "../types/Asset";
import { splitLogicItems } from "../types/Logic";
import type { LogicComponent } from "../types/Component";

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

// ===== Unity Export JSON Types =====

export interface UnitySceneJSON {
  sceneId: string;
  name: string;
  entities: UnityEntityJSON[];
  tiles: UnityTileJSON[];
  assets: Asset[];
}

export interface UnityEntityJSON {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  rotation?: number; // Added
  scaleX?: number;   // Added
  scaleY?: number;   // Added
  role?: string;     // Added
  tags?: string[];   // Added
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
  conditionLogic?: "AND" | "OR";
  conditions?: Array<{ type: string;[key: string]: unknown }>;
  action: string;
  params?: Record<string, unknown>;
}

export interface UnityTileJSON {
  x: number;
  y: number;
  idx: number;
}

// ===== Exporter =====

export class UnitySceneExporter {
  static export(state: EditorState, sceneName = "Scene"): UnitySceneJSON {
    return {
      sceneId: `scene_${Date.now()}`,
      name: sceneName,
      entities: Array.from(state.getEntities().values()).map((e) =>
        this.exportEntity(e)
      ),
      tiles: Array.from(state.getTiles().values()).map((t) => ({
        x: t.x,
        y: t.y,
        idx: t.tile,
      })),
      assets: state.getAssets().map(exportAssetForUnity),
    };
  }

  private static exportEntity(e: EditorEntity): UnityEntityJSON {
    const components = splitLogicItems(e.logic);
    const logicComponents = components.filter(
      (c): c is LogicComponent => c.type === "Logic"
    );

    const events: UnityEventJSON[] = logicComponents.map((lc, index) => ({
      id: `ev_${lc.id.substring(0, 4)}_${index}`,
      trigger: lc.event,
      triggerParams: lc.eventParams,
      conditionLogic: (lc.conditionLogic === "OR" ? "OR" : "AND") as "AND" | "OR",
      conditions: lc.conditions,
      action: lc.actions[0]?.type || "None",
      params: lc.actions[0] ? { ...lc.actions[0] } : undefined,
    }));

    // Remove 'type' from params to avoid duplication
    events.forEach(ev => {
      if (ev.params) delete (ev.params as any).type;
    });

    return {
      id: e.id,
      type: e.type, // Fixed: use e.type (sprite/container) instead of e.tag
      name: e.name,
      x: e.x,
      y: e.y,
      rotation: typeof e.rotation === 'object' ? (e.rotation as any).z || 0 : e.rotation || 0, // [Fix] Handle object rotation
      scaleX: e.scaleX ?? 1,
      scaleY: e.scaleY ?? 1,
      role: e.role,
      tags: e.tags || [],
      variables: e.variables.map((v) => ({
        id: v.id,
        name: v.name,
        type: v.type,
        value: v.value,
      })),
      events,
    };
  }

  /**
   * Converts all Asset URLs to Data URIs (Base64) by fetching them with credentials.
   * This bypasses any authentication/CORS issues on the Unity side.
   */
  static async convertAssetsToDataUris(json: UnitySceneJSON): Promise<UnitySceneJSON> {
    console.log("[UnitySceneExporter] Converting Assets to Data URIs...");

    // clone to avoid mutating original
    const newJson = JSON.parse(JSON.stringify(json)) as UnitySceneJSON;

    // [Sanitization] Fix legacy/cached JSON format errors
    if (newJson.entities) {
      newJson.entities.forEach(e => {
        // Fix Rotation Object -> Float
        if (e.rotation && typeof e.rotation === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          e.rotation = (e.rotation as any).z || 0;
        }
        // Fix Missing Scale
        if (e.scaleX === undefined) e.scaleX = 1;
        if (e.scaleY === undefined) e.scaleY = 1;

        // Fix Entity Type (Tag -> Type)
        if (!e.type || e.type === "sprite" || e.type === "container") {
          // If it looks like a standard entity, try to use its asset type 'Character' etc.
          // But simplified: map 'sprite' -> 'Neutral' or keep as is.
          // Unity importer expects 'Character', 'Tile', 'Prop', etc. 
          // Let's rely on role or use a default.
          if (e.role && e.role !== "neutral") e.type = "Character"; // Heuristic
          else e.type = "Prop";
        }
      });
    }

    if (!newJson.assets || newJson.assets.length === 0) return newJson;

    const convertPromises = newJson.assets.map(async (asset) => {
      // Support fetching /api/assets/..., S3 redirects, or even external
      // Generally, convert everything that isn't already a Data URI
      if (asset.url && !asset.url.startsWith("data:")) {
        try {
          console.log(`[UnitySceneExporter] Fetching ${asset.url} for blob conversion...`);
          // Fetch blob with credentials (cookies)
          const res = await fetch(asset.url, {
            credentials: 'include' // Important for session cookies
          });

          if (res.ok) {
            const blob = await res.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            console.log(`[UnitySceneExporter] Converted to DataURI: ${asset.url.substring(0, 30)}... (${base64.length} chars)`);
            asset.url = base64;
          } else {
            console.warn(`[UnitySceneExporter] Failed to fetch asset for DataURI conversion: ${asset.url} ${res.status}`);
          }
        } catch (e) {
          console.error(`[UnitySceneExporter] Error converting ${asset.url} to DataURI`, e);
        }
      }
      return asset;
    });

    await Promise.all(convertPromises);
    return newJson;
  }
}
