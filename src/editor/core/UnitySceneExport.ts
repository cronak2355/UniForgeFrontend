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
  texture?: string;
  x: number;
  y: number;
  z?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  role?: string;
  tags?: string[];
  variables: UnityVariableJSON[];
  // v3: components is the single source of truth for logic (no more events array)
  components: UnityComponentJSON[];
  modules?: any[];
}

export interface UnityComponentJSON {
  id: string;
  type: "Logic" | "Transform" | "Render" | string;
  // Logic component fields
  event?: string;
  eventParams?: Record<string, unknown>;
  conditions?: Array<{ type: string; [key: string]: unknown }>;
  conditionLogic?: "AND" | "OR";
  actions?: UnityActionJSON[];
  elseActions?: UnityActionJSON[];
}

export interface UnityVariableJSON {
  id: string;
  name: string;
  type: string;
  value: any;
}

export interface UnityActionJSON {
  type: string;
  [key: string]: unknown;
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

  /**
   * Export entity with components-only format (v3)
   * No more events array - components is the single source of truth
   */
  private static exportEntity(e: EditorEntity): UnityEntityJSON {
    const allComponents = splitLogicItems(e.logic);

    // Export only Logic components with clean structure
    const exportedComponents: UnityComponentJSON[] = allComponents
      .filter((c): c is LogicComponent => c.type === "Logic")
      .map((lc) => ({
        id: lc.id,
        type: "Logic" as const,
        event: lc.event,
        eventParams: lc.eventParams,
        conditions: (lc.conditions || []).map(cond => {
          const { type, ...rest } = cond as { type: string; [key: string]: unknown };
          return { type, ...rest };
        }),
        conditionLogic: (lc.conditionLogic || "AND") as "AND" | "OR",
        actions: (lc.actions || []).map(action => {
          const { type, ...params } = action as { type: string; [key: string]: unknown };
          return { type, ...params };
        }),
        elseActions: (lc.elseActions || []).map(action => {
          const { type, ...params } = action as { type: string; [key: string]: unknown };
          return { type, ...params };
        }),
      }));

    return {
      id: e.id,
      type: e.type,
      name: e.name,
      texture: e.texture,
      x: e.x,
      y: e.y,
      z: (e as any).z ?? 0,
      rotation: typeof e.rotation === 'object' ? (e.rotation as any).z || 0 : e.rotation || 0,
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
      components: exportedComponents,
      modules: (e as any).modules ?? [],
    };
  }

  /**
   * Converts all Asset URLs to Data URIs (Base64) by fetching them with credentials.
   * This bypasses any authentication/CORS issues on the Unity side.
   *
   * Supports both:
   * - UnitySceneJSON (legacy single-scene format)
   * - GameDataJSON (new multi-scene format with formatVersion)
   */
  static async convertAssetsToDataUris(json: any): Promise<any> {
    console.log("[UnitySceneExporter] Converting Assets to Data URIs...");

    // clone to avoid mutating original
    const newJson = JSON.parse(JSON.stringify(json));

    // Detect format: GameDataJSON has 'formatVersion' and 'scenes' array
    const isGameDataFormat = newJson.formatVersion && Array.isArray(newJson.scenes);

    if (isGameDataFormat) {
      console.log(`[UnitySceneExporter] Detected GameDataJSON format v${newJson.formatVersion}`);
      // Process all entities in all scenes
      newJson.scenes.forEach((scene: any) => {
        if (scene.entities) {
          scene.entities.forEach((e: any) => this.sanitizeEntity(e));
        }
      });
    } else {
      // Legacy UnitySceneJSON format
      console.log("[UnitySceneExporter] Detected legacy UnitySceneJSON format");
      if (newJson.entities) {
        newJson.entities.forEach((e: any) => this.sanitizeEntity(e));
      }
    }

    // Get assets array (same location for both formats)
    const assets = newJson.assets;
    if (!assets || assets.length === 0) return newJson;

    const convertPromises = assets.map(async (asset: any) => {
      // Support fetching /api/assets/..., S3 redirects, or even external
      // Generally, convert everything that isn't already a Data URI
      if (asset.url && !asset.url.startsWith("data:")) {
        try {
          console.log(`[UnitySceneExporter] Fetching ${asset.url} for blob conversion...`);
          
          // Try fetch without credentials first (works better with S3 presigned URLs)
          // S3's Access-Control-Allow-Origin: * conflicts with credentials: 'include'
          let res = await fetch(asset.url, {
            credentials: 'omit'  // Don't send cookies - avoids CORS conflict with S3
          });
          
          // If omit fails and URL is our own API, try with credentials
          if (!res.ok && asset.url.includes('/api/')) {
            res = await fetch(asset.url, {
              credentials: 'include'
            });
          }

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

  /**
   * Sanitizes entity data for Unity compatibility
   */
  private static sanitizeEntity(e: any): void {
    // Fix Rotation Object -> Float
    if (e.rotation && typeof e.rotation === 'object') {
      e.rotation = (e.rotation as any).z || 0;
    }
    // Fix Missing Scale
    if (e.scaleX === undefined) e.scaleX = 1;
    if (e.scaleY === undefined) e.scaleY = 1;
    // Fix Missing Z
    if (e.z === undefined) e.z = 0;

    // Ensure components array exists for logic preservation
    // If components is missing but events exist, keep events for backward compat
    // Unity should prioritize 'components' over 'events' for full fidelity
  }
}
