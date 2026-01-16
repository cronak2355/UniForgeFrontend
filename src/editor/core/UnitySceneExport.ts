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

    const events: UnityEventJSON[] = [];

    logicComponents.forEach((logic, logicIdx) => {
      logic.actions.forEach((action, actionIdx) => {
        events.push({
          id: `ev_${logicIdx}_${actionIdx}`,
          trigger: logic.event,
          triggerParams: logic.eventParams ?? {},
          conditionLogic: logic.conditionLogic ?? "AND",
          conditions: logic.conditions ?? [],
          action: action.type,
          params: {
            ...action,
            type: undefined, // action.type 중복 제거
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
   * Resolves authenticated Proxy URLs (/api/assets/s3/...) to actual S3 URLs
   * by following redirects using the authenticated browser session.
   */
  static async resolveAssetUrls(json: UnitySceneJSON): Promise<UnitySceneJSON> {
    console.log("[UnitySceneExporter] Resolving S3 URLs...");

    // clone to avoid mutating original
    const newJson = JSON.parse(JSON.stringify(json)) as UnitySceneJSON;

    if (!newJson.assets || newJson.assets.length === 0) return newJson;

    const resolvePromises = newJson.assets.map(async (asset) => {
      // Check if it's an API proxy URL
      if (asset.url && asset.url.includes("/api/assets/s3/")) {
        try {
          // Perform a HEAD request and follow redirects. 
          // The browser uses cookies, so it's authenticated.
          // The final response.url will be the specific S3 URL (pre-signed or public).
          const res = await fetch(asset.url, {
            method: "HEAD",
            redirect: "follow",
          });

          if (res.ok && res.url && res.url !== asset.url) {
            console.log(`[UnitySceneExporter] Resolved: ${asset.url} -> ${res.url}`);
            asset.url = res.url;
          } else {
            console.warn(`[UnitySceneExporter] Failed to resolve redirect for ${asset.url}`);
          }
        } catch (e) {
          console.error(`[UnitySceneExporter] Error resolving ${asset.url}`, e);
        }
      }
      return asset;
    });

    await Promise.all(resolvePromises);
    return newJson;
  }
}
