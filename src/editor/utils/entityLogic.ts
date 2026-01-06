import type { EditorEntity } from "../types/Entity";
import { buildLogicItems, splitLogicItems } from "../types/Logic";

export function ensureEntityLogic(entity: EditorEntity): EditorEntity {
  if (entity.logic !== undefined) {
    return entity;
  }

  const logic = buildLogicItems({
    components: entity.components ?? [],
  });

  return { ...entity, logic };
}

export function syncLegacyFromLogic(entity: EditorEntity): EditorEntity {
  const components = splitLogicItems(entity.logic);
  return { ...entity, components };
}
