import type { EditorComponent } from "./Component";
import type { GameRule } from "../core/events/RuleEngine";

export type EditorLogicItem =
  | { kind: "component"; component: EditorComponent }
  | { kind: "rule"; rule: GameRule };

export function buildLogicItems({
  components,
  rules,
}: {
  components?: EditorComponent[];
  rules?: GameRule[];
}): EditorLogicItem[] {
  const logic: EditorLogicItem[] = [];
  if (components) {
    logic.push(...components.map((component) => ({ kind: "component", component })));
  }
  if (rules) {
    logic.push(...rules.map((rule) => ({ kind: "rule", rule })));
  }
  return logic;
}

export function splitLogicItems(logic: EditorLogicItem[] | undefined): {
  components: EditorComponent[];
  rules: GameRule[];
} {
  const components: EditorComponent[] = [];
  const rules: GameRule[] = [];

  if (!logic) {
    return { components, rules };
  }

  for (const item of logic) {
    if (item.kind === "component") components.push(item.component);
    if (item.kind === "rule") rules.push(item.rule);
  }

  return { components, rules };
}
