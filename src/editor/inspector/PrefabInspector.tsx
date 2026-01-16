// src/editor/inspector/PrefabInspector.tsx
import { useState, useEffect } from 'react';
import type { Asset } from '../types/Asset';
import type { EditorEntity } from '../types/Entity';
import type { EditorVariable } from '../types/Variable';
import { colors } from '../constants/colors';
import { useEditorCore } from '../../contexts/EditorCoreContext';
import { VariableSection } from './VariableSection';
import { ComponentSection } from './ComponentSection';
import { ensureEntityLogic, syncLegacyFromLogic } from '../utils/entityLogic';

interface Props {
    asset: Asset;
}

/**
 * Inspector panel for editing Prefab assets.
 * Extracts the entity data from asset.metadata.prefab and allows editing.
 */
export function PrefabInspector({ asset }: Props) {
    const core = useEditorCore();

    // Parse prefab data from asset metadata
    const parsePrefabData = (): EditorEntity | null => {
        try {
            if (!asset.metadata?.prefab) return null;
            const prefab = typeof asset.metadata.prefab === 'string'
                ? JSON.parse(asset.metadata.prefab)
                : asset.metadata.prefab;
            return ensureEntityLogic(prefab);
        } catch (e) {
            console.warn('[PrefabInspector] Failed to parse prefab data:', e);
            return null;
        }
    };

    const [localEntity, setLocalEntity] = useState<EditorEntity | null>(parsePrefabData);
    const [isDirty, setIsDirty] = useState(false);

    // Sync state when asset changes
    useEffect(() => {
        setLocalEntity(parsePrefabData());
        setIsDirty(false);
    }, [asset.id]);

    const handleUpdate = (updated: EditorEntity) => {
        const normalized = syncLegacyFromLogic(updated);
        setLocalEntity({ ...normalized, variables: normalized.variables ?? [] });
        setIsDirty(true);
    };

    const handleSave = () => {
        if (!localEntity) return;

        const prefabSnapshot = JSON.parse(JSON.stringify({
            ...localEntity,
            components: localEntity.components ?? [],
            logic: localEntity.logic ?? [],
            variables: localEntity.variables ?? [],
        }));

        core.updateAsset({
            ...asset,
            metadata: {
                ...asset.metadata,
                prefab: prefabSnapshot,
            },
        });

        setIsDirty(false);
        console.log(`[PrefabInspector] Saved prefab: ${asset.name}`);
    };

    const handleReset = () => {
        setLocalEntity(parsePrefabData());
        setIsDirty(false);
    };

    if (!localEntity) {
        return (
            <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: colors.textSecondary,
                fontSize: '13px',
            }}>
                프리팹 데이터를 불러올 수 없습니다.
            </div>
        );
    }

    const variables = localEntity.variables ?? [];

    const handleAddVariable = () => {
        const nextVar: EditorVariable = {
            id: crypto.randomUUID(),
            name: `var_${variables.length + 1}`,
            type: 'int',
            value: 0,
        };
        handleUpdate({ ...localEntity, variables: [...variables, nextVar] });
    };

    const handleUpdateVariable = (variable: EditorVariable) => {
        const nextVars = variables.map((v) => (v.id === variable.id ? variable : v));
        handleUpdate({ ...localEntity, variables: nextVars });
    };

    const handleRemoveVariable = (id: string) => {
        const nextVars = variables.filter((v) => v.id !== id);
        handleUpdate({ ...localEntity, variables: nextVars });
    };

    const sectionStyle = {
        padding: '16px',
        borderBottom: `1px solid ${colors.borderColor}`,
    };

    const titleStyle = {
        margin: '0 0 12px 0',
        color: '#ddd',
        fontSize: '14px',
        fontWeight: 600 as const,
    };

    const inputStyle = {
        background: '#1e1e1e',
        border: '1px solid #3e3e3e',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '4px',
        width: '100%',
        fontSize: '12px',
    };

    const buttonStyle = {
        padding: '8px 16px',
        fontSize: '12px',
        fontWeight: 500 as const,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    };

    return (
        <div style={{
            width: '100%',
            minWidth: 0,
            background: colors.bgSecondary,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
        }}>
            {/* Header */}
            <div style={{
                ...sectionStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <span style={{ fontSize: '18px' }}>📦</span>
                <div>
                    <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>
                        {asset.name}
                    </div>
                    <div style={{ color: colors.textSecondary, fontSize: '11px' }}>
                        프리팹 편집 모드
                    </div>
                </div>
            </div>

            {/* Prefab Entity Name */}
            <div style={sectionStyle}>
                <div style={titleStyle}>이름 (Name)</div>
                <input
                    type="text"
                    style={inputStyle}
                    value={localEntity.name ?? ''}
                    onChange={(e) => handleUpdate({ ...localEntity, name: e.target.value })}
                />
            </div>

            {/* Texture */}
            <div style={sectionStyle}>
                <div style={titleStyle}>텍스처 (Texture)</div>
                <select
                    style={{ ...inputStyle, width: '100%' }}
                    value={localEntity.texture ?? ''}
                    onChange={(e) => {
                        handleUpdate({ ...localEntity, texture: e.target.value || undefined });
                    }}
                >
                    <option value="">(None)</option>
                    {core.getAssets()
                        .filter((a) => a.tag !== 'Prefab')
                        .map((a) => (
                            <option key={a.id} value={a.name}>
                                {a.name}
                            </option>
                        ))}
                </select>
            </div>

            {/* Variables Section */}
            <div style={sectionStyle}>
                <VariableSection
                    variables={variables}
                    onAdd={handleAddVariable}
                    onUpdate={handleUpdateVariable}
                    onRemove={handleRemoveVariable}
                />
            </div>

            {/* Components Section */}
            <div style={sectionStyle}>
                <div style={titleStyle}>컴포넌트 (Components)</div>
                <ComponentSection entity={localEntity} onUpdateEntity={handleUpdate} />
            </div>

            {/* Save/Reset Buttons */}
            {isDirty && (
                <div style={{
                    padding: '16px',
                    display: 'flex',
                    gap: '8px',
                    borderTop: `1px solid ${colors.borderColor}`,
                    background: colors.bgTertiary,
                }}>
                    <button
                        onClick={handleSave}
                        style={{
                            ...buttonStyle,
                            flex: 1,
                            background: colors.accent,
                            color: '#fff',
                        }}
                    >
                        💾 저장
                    </button>
                    <button
                        onClick={handleReset}
                        style={{
                            ...buttonStyle,
                            background: colors.bgSecondary,
                            color: colors.textSecondary,
                            border: `1px solid ${colors.borderColor}`,
                        }}
                    >
                        초기화
                    </button>
                </div>
            )}
        </div>
    );
}
