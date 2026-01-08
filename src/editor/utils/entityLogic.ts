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

  // Debug: Check if conditions are preserved
  components.forEach((comp, idx) => {
    if (comp.type === 'Logic' && (comp as any).conditions?.length > 0) {
      console.log(`[syncLegacy] Entity ${entity.id} Comp ${idx} conditions:`, JSON.stringify((comp as any).conditions));
    }
  });

  return { ...entity, components };
}
