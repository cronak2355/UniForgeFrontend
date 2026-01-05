import type { EditorEntity } from "../types/Entity";
import { DefaultPresets } from "./DefaultPresets";
import type { EntityPreset } from "./PresetTypes";

export class PresetManager {
    /**
     * 엔티티에 프리셋 적용
     * 기존 모듈과 규칙을 덮어씁니다 (또는 병합)
     */
    static applyPreset(entity: EditorEntity, presetId: string): EditorEntity {
        const preset = DefaultPresets[presetId];
        if (!preset) {
            console.warn(`[PresetManager] Preset '${presetId}' not found.`);
            return entity;
        }

        console.log(`[PresetManager] Applying preset '${preset.label}' to entity '${entity.name}'`);

        // 깊은 복사로 적용
        const newModules = preset.modules.map(m => ({
            ...m,
            id: crypto.randomUUID() // 새로운 ID 발급 (브라우저 표준)
        }));

        const newRules = preset.rules.map(r => ({ ...r }));

        // 엔티티 업데이트
        // (React state 불변성을 위해 복사본 반환 추천)
        return {
            ...entity,
            modules: newModules,
            rules: newRules
        };
    }

    /**
     * 사용 가능한 프리셋 목록 반환 (UI용)
     */
    static getAvailablePresets(): EntityPreset[] {
        return Object.values(DefaultPresets);
    }
}
