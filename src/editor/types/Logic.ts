import type { EditorComponent } from "./Component";

export type EditorLogicItem =
  | { kind: "component"; component: EditorComponent };

export function buildLogicItems({
  components,
}: {
  components?: EditorComponent[];
}): EditorLogicItem[] {
  const logic: EditorLogicItem[] = [];
  if (components) {
    logic.push(...components.map((component) => ({ kind: "component", component })));
  }
  return logic;
}

export function splitLogicItems(logic: EditorLogicItem[] | undefined): EditorComponent[] {
  const components: EditorComponent[] = [];
  if (!logic) {
    return components;
  }

  for (const item of logic) {
    if (item.kind === "component") components.push(item.component);
  }

  return components;
}
