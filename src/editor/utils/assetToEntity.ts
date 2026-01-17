import type { Asset } from "../types/Asset";
import type { EditorEntity } from "../types/Entity";
import { buildLogicItems } from "../types/Logic";
import { createDefaultModuleGraph } from "../types/Module";
import { ensureEntityLogic, syncLegacyFromLogic } from "../utils/entityLogic";

function parsePrefab(raw: unknown): EditorEntity | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as EditorEntity;
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(JSON.stringify(raw)) as EditorEntity;
  } catch {
    return null;
  }
}

export function assetToEntity(asset: Asset, x = 0, y = 0): EditorEntity {
  if (asset.tag === "Prefab" && asset.metadata?.prefab) {

    const prefab = parsePrefab(asset.metadata.prefab);

    if (prefab) {
      const normalizedPrefab = syncLegacyFromLogic(ensureEntityLogic(prefab));
      return {
        ...normalizedPrefab,
        id: crypto.randomUUID(),
        x,
        y,
        z: normalizedPrefab.z ?? 0,
        rotation: normalizedPrefab.rotation ?? 0,
        scaleX: normalizedPrefab.scaleX ?? 1,
        scaleY: normalizedPrefab.scaleY ?? 1,
        role: normalizedPrefab.role ?? "neutral",
        variables: normalizedPrefab.variables ?? [],
        events: normalizedPrefab.events ?? [],
        logic: normalizedPrefab.logic ?? buildLogicItems({ components: [] }),
        components: normalizedPrefab.components ?? [],
        modules: normalizedPrefab.modules ?? [createDefaultModuleGraph()],
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    type: asset.tag as EditorEntity["type"],
    name: asset.name,
    x,
    y,
    z: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    role: "neutral",
    texture: asset.id, // Use unique asset.id instead of asset.name to prevent same-named assets from overwriting each other
    variables: [],
    events: [],
    logic: buildLogicItems({ components: [] }),
    components: [],
    modules: [createDefaultModuleGraph()],
  };
}
