import { useState, useEffect, useRef } from "react";
import type { EditorEntity } from "../types/Entity";
import type { Asset } from "../types/Asset";
import { colors } from "../constants/colors";
import { ComponentSection } from "./ComponentSection";
import { VariableSection } from "./VariableSection";
import { EventSection } from "./EventSection";
import type { EditorEvent } from "../types/Event";
import { ensureEntityLogic, syncLegacyFromLogic } from "../utils/entityLogic";
import { useEditorCore } from "../../contexts/EditorCoreContext";
import { assetService } from "../../services/assetService";

interface Props {
  entity: EditorEntity | null;
  onUpdateEntity: (next: EditorEntity) => void;
}
export function InspectorPanel({ entity, onUpdateEntity }: Props) {
  const core = useEditorCore();
  // Direct token access for AssetService
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem("access_token") : null;
  const [localEntity, setLocalEntity] = useState<EditorEntity | null>(null);
  const [tagInputValue, setTagInputValue] = useState("");
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (entity) {
      setLocalEntity({ ...entity, variables: entity.variables ?? [] });
    } else {
      setLocalEntity(null);
    }
  }, [entity]);

  useEffect(() => {
    if (!localEntity) {
      setTagInputValue("");
      return;
    }
    const nextValue = (localEntity.tags ?? []).join(", ");
    if (
      typeof document !== "undefined" &&
      tagInputRef.current &&
      document.activeElement === tagInputRef.current
    ) {
      return;
    }
    setTagInputValue(nextValue);
  }, [localEntity?.id, (localEntity?.tags ?? []).join(",")]);

  if (!localEntity) {
    return (
      <div style={{
        padding: '24px 16px',
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: '13px',
      }}>
        대상을 선택하여 속성을 확인하세요.
      </div>
    );
  }

  const handleUpdate = (updated: EditorEntity) => {
    const normalized = syncLegacyFromLogic(updated);
    const withVariables = { ...normalized, variables: normalized.variables ?? [] };
    setLocalEntity(withVariables);
    onUpdateEntity(withVariables);
  };
  const variables = localEntity.variables ?? [];

  const commitTagInput = () => {
    if (!localEntity) return;
    const tags = tagInputValue
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    const joined = tags.join(", ");
    setTagInputValue(joined);
    handleUpdate({ ...localEntity, tags });
  };


  const handleAddVariable = () => {
    const nextVar = {
      id: crypto.randomUUID(),
      name: `var_${variables.length + 1}`,
      type: "int" as const,
      value: 0,
    };
    handleUpdate({ ...localEntity, variables: [...variables, nextVar] });
  };

  const handleUpdateVariable = (variable: typeof variables[number]) => {
    const nextVars = variables.map((v) => (v.id === variable.id ? variable : v));
    handleUpdate({ ...localEntity, variables: nextVars });
  };

  const handleRemoveVariable = (id: string) => {
    const nextVars = variables.filter((v) => v.id !== id);
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

  const buttonStyle = {
    padding: '6px 10px',
    fontSize: '12px',
    background: colors.bgTertiary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: '6px',
    color: colors.textPrimary,
    cursor: 'pointer',
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

  const assetUrl = (fileName: string) => {
    const base = (import.meta as { env?: { BASE_URL?: string } })?.env?.BASE_URL || "/";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return new URL(`${normalizedBase}${fileName}`, window.location.origin).toString();
  };

  const buildPrefabAsset = (): Asset => {
    const existingNames = new Set(core.getAssets().map((asset) => asset.name));
    const baseName = `${localEntity.name} Prefab`;
    let name = baseName;
    let suffix = 1;
    while (existingNames.has(name)) {
      name = `${baseName} ${suffix}`;
      suffix += 1;
    }

    const textureName = localEntity.texture;
    const textureAsset = textureName
      ? core.getAssets().find((asset) => asset.name === textureName || asset.id === textureName)
      : undefined;
    const url = textureAsset?.url ?? assetUrl("placeholder.png");

    const normalizedEntity = syncLegacyFromLogic(ensureEntityLogic(localEntity));
    const prefabSnapshot = JSON.parse(
      JSON.stringify({
        ...normalizedEntity,
        components: normalizedEntity.components ?? [],
        logic: normalizedEntity.logic ?? [],
        variables: normalizedEntity.variables ?? [],
      })
    ) as EditorEntity;

    return {
      id: crypto.randomUUID(),
      tag: "Prefab",
      name,
      url,
      idx: -1,
      metadata: { prefab: prefabSnapshot },
    };
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
        <div style={titleStyle}>위치 및 크기 (Transform)</div>
        <div style={transformGridStyle}>
          <div style={transformGroupStyle}>
            <div style={groupTitleStyle}>위치 (Position)</div>
            <div style={rowStyle}>
              <span style={labelStyle}>X</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.x ?? 0}
                onChange={(e) => updateTransform('x', parseFloat(e.target.value))}
              />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Y</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.y ?? 0}
                onChange={(e) => updateTransform('y', parseFloat(e.target.value))}
              />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Z</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.z ?? 0}
                onChange={(e) => {
                  const raw = e.target.value;
                  // Allow intermediate state like "-" or empty
                  if (raw === '' || raw === '-') {
                    setLocalEntity({ ...localEntity, z: raw as unknown as number });
                    return;
                  }
                  const num = parseFloat(raw);
                  if (!Number.isNaN(num)) {
                    updateTransform('z', num);
                  }
                }}
                onBlur={() => {
                  // Finalize intermediate state on blur
                  const z = localEntity.z;
                  if (typeof z === 'string' || Number.isNaN(z)) {
                    handleUpdate({ ...localEntity, z: 0 });
                  }
                }}
              />
            </div>
            <div style={{ ...rowStyle, marginTop: 4 }}>
              <span style={labelStyle}>🔒</span>
              <input
                type="checkbox"
                checked={localEntity.locked ?? false}
                onChange={(e) => handleUpdate({ ...localEntity, locked: e.target.checked })}
              />
              <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>이동 잠금</span>
            </div>
          </div>
          <div style={transformGroupStyle}>
            <div style={groupTitleStyle}>회전 (Rotation)</div>
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
            <div style={groupTitleStyle}>크기 (Scale)</div>
            <div style={rowStyle}>
              <span style={labelStyle}>SX</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.scaleX ?? 1}
                onChange={(e) => updateTransform('scaleX', parseFloat(e.target.value))}
              />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>SY</span>
              <input
                type="number"
                style={inputStyle}
                value={localEntity.scaleY ?? 1}
                onChange={(e) => updateTransform('scaleY', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div style={sectionStyle}>
        <div style={titleStyle}>태그 (Tags)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={rowStyle}>
            <span style={{ ...labelStyle, width: 'auto', marginRight: '12px' }}>🏷️</span>
            <input
              ref={tagInputRef}
              type="text"
              placeholder="player, enemy, ui (쉼표 구분)"
              style={{ ...inputStyle, width: '100%', flex: 1 }}
              value={tagInputValue}
              onChange={(e) => {
                setTagInputValue(e.target.value);
              }}
              onBlur={commitTagInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTagInput();
                }
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(localEntity.tags ?? []).map((tag, idx) => (
              <span
                key={idx}
                style={{
                  background: tag === 'player' ? '#27ae60' : tag === 'enemy' ? '#c0392b' : '#3498db',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const newTags = (localEntity.tags ?? []).filter((_, i) => i !== idx);
                  handleUpdate({ ...localEntity, tags: newTags });
                }}
                title="클릭하여 제거"
              >
                {tag} ×
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Effects Section - 피격/사망 이펙트 설정 */}
      <div style={sectionStyle}>
        <div style={titleStyle}>⚔️ 이펙트 (Effects)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          <datalist id="particle-presets">
            <option value="none">❌ 없음 (기본)</option>
            <option value="hit_spark">⚡ hit_spark</option>
            <option value="blood">🩸 blood</option>
            <option value="explosion">💥 explosion</option>
            <option value="magic">🔮 magic</option>
            <option value="death">💀 death</option>
            <option value="confetti">🎊 confetti</option>
            <option value="smoke">🌫️ smoke</option>
            <option value="sparkle">✨ sparkle</option>
            <option value="dust">💨 dust</option>
            {/* Custom Particles */}
            {core.getAssets()?.filter((a: any) => a.tag === 'Particle' || a.tag === 'Effect').map((a: any) => (
              <option key={a.id} value={`custom:${a.name}`}>{a.name}</option>
            ))}
          </datalist>

          <div style={rowStyle}>
            <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>맞을 때</span>
            <input
              list="particle-presets"
              style={{ ...inputStyle, width: '120px' }}
              placeholder="none"
              value={String(localEntity.variables?.find(v => v.name === "hitEffect")?.value ?? "")}
              onChange={(e) => {
                const val = e.target.value;
                let nextVars = (localEntity.variables ?? []).filter(v => v.name !== "hitEffect");
                if (val && val !== "none") {
                  nextVars.push({ id: crypto.randomUUID(), name: "hitEffect", type: "string", value: val });
                }
                handleUpdate({ ...localEntity, variables: nextVars });
              }}
            />
          </div>
          <div style={rowStyle}>
            <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>죽을 때</span>
            <input
              list="particle-presets"
              style={{ ...inputStyle, width: '120px' }}
              placeholder="none"
              value={String(localEntity.variables?.find(v => v.name === "deathEffect")?.value ?? "")}
              onChange={(e) => {
                const val = e.target.value;
                let nextVars = (localEntity.variables ?? []).filter(v => v.name !== "deathEffect");
                if (val && val !== "none") {
                  nextVars.push({ id: crypto.randomUUID(), name: "deathEffect", type: "string", value: val });
                }
                handleUpdate({ ...localEntity, variables: nextVars });
              }}
            />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={titleStyle}>프리팹 (Prefab)</div>
        <button
          style={buttonStyle}
          onClick={() => {
            const prefabAsset = buildPrefabAsset();
            core.addAsset(prefabAsset);
          }}
        >
          프리팹으로 등록
        </button>
      </div>

      <div style={sectionStyle}>
        <VariableSection
          variables={variables}
          onAdd={handleAddVariable}
          onUpdate={handleUpdateVariable}
          entityId={localEntity.id}
          onRemove={handleRemoveVariable}
        />
      </div>

      {/* UI Settings Section */}
      <div style={sectionStyle}>
        <div style={titleStyle}>UI 설정 (UI Settings)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* isUI Checkbox */}
          <div style={rowStyle}>
            <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>UI 요소 여부</span>
            <input
              type="checkbox"
              checked={localEntity.variables.some(v => v.name === "isUI" && v.value === true)}
              onChange={(e) => {
                const isChecked = e.target.checked;
                let nextVars = localEntity.variables.filter(v => v.name !== "isUI");
                if (isChecked) {
                  nextVars.push({ id: crypto.randomUUID(), name: "isUI", type: "bool", value: true });
                }
                handleUpdate({ ...localEntity, variables: nextVars });
              }}
            />
          </div>

          {/* UI Type Selector */}
          {localEntity.variables.some(v => v.name === "isUI" && v.value === true) && (
            <>
              <div style={rowStyle}>
                <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>UI 종류</span>
                <select
                  style={{ ...inputStyle, width: '120px' }}
                  value={String(localEntity.variables.find(v => v.name === "uiType")?.value ?? "text")}
                  onChange={(e) => {
                    const type = e.target.value;
                    let nextVars = localEntity.variables.filter(v => v.name !== "uiType");
                    nextVars.push({ id: crypto.randomUUID(), name: "uiType", type: "string", value: type });

                    // Initialize default variables for the selected type
                    if (type === "bar") {
                      if (!nextVars.find(v => v.name === "uiBarColor")) nextVars.push({ id: crypto.randomUUID(), name: "uiBarColor", type: "string", value: "#e74c3c" });
                      if (!nextVars.find(v => v.name === "width")) nextVars.push({ id: crypto.randomUUID(), name: "width", type: "float", value: 200 });
                      if (!nextVars.find(v => v.name === "height")) nextVars.push({ id: crypto.randomUUID(), name: "height", type: "float", value: 20 });
                    }
                    if (type === "panel") {
                      if (!nextVars.find(v => v.name === "width")) nextVars.push({ id: crypto.randomUUID(), name: "width", type: "float", value: 200 });
                      if (!nextVars.find(v => v.name === "height")) nextVars.push({ id: crypto.randomUUID(), name: "height", type: "float", value: 100 });
                    }

                    handleUpdate({ ...localEntity, variables: nextVars });
                  }}
                >
                  <option value="text">텍스트 (Text)</option>
                  <option value="button">버튼 (Button)</option>
                  <option value="image">이미지 (Image)</option>
                  <option value="panel">패널 (Panel)</option>
                  <option value="scrollPanel">스크롤 패널 (Scroll Panel)</option>
                  <option value="bar">바/게이지 (Bar)</option>
                </select>
              </div>

              {/* Image/Button/Panel/Bar Texture Settings */}
              {["image", "button", "panel", "scrollPanel", "bar"].includes(String(localEntity.variables.find(v => v.name === "uiType")?.value)) && (
                <div style={rowStyle}>
                  <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>이미지 (Texture)</span>
                  <div style={{ display: 'flex', gap: '4px', flex: 2 }}>
                    <select
                      style={{ ...inputStyle, flex: 1 }}
                      value={String(localEntity.variables.find(v => v.name === "texture")?.value ?? "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "texture");
                        if (val) {
                          vars.push({ id: crypto.randomUUID(), name: "texture", type: "string", value: val });
                        }
                        handleUpdate({ ...localEntity, variables: vars, texture: val || undefined });
                      }}
                    >
                      <option value="">(None)</option>
                      {core.getAssets().filter((a: any) => a.tag === 'Image' || a.tag === 'Sprite').map((a: any) => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                    <label style={{
                      ...buttonStyle,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 8px'
                    }} title="Import Image from Disk">
                      📂
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          try {
                            // Upload via AssetService
                            const name = file.name.split('.')[0] + "_" + Date.now().toString().slice(-4);
                            const uploaded = await assetService.uploadAsset(
                              file,
                              name, // Unique name to force reload
                              "Image",
                              token
                            );

                            // Add to Core Assets
                            const newAsset: Asset = {
                              id: uploaded.id,
                              tag: "Image",
                              name: uploaded.name,
                              url: uploaded.url,
                              idx: -1,
                              metadata: uploaded.metadata
                            };
                            core.addAsset(newAsset);

                            // Auto-select
                            let vars = localEntity.variables.filter(v => v.name !== "texture");
                            vars.push({ id: crypto.randomUUID(), name: "texture", type: "string", value: newAsset.name });
                            handleUpdate({ ...localEntity, variables: vars, texture: newAsset.name });

                          } catch (err) {
                            console.error("Failed to import image:", err);
                            alert("Failed to import image.");
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Text Specific Settings */}
              {(localEntity.variables.find(v => v.name === "uiType")?.value ?? "text") === "text" && (
                <>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>텍스트 내용</span>
                    <input type="text" style={{ ...inputStyle, width: '120px' }}
                      value={String(localEntity.variables.find(v => v.name === "uiText")?.value ?? "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "uiText");
                        vars.push({ id: crypto.randomUUID(), name: "uiText", type: "string", value: val });
                        handleUpdate({ ...localEntity, variables: vars });
                      }} />
                  </div>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>연결 대상</span>
                    <select
                      style={{ ...inputStyle, width: '120px' }}
                      value={String(localEntity.variables.find(v => v.name === "uiSourceEntity")?.value ?? "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "uiSourceEntity" && v.name !== "uiValueVar");
                        if (val) {
                          vars.push({ id: crypto.randomUUID(), name: "uiSourceEntity", type: "string", value: val });
                        }
                        handleUpdate({ ...localEntity, variables: vars });
                      }}
                    >
                      <option value="">(None)</option>
                      <optgroup label="Global">
                        {Array.from(core.getGlobalEntities().values()).map((e: { id: string; name: string }) => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Scene">
                        {Array.from(core.getEntities().values())
                          .filter((e: { id: string }) => e.id !== localEntity.id)
                          .map((e: { id: string; name: string }) => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                      </optgroup>
                    </select>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>연결 변수</span>
                    <select
                      style={{ ...inputStyle, width: '120px' }}
                      value={String(localEntity.variables.find(v => v.name === "uiValueVar")?.value ?? "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "uiValueVar");
                        if (val) {
                          vars.push({ id: crypto.randomUUID(), name: "uiValueVar", type: "string", value: val });
                        }
                        handleUpdate({ ...localEntity, variables: vars });
                      }}
                    >
                      <option value="">(None)</option>
                      {(() => {
                        const sourceEntityId = localEntity.variables.find(v => v.name === "uiSourceEntity")?.value;
                        if (!sourceEntityId) return null;
                        // Check both global and scene entities
                        const sourceEntity = core.getGlobalEntities().get(String(sourceEntityId))
                          || core.getEntities().get(String(sourceEntityId));
                        if (!sourceEntity) return null;
                        return sourceEntity.variables
                          .filter((v: { name: string }) => !["uiType", "uiText", "uiFontSize", "uiColor", "uiBackgroundColor", "uiAlign", "uiValueVar", "uiSourceEntity", "uiMaxVar", "isUI", "width", "height", "z", "role"].includes(v.name))
                          .map((v: { id: string; name: string }) => (
                            <option key={v.id} value={v.name}>{v.name}</option>
                          ));
                      })()}
                    </select>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>글자 크기</span>
                    <input type="number" style={inputStyle}
                      value={Number(localEntity.variables.find(v => v.name === "uiFontSize")?.value ?? 16)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        let vars = localEntity.variables.filter(v => v.name !== "uiFontSize");
                        vars.push({ id: crypto.randomUUID(), name: "uiFontSize", type: "float", value: val });
                        handleUpdate({ ...localEntity, variables: vars });
                      }} />
                  </div>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>정렬</span>
                    <select
                      style={{ ...inputStyle, width: '120px' }}
                      value={String(localEntity.variables.find(v => v.name === "uiAlign")?.value ?? "center")}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "uiAlign");
                        vars.push({ id: crypto.randomUUID(), name: "uiAlign", type: "string", value: val });
                        handleUpdate({ ...localEntity, variables: vars });
                      }}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>글자 색상</span>
                    <input type="color" style={{ ...inputStyle, width: '40px', padding: 0 }}
                      value={String(localEntity.variables.find(v => v.name === "uiColor")?.value ?? "#ffffff")}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "uiColor");
                        vars.push({ id: crypto.randomUUID(), name: "uiColor", type: "string", value: val });
                        handleUpdate({ ...localEntity, variables: vars });
                      }} />
                  </div>
                </>
              )}

              {/* Panel & Bar Shared: Background Color, Size */}
              {["panel", "bar"].includes(String(localEntity.variables.find(v => v.name === "uiType")?.value)) && (
                <>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>배경색</span>
                    <input type="color" style={{ ...inputStyle, width: '40px', padding: 0 }}
                      value={String(localEntity.variables.find(v => v.name === "uiBackgroundColor")?.value ?? "#444444")}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "uiBackgroundColor");
                        vars.push({ id: crypto.randomUUID(), name: "uiBackgroundColor", type: "string", value: val });
                        handleUpdate({ ...localEntity, variables: vars });
                      }} />
                  </div>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>너비</span>
                    <input type="number" style={inputStyle}
                      value={Number(localEntity.variables.find(v => v.name === "width")?.value ?? 100)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        let vars = localEntity.variables.filter(v => v.name !== "width");
                        vars.push({ id: crypto.randomUUID(), name: "width", type: "float", value: val });
                        handleUpdate({ ...localEntity, variables: vars });
                      }} />
                  </div>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>높이</span>
                    <input type="number" style={inputStyle}
                      value={Number(localEntity.variables.find(v => v.name === "height")?.value ?? 100)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        let vars = localEntity.variables.filter(v => v.name !== "height");
                        vars.push({ id: crypto.randomUUID(), name: "height", type: "float", value: val });
                        handleUpdate({ ...localEntity, variables: vars });
                      }} />
                  </div>
                </>
              )}

              {/* Bar Specific Settings */}
              {String(localEntity.variables.find(v => v.name === "uiType")?.value) === "bar" && (
                <>
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>게이지 색상</span>
                    <input type="color" style={{ ...inputStyle, width: '40px', padding: 0 }}
                      value={String(localEntity.variables.find(v => v.name === "uiBarColor")?.value ?? "#e74c3c")}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "uiBarColor");
                        vars.push({ id: crypto.randomUUID(), name: "uiBarColor", type: "string", value: val });
                        handleUpdate({ ...localEntity, variables: vars });
                      }} />
                  </div>
                  {/* Unified Value Picker: Entity.Variable format */}
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>현재값</span>
                    <select
                      style={{ ...inputStyle, width: '140px' }}
                      value={(() => {
                        const srcId = localEntity.variables.find(v => v.name === "uiSourceEntity")?.value;
                        const varName = localEntity.variables.find(v => v.name === "uiValueVar")?.value;
                        return srcId && varName ? `${srcId}|${varName}` : "";
                      })()}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => !["uiSourceEntity", "uiValueVar"].includes(v.name));
                        if (val) {
                          const [entityId, varName] = val.split("|");
                          vars.push({ id: crypto.randomUUID(), name: "uiSourceEntity", type: "string", value: entityId });
                          vars.push({ id: crypto.randomUUID(), name: "uiValueVar", type: "string", value: varName });
                        }
                        handleUpdate({ ...localEntity, variables: vars });
                      }}
                    >
                      <option value="">(None)</option>
                      {/* Global entities */}
                      {Array.from(core.getGlobalEntities().values()).map((ent: any) => (
                        <optgroup key={`global-${ent.id}`} label={`🌐 ${ent.name}`}>
                          {ent.variables?.filter((v: any) => ["int", "float"].includes(v.type)).map((v: any) => (
                            <option key={`${ent.id}-${v.name}`} value={`${ent.id}|${v.name}`}>
                              {ent.name}.{v.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      {/* Scene entities */}
                      {Array.from(core.getEntities().values())
                        .filter((ent: any) => ent.id !== localEntity.id && !ent.variables?.find((v: any) => v.name === "isUI")?.value)
                        .map((ent: any) => (
                          <optgroup key={`scene-${ent.id}`} label={ent.name}>
                            {ent.variables?.filter((v: any) => ["int", "float"].includes(v.type)).map((v: any) => (
                              <option key={`${ent.id}-${v.name}`} value={`${ent.id}|${v.name}`}>
                                {ent.name}.{v.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                    </select>
                  </div>
                  {/* Unified Max Picker: Entity.Variable format */}
                  <div style={rowStyle}>
                    <span style={{ ...labelStyle, width: 'auto', flex: 1 }}>최대값</span>
                    <select
                      style={{ ...inputStyle, width: '140px' }}
                      value={(() => {
                        const srcId = localEntity.variables.find(v => v.name === "uiSourceEntity")?.value;
                        const varName = localEntity.variables.find(v => v.name === "uiMaxVar")?.value;
                        return srcId && varName ? `${srcId}|${varName}` : "";
                      })()}
                      onChange={(e) => {
                        const val = e.target.value;
                        let vars = localEntity.variables.filter(v => v.name !== "uiMaxVar");
                        if (val) {
                          const [entityId, varName] = val.split("|");
                          // Also update source entity if not set
                          if (!localEntity.variables.find(v => v.name === "uiSourceEntity")?.value) {
                            vars = vars.filter(v => v.name !== "uiSourceEntity");
                            vars.push({ id: crypto.randomUUID(), name: "uiSourceEntity", type: "string", value: entityId });
                          }
                          vars.push({ id: crypto.randomUUID(), name: "uiMaxVar", type: "string", value: varName });
                        }
                        handleUpdate({ ...localEntity, variables: vars });
                      }}
                    >
                      <option value="">(None)</option>
                      {/* Global entities */}
                      {Array.from(core.getGlobalEntities().values()).map((ent: any) => (
                        <optgroup key={`global-max-${ent.id}`} label={`🌐 ${ent.name}`}>
                          {ent.variables?.filter((v: any) => ["int", "float"].includes(v.type)).map((v: any) => (
                            <option key={`${ent.id}-max-${v.name}`} value={`${ent.id}|${v.name}`}>
                              {ent.name}.{v.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      {/* Scene entities */}
                      {Array.from(core.getEntities().values())
                        .filter((ent: any) => ent.id !== localEntity.id && !ent.variables?.find((v: any) => v.name === "isUI")?.value)
                        .map((ent: any) => (
                          <optgroup key={`scene-max-${ent.id}`} label={ent.name}>
                            {ent.variables?.filter((v: any) => ["int", "float"].includes(v.type)).map((v: any) => (
                              <option key={`${ent.id}-max-${v.name}`} value={`${ent.id}|${v.name}`}>
                                {ent.name}.{v.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Components Section */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Components</div>
        <ComponentSection entity={localEntity} onUpdateEntity={handleUpdate} />
      </div>
    </div>
  );
}
