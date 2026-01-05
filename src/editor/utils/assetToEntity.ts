import type { Asset } from "../types/Asset";
import type { EditorEntity } from "../types/Entity";

export function assetToEntity(
  asset: Asset,
  x = 0,
  y = 0
): EditorEntity {
  return {
    id: crypto.randomUUID(),
    type: asset.tag,   // ⭐ 핵심 연결 지점
    name: asset.name,
    x,
    y,
    z: 0,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    variables: [],
    events: [],
    components: [],
    rules: [],
    modules: [],
  };
}
