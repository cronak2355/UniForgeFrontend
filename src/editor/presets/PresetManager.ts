import type { EditorEntity } from "../types/Entity";
import { DefaultPresets } from "./DefaultPresets";
import type { EntityPreset } from "./PresetTypes";
import { buildLogicItems, splitLogicItems } from "../types/Logic";

export class PresetManager {
    static applyPreset(entity: EditorEntity, presetId: string): EditorEntity {
        const preset = DefaultPresets[presetId];
        if (!preset) {
            console.warn(`[PresetManager] Preset '${presetId}' not found.`);
            return entity;
        }

        console.log(`[PresetManager] Applying preset '${preset.label}' to entity '${entity.name}'`);

        const newVariables = preset.variables.map((v) => ({
            ...v,
            id: crypto.randomUUID(),
        }));

        const components = splitLogicItems(entity.logic);
        const nextLogic = buildLogicItems({
            components,
        });

        return {
            ...entity,
            logic: nextLogic,
            variables: newVariables,
        };
    }

    static getAvailablePresets(): EntityPreset[] {
        return Object.values(DefaultPresets);
    }
}
