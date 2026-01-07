// editor/core/EditorEntitySnapshot.ts
import type { EditorEntity } from "../types/Entity";

export function createEntitySnapshot(
  entities: EditorEntity[]
): EditorEntity[] {
  // 필요하면 deep copy
  return entities.map(e => ({
    ...e,
    variables: [...e.variables],
    events: [...e.events],
    logic: [...e.logic],
    components: e.components ? [...e.components] : undefined,
  }));
}
