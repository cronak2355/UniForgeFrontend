import type { EditorEntity } from "../types/Entity";
import { buildLogicItems, splitLogicItems } from "../types/Logic";
import { createDefaultModuleGraph } from "../types/Module";

export function ensureEntityLogic(entity: EditorEntity): EditorEntity {
  if (entity.logic !== undefined) {
    return entity;
  }

  const logic = buildLogicItems({
    components: entity.components ?? [],
  });

  return { ...entity, logic };
}

export function ensureEntityModules(entity: EditorEntity): EditorEntity {
  if (entity.modules && entity.modules.length > 0) {
    return entity;
  }

  return { ...entity, modules: [createDefaultModuleGraph()] };
}

export function syncLegacyFromLogic(entity: EditorEntity): EditorEntity {
  const components = splitLogicItems(entity.logic);

  // Debug: Check if conditions are preserved
  components.forEach((comp, idx) => {

  });

  return { ...entity, components };
}
