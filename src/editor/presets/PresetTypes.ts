import type { EditorVariable } from "../types/Variable";

export interface EntityPreset {
    id: string;
    label: string;
    description: string;
    variables: EditorVariable[];
}
