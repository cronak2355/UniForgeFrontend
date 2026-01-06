import { useState, useEffect } from "react";
import type { EditorEntity } from "../types/Entity";
import { colors } from "../constants/colors";
import { ComponentSection } from "./ComponentSection";
import { VariableSection } from "./VariableSection";
import { syncLegacyFromLogic } from "../utils/entityLogic";

interface Props {
  entity: EditorEntity | null;
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
    const normalized = syncLegacyFromLogic(updated);
    setLocalEntity(normalized);
    onUpdateEntity(normalized);
  };

  const handleAddVariable = () => {
    const nextVar = {
      id: crypto.randomUUID(),
      name: "변수",
      type: "int" as const,
      value: 0,
    };
    handleUpdate({ ...localEntity, variables: [...localEntity.variables, nextVar] });
  };

  const handleUpdateVariable = (variable: typeof localEntity.variables[number]) => {
    const nextVars = localEntity.variables.map((v) => (v.id === variable.id ? variable : v));
    handleUpdate({ ...localEntity, variables: nextVars });
  };

  const updateTransform = (
    key: 'x' | 'y' | 'z' | 'rotationX' | 'rotationY' | 'rotationZ' | 'rotation' | 'scaleX' | 'scaleY',
    value: number
  ) => {
    const updated = { ...localEntity, [key]: value };
    if (key === 'rotationZ') {
      updated.rotation = value;
    }
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
    width: '20px'
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px'
  };

  const transformGridStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  };

  const transformGroupStyle = {
    flex: 1,
    minWidth: 0,
  };

  const groupTitleStyle = {
    marginBottom: '6px',
    color: '#9ca3af',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.3px',
  };

  return (
    <div style={{
      width: '100%',
      minWidth: 0,
      background: '#2d2d2d',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>

      {/* Transform Section */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Transform</div>
        <div style={transformGridStyle}>
          <div style={transformGroupStyle}>
            <div style={groupTitleStyle}>Position</div>
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
          <div style={transformGroupStyle}>
            <div style={groupTitleStyle}>Rotation</div>
            <div style={rowStyle}>
              <span style={labelStyle}>RX</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.rotationX ?? 0}
                onChange={(e) => updateTransform('rotationX', parseFloat(e.target.value))}
              />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>RY</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.rotationY ?? 0}
                onChange={(e) => updateTransform('rotationY', parseFloat(e.target.value))}
              />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>RZ</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.rotationZ ?? localEntity.rotation ?? 0}
                onChange={(e) => updateTransform('rotationZ', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div style={transformGroupStyle}>
            <div style={groupTitleStyle}>Scale</div>
            <div style={rowStyle}>
              <span style={labelStyle}>SX</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.scaleX}
                onChange={(e) => updateTransform('scaleX', parseFloat(e.target.value))}
              />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>SY</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.scaleY}
                onChange={(e) => updateTransform('scaleY', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Component Section */}
      <div style={sectionStyle}>
        <VariableSection
          variables={localEntity.variables}
          onAdd={handleAddVariable}
          onUpdate={handleUpdateVariable}
        />
      </div>

      <div style={sectionStyle}>
        <div style={titleStyle}>컴포넌트</div>
        <ComponentSection entity={localEntity} onUpdateEntity={handleUpdate} />
      </div>

    </div>
  );
}
