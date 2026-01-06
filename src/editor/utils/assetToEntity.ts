import type { Asset } from "../types/Asset";
import type { EditorEntity } from "../types/Entity";
import { buildLogicItems } from "../types/Logic";

export function assetToEntity(asset: Asset, x = 0, y = 0): EditorEntity {
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
    texture: asset.name,
    variables: [],
    events: [],
    logic: buildLogicItems({ components: [] }),
    components: [],
  };
}
