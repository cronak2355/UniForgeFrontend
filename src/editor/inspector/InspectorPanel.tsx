import React, { useState, useEffect } from "react";
import { PresetManager } from "../presets/PresetManager";
import type { EditorEntity } from "../types/Entity";
import { colors } from "../constants/colors";
import { ComponentSection } from "./ComponentSection";
import { ModuleSection } from "./ModuleSection";

// TransformEditor가 없으므로 간단히 숫자 입력 필드로 대체하거나 생략.
// 여기서는 기본 Transform UI를 직접 구현합니다.

interface Props {
  entity: EditorEntity;
  onUpdateEntity: (next: EditorEntity) => void;
}
export function InspectorPanel({ entity, onUpdateEntity }: Props) {
  const [localEntity, setLocalEntity] = useState<EditorEntity | null>(null);

  useEffect(() => {
    if (entity) {
      setLocalEntity({ ...entity });
    } else {
      setLocalEntity(null);
    }
  }, [entity]);

  if (!localEntity) {
    return (
      <div style={{
        padding: '24px 16px',
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: '13px',
      }}>
        오브젝트를 선택해주세요
      </div>
    );
  }

  const handleUpdate = (updated: EditorEntity) => {
    setLocalEntity(updated);
    onUpdateEntity(updated);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    if (!presetId) return;

    const updatedEntity = PresetManager.applyPreset(localEntity, presetId);
    handleUpdate(updatedEntity);
  };

  const updateTransform = (key: 'x' | 'y' | 'z', value: number) => {
    const updated = { ...localEntity, [key]: value };
    handleUpdate(updated);
  };

  const sectionStyle = {
    padding: '16px',
    borderBottom: `1px solid ${colors.borderColor}`,
  };

  const titleStyle = {
    margin: '0 0 12px 0',
    color: '#ddd',
    fontSize: '14px',
    fontWeight: 600,
  };

  const inputStyle = {
    background: '#1e1e1e',
    border: '1px solid #3e3e3e',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    width: '60px',
    fontSize: '12px'
  };

  const labelStyle = {
    color: '#aaa',
    fontSize: '12px',
    marginRight: '8px',
    width: '15px'
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px'
  };

  return (
    <div style={{
      width: '300px',
      background: '#2d2d2d',
      borderLeft: '1px solid #3e3e3e',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto'
    }}>

      {/* Role (Preset) Section */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Role (Preset)</div>
        <select
          style={{
            width: '100%',
            padding: '8px',
            background: '#1e1e1e',
            border: '1px solid #3e3e3e',
            color: '#fff',
            borderRadius: '4px'
          }}
          onChange={handlePresetChange}
          defaultValue=""
        >
          <option value="" disabled>Select Role...</option>
          {PresetManager.getAvailablePresets().map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Transform Section */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Transform</div>
        <div style={rowStyle}>
          <span style={labelStyle}>X</span>
          <input
            type="number"
            style={inputStyle}
            value={localEntity.x}
            onChange={(e) => updateTransform('x', parseFloat(e.target.value))}
          />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Y</span>
          <input
            type="number"
            style={inputStyle}
            value={localEntity.y}
            onChange={(e) => updateTransform('y', parseFloat(e.target.value))}
          />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Z</span>
          <input
            type="number"
            style={inputStyle}
            value={localEntity.z}
            onChange={(e) => updateTransform('z', parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Module Section */}
      <ModuleSection
        entity={localEntity}
        onUpdateEntity={handleUpdate}
      />

      {/* Visual Component Section */}
      <ComponentSection
        entity={localEntity}
        onUpdateEntity={handleUpdate}
      />

    </div>
  );
}
