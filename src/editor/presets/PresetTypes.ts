import type { EditorVariable } from "../types/Variable";
import type { GameRule } from "../core/events/RuleEngine";

export interface EntityPreset {
    id: string;
    label: string;
    description: string;
    variables: EditorVariable[];
    rules: GameRule[];
}
