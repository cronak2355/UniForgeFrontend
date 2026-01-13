import { useId } from "react";
import { useNavigate } from "react-router-dom";
import type { EditorVariable } from "../types/Variable";
import type { ModuleGraph } from "../types/Module";
import { colors } from "../constants/colors";
import * as styles from "./ComponentSection.styles";
import type { Asset } from "../types/Asset";
import type { EditorEntity } from "../types/Entity";

export function ActionEditor({
  action,
  availableActions,
  actionLabels,
  variables,
  entities,
  modules,
  scenes,
  assets,
  currentEntity,
  onCreateVariable,
  onUpdateModuleVariable,
  onUpdate,
  onRemove,
  showRemove = true,
}: {
  action: { type: string;[key: string]: unknown };
  availableActions: string[];
  actionLabels?: Record<string, string>;
  variables: EditorVariable[];
  entities: { id: string; name: string }[];
  modules: ModuleGraph[];
  scenes?: { id: string; name: string }[];
  assets?: Asset[];
  currentEntity?: EditorEntity;
  onCreateVariable?: (name: string, value: unknown, type?: EditorVariable["type"]) => void;
  onUpdateModuleVariable?: (moduleId: string, name: string, value: unknown, type?: EditorVariable["type"]) => void;
  onUpdate: (a: { type: string;[key: string]: unknown }) => void;
  onRemove: () => void;
  showRemove?: boolean;
}) {
  const listId = useId();
  const navigate = useNavigate();
  const selectedVar = variables.find((v) => v.name === (action.name as string));
  const selectedModuleId =
    (action.moduleId as string) ??
    (action.moduleName as string) ??
    (action.name as string) ??
    "";
  const selectedModule = modules.find((mod) => mod.id === selectedModuleId) ?? null;
  const moduleVariables = selectedModule?.variables ?? [];
  const selectedSceneId =
    (action.sceneId as string) ||
    scenes?.find((scene) => scene.name === (action.sceneName as string))?.id ||
    "";
  const spawnTemplateId = (action.templateId as string) ?? "__self__";
  const spawnPositionMode = (action.positionMode as string) ?? "relative";
  const spawnSourceType = (action.sourceType as string) ?? "texture";
  const spawnAssetId = (action.sourceAssetId as string) ?? "";
  const prefabAssets = (assets ?? []).filter((asset) => asset.tag === "Prefab");
  const textureAssets = (assets ?? []).filter((asset) => asset.tag !== "Prefab");

  // Animation Logic
  const textureName = currentEntity?.texture || currentEntity?.name;
  const asset = assets?.find(a => a.name === textureName);
  const availableAnimations: string[] = [];
  if (asset?.metadata?.animations) {
    for (const animName of Object.keys(asset.metadata.animations)) {
      availableAnimations.push(`${asset.name}_${animName}`);
    }
  }

  return (
    <div style={styles.actionRow}>
      <div style={styles.actionHeader}>
        <div style={{ flex: 1 }}>
          <select
            value={action.type}
            onChange={(e) => onUpdate({ type: e.target.value })}
            style={styles.selectField}
          >
            {!availableActions.includes(action.type) && (
              <option key="__current" value={action.type}>
                {action.type}
              </option>
            )}
            {availableActions.map((a) => (
              <option key={a} value={a}>
                {actionLabels?.[a] ?? a} ({a})
              </option>
            ))}
          </select>
        </div>
        {showRemove && (
          <button onClick={onRemove} style={styles.removeButton}>
            ×
          </button>
        )}
      </div>

      <div style={styles.actionParams}>
        {action.type === "Move" && (
          <>
            <ParamInput label="x" value={action.x as number} onChange={(v) => onUpdate({ ...action, x: v })} />
            <ParamInput label="y" value={action.y as number} onChange={(v) => onUpdate({ ...action, y: v })} />
            <ParamInput label="speed" value={action.speed as number} defaultValue={200} onChange={(v) => onUpdate({ ...action, speed: v })} />
          </>
        )}

      {action.type === "ChaseTarget" && (
        <>
          <select
            value={(action.targetId as string) || ""}
            onChange={(e) => onUpdate({ ...action, targetId: e.target.value })}
            style={styles.smallSelect}
          >
            <option value="">(target)</option>
            {entities.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name || ent.id}
              </option>
            ))}
          </select>
          <ParamInput label="speed" value={action.speed as number} defaultValue={80} onChange={(v) => onUpdate({ ...action, speed: v })} />
        </>
      )}

      {(action.type === "TakeDamage" || action.type === "Heal") && (
        <ParamInput label="amount" value={action.amount as number} defaultValue={10} onChange={(v) => onUpdate({ ...action, amount: v })} />
      )}

      {action.type === "Attack" && (
        <>
          <ParamInput label="range" value={action.range as number} defaultValue={100} onChange={(v) => onUpdate({ ...action, range: v })} />
          <ParamInput label="damage" value={action.damage as number} defaultValue={10} onChange={(v) => onUpdate({ ...action, damage: v })} />
        </>
      )}

      {action.type === "SetVar" && (
        <>
          <input
            type="text"
            placeholder="name"
            value={(action.name as string) || ""}
            onChange={(e) => onUpdate({ ...action, name: e.target.value })}
            onBlur={() => {
              const name = (action.name as string) || "";
              if (!name || selectedVar) return;
              onCreateVariable?.(name, action.value);
            }}
            list={`${listId}-vars`}
            style={styles.textInput}
          />
          <datalist id={`${listId}-vars`}>
            {variables.map((v) => (
              <option key={v.id} value={v.name} />
            ))}
          </datalist>
          {selectedVar?.type === "bool" ? (
            <select
              value={action.value === true ? "true" : "false"}
              onChange={(e) => onUpdate({ ...action, value: e.target.value === "true" })}
              onBlur={() => {
                const name = (action.name as string) || "";
                if (!name || selectedVar) return;
                onCreateVariable?.(name, action.value);
              }}
              style={styles.smallSelect}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : selectedVar?.type === "int" || selectedVar?.type === "float" ? (
            <input
              type="number"
              placeholder="value"
              value={action.value !== undefined ? Number(action.value) : 0}
              onChange={(e) => onUpdate({ ...action, value: parseFloat(e.target.value) || 0 })}
              onBlur={() => {
                const name = (action.name as string) || "";
                if (!name || selectedVar) return;
                onCreateVariable?.(name, action.value);
              }}
              style={styles.textInput}
            />
          ) : (
            <input
              type="text"
              placeholder="value"
              value={action.value !== undefined ? String(action.value) : ""}
              onChange={(e) => onUpdate({ ...action, value: e.target.value })}
              onBlur={() => {
                const name = (action.name as string) || "";
                if (!name || selectedVar) return;
                onCreateVariable?.(name, action.value);
              }}
              style={styles.textInput}
            />
          )}
        </>
      )}

      {action.type === "PlayAnimation" && (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 6 }}>
          <select
            value={(action.animationName as string) || ""}
            onChange={(e) => onUpdate({ ...action, animationName: e.target.value })}
            style={{ ...styles.selectField, flex: 1 }}
          >
            <option value="">Select Animation</option>
            {availableAnimations.map((anim) => (
              <option key={anim} value={anim}>
                {anim}
              </option>
            ))}
            {availableAnimations.length === 0 && (
              <option value="" disabled>
                No animations found
              </option>
            )}
          </select>
          {asset && (
            <button
              onClick={() => navigate(`/assets-editor?assetId=${asset.id}`)}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                backgroundColor: colors.bgTertiary,
                color: colors.textPrimary,
                border: `1px solid ${colors.borderColor}`,
                borderRadius: 4,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
              title="Edit original asset animations"
            >
              Edit Anim
            </button>
          )}
        </div>
      )}

      {action.type === "ClearSignal" && (
        <input
          type="text"
          placeholder="signalKey"
          value={(action.key as string) || ""}
          onChange={(e) => onUpdate({ ...action, key: e.target.value })}
          style={styles.textInput}
        />
      )}

      {action.type === "ShowDialogue" && (
        <input
          type="text"
          placeholder="dialogue"
          value={(action.text as string) || ""}
          onChange={(e) => onUpdate({ ...action, text: e.target.value })}
          style={styles.textInput}
        />
      )}

      {action.type === "PlaySound" && (
        <input
          type="text"
          placeholder="soundId"
          value={(action.soundId as string) || ""}
          onChange={(e) => onUpdate({ ...action, soundId: e.target.value })}
          style={styles.textInput}
        />
      )}

      {action.type === "EmitEventSignal" && (
        <input
          type="text"
          placeholder="signalKey"
          value={(action.signalKey as string) || ""}
          onChange={(e) => onUpdate({ ...action, signalKey: e.target.value })}
          style={styles.textInput}
        />
      )}

      {action.type === "Rotate" && (
        <ParamInput label="speed" value={action.speed as number} defaultValue={90} onChange={(v) => onUpdate({ ...action, speed: v })} />
      )}

      {action.type === "Pulse" && (
        <>
          <ParamInput label="speed" value={action.speed as number} defaultValue={2} onChange={(v) => onUpdate({ ...action, speed: v })} />
          <ParamInput label="min" value={action.minScale as number} defaultValue={0.9} onChange={(v) => onUpdate({ ...action, minScale: v })} />
          <ParamInput label="max" value={action.maxScale as number} defaultValue={1.1} onChange={(v) => onUpdate({ ...action, maxScale: v })} />
        </>
      )}

      {action.type === "SpawnEntity" && (
        <>
          <select
            value={spawnTemplateId}
            onChange={(e) => onUpdate({ ...action, templateId: e.target.value })}
            style={styles.smallSelect}
          >
            <option value="__self__">(self)</option>
            <option value="">(none)</option>
            {entities.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name || ent.id}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <select
              value={spawnSourceType}
              onChange={(e) => onUpdate({ ...action, sourceType: e.target.value, sourceAssetId: "" })}
              style={styles.smallSelect}
            >
              <option value="texture">texture</option>
              <option value="prefab">prefab</option>
            </select>
            <select
              value={spawnAssetId}
              onChange={(e) => {
                const next = { ...action, sourceAssetId: e.target.value };
                if (spawnSourceType === "prefab") {
                  next.prefabId = e.target.value;
                }
                onUpdate(next);
              }}
              style={styles.smallSelect}
            >
              <option value="">(asset)</option>
              {(spawnSourceType === "prefab" ? prefabAssets : textureAssets).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name || asset.id}
                </option>
              ))}
            </select>
          </div>
          <select
            value={spawnPositionMode}
            onChange={(e) => onUpdate({ ...action, positionMode: e.target.value })}
            style={styles.smallSelect}
          >
            <option value="relative">relative</option>
            <option value="absolute">absolute</option>
          </select>
          {spawnPositionMode === "absolute" ? (
            <>
              <ParamInput label="x" value={action.x as number} onChange={(v) => onUpdate({ ...action, x: v })} />
              <ParamInput label="y" value={action.y as number} onChange={(v) => onUpdate({ ...action, y: v })} />
            </>
          ) : (
            <>
              <ParamInput label="dx" value={action.offsetX as number} onChange={(v) => onUpdate({ ...action, offsetX: v })} />
              <ParamInput label="dy" value={action.offsetY as number} onChange={(v) => onUpdate({ ...action, offsetY: v })} />
            </>
          )}
          {spawnSourceType === "texture" && (
            <>
              <input
                type="text"
                placeholder="texture"
                value={(action.texture as string) || ""}
                onChange={(e) => onUpdate({ ...action, texture: e.target.value })}
                list={`${listId}-textures`}
                style={styles.textInput}
              />
              <datalist id={`${listId}-textures`}>
                {assets?.map((a) => (
                  <option key={a.id} value={a.name} />
                ))}
              </datalist>
            </>
          )}
        </>
      )}

      {action.type === "Enable" && (
        <select
          value={action.enabled === false ? "false" : "true"}
          onChange={(e) => onUpdate({ ...action, enabled: e.target.value === "true" })}
          style={styles.smallSelect}
        >
          <option value="true">enable</option>
          <option value="false">disable</option>
        </select>
      )}

      {action.type === "ChangeScene" && (
        (scenes && scenes.length > 0) ? (
          <select
            value={selectedSceneId}
            onChange={(e) => {
              const nextId = e.target.value;
              const nextName = scenes.find((s) => s.id === nextId)?.name ?? "";
              onUpdate({ ...action, sceneId: nextId, sceneName: nextName });
            }}
            style={styles.smallSelect}
          >
            <option value="">(scene)</option>
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder="sceneName"
            value={(action.sceneName as string) || ""}
            onChange={(e) => onUpdate({ ...action, sceneName: e.target.value })}
            style={styles.textInput}
          />
        )
      )}

      {action.type === "PlayParticle" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={(action.preset as string) || "hit_spark"}
            onChange={(e) => onUpdate({ ...action, preset: e.target.value })}
            style={styles.selectField}
          >
            <optgroup label="전투">
              <option value="hit_spark">⚡ hit_spark (피격 효과)</option>
              <option value="explosion">💥 explosion (폭발)</option>
              <option value="blood">🩸 blood (피 튀기기)</option>
              <option value="heal">💚 heal (힐링)</option>
              <option value="magic">🔮 magic (마법)</option>
            </optgroup>
            <optgroup label="환경">
              <option value="rain">🌧️ rain (비)</option>
              <option value="dust">💨 dust (먼지)</option>
              <option value="fire">🔥 fire (불꽃)</option>
              <option value="smoke">🌫️ smoke (연기)</option>
              <option value="snow">❄️ snow (눈)</option>
            </optgroup>
            <optgroup label="UI">
              <option value="sparkle">✨ sparkle (반짝임)</option>
              <option value="level_up">⭐ level_up (레벨업)</option>
              <option value="coin">🪙 coin (코인)</option>
              <option value="confetti">🎊 confetti (축하)</option>
            </optgroup>
            {/* 커스텀 파티클 (Particle 태그 에셋) */}
            {(assets ?? []).filter(a => a.tag === 'Particle').length > 0 && (
              <optgroup label="🎨 커스텀">
                {(assets ?? []).filter(a => a.tag === 'Particle').map(a => (
                  <option key={a.id} value={`custom:${a.id}`}>🖼️ {a.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#aaa', fontSize: '11px', minWidth: '35px' }}>크기</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={(action.scale as number) ?? 1}
              onChange={(e) => onUpdate({ ...action, scale: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ color: '#fff', fontSize: '11px', minWidth: '25px' }}>
              {(action.scale as number) ?? 1}x
            </span>
          </div>
        </div>
      )}

      {action.type === "StartParticleEmitter" && (
        <>
          <input
            type="text"
            placeholder="emitterId"
            value={(action.emitterId as string) || ""}
            onChange={(e) => onUpdate({ ...action, emitterId: e.target.value })}
            style={{ ...styles.textInput, width: 80 }}
          />
          <select
            value={(action.preset as string) || "fire"}
            onChange={(e) => onUpdate({ ...action, preset: e.target.value })}
            style={styles.smallSelect}
          >
            <option value="fire">🔥 fire</option>
            <option value="smoke">🌫️ smoke</option>
            <option value="rain">🌧️ rain</option>
            <option value="snow">❄️ snow</option>
            <option value="sparkle">✨ sparkle</option>
          </select>
        </>
      )}

      {action.type === "StopParticleEmitter" && (
        <input
          type="text"
          placeholder="emitterId"
          value={(action.emitterId as string) || ""}
          onChange={(e) => onUpdate({ ...action, emitterId: e.target.value })}
          style={styles.textInput}
        />
      )}

      {action.type === "RunModule" && (
        <div style={{ flex: "1 1 100%", display: "flex", flexDirection: "column", gap: 4 }}>
          <select
            value={selectedModuleId}
            onChange={(e) => onUpdate({ ...action, moduleId: e.target.value })}
            style={styles.smallSelect}
          >
            <option value="">(module)</option>
            {modules.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.name || mod.id}
              </option>
            ))}
          </select>
          {moduleVariables.length > 0 && (
            <div
              style={{
                fontSize: 10,
                color: colors.textSecondary,
                textAlign: "left",
                alignItems: "flex-start",
                background: colors.bgTertiary,
                border: `1px solid ${colors.borderColor}`,
                borderRadius: 6,
                padding: "4px",
                width: "100%",
                boxSizing: "border-box",
                gap: 4,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {moduleVariables.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40% 1fr",
                    gap: 6,
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <div style={{ minWidth: 0, color: colors.textPrimary, fontSize: 11 }}>
                    {v.name} ({v.type})
                  </div>
                  {v.type === "bool" ? (
                    <select
                      value={v.value === true ? "true" : "false"}
                      onChange={(e) =>
                        selectedModule &&
                        onUpdateModuleVariable?.(selectedModule.id, v.name, e.target.value === "true", v.type)
                      }
                      style={{ ...styles.smallSelect, flex: "1 1 auto", minWidth: 0 }}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : v.type === "int" || v.type === "float" ? (
                    <input
                      type="number"
                      value={typeof v.value === "number" ? v.value : Number(v.value ?? 0)}
                      onChange={(e) =>
                        selectedModule &&
                        onUpdateModuleVariable?.(
                          selectedModule.id,
                          v.name,
                          Number(e.target.value),
                          v.type
                        )
                      }
                      style={{ ...styles.textInput, flex: "1 1 auto", width: "100%", marginBottom: 0 }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(v.value ?? "")}
                      onChange={(e) =>
                        selectedModule &&
                        onUpdateModuleVariable?.(selectedModule.id, v.name, e.target.value, v.type)
                      }
                      style={{ ...styles.textInput, flex: "1 1 auto", width: "100%", marginBottom: 0 }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function ParamInput({
  label,
  value,
  defaultValue = 0,
  onChange,
}: {
  label: string;
  value: number | undefined;
  defaultValue?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={styles.paramInputContainer}>
      <span style={styles.paramLabel}>{label}:</span>
      <input
        type="number"
        value={value ?? defaultValue}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={styles.smallNumberInput}
      />
    </div>
  );
}
