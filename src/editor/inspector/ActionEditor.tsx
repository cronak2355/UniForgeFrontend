import { useId } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const { gameId } = useParams<{ gameId?: string }>();
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

  // Animation Logic - Enhanced to auto-generate animations
  const textureName = currentEntity?.texture || currentEntity?.name;
  const currentAsset = assets?.find(a => a.name === textureName);
  const availableAnimations: string[] = [];

  // 1. Add animations from current entity's asset
  if (currentAsset) {
    if (currentAsset.metadata?.animations) {
      for (const animName of Object.keys(currentAsset.metadata.animations)) {
        availableAnimations.push(`${currentAsset.name}_${animName}`);
      }
    }
    // Auto-generate "default" animation if asset has multiple frames but no explicit animations
    const frameCount = currentAsset.metadata?.frameCount ?? 1;
    if (frameCount > 1 && !currentAsset.metadata?.animations) {
      availableAnimations.push(`${currentAsset.name}_default`);
    }
  }

  // 2. Also show animations from ALL other assets for flexibility (including Particle, Tile, etc.)
  (assets ?? []).forEach(a => {
    if (a.name === currentAsset?.name) return; // Already added above

    // Add explicit animations if defined
    if (a.metadata?.animations) {
      for (const animName of Object.keys(a.metadata.animations)) {
        availableAnimations.push(`${a.name}_${animName}`);
      }
    }

    // Auto-generate default for:
    // 1. Multi-frame assets (frameCount > 1)
    // 2. Assets with spritesheet metadata (frameWidth exists)
    // 3. ALL Particle and Character assets (even without metadata, assume they're spritesheets)
    const fc = a.metadata?.frameCount ?? (a.metadata?.frameWidth ? 999 : 1);
    const isAlwaysShow = a.tag === 'Particle' || a.tag === 'Character'; // Always show these tags

    if ((fc > 1 || isAlwaysShow) && !a.metadata?.animations) {
      availableAnimations.push(`${a.name}_default`);
    }
  });

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
            <ParamInput
              label="direction"
              value={action.direction ?? { x: 0, y: 0 }}
              onChange={(v) => onUpdate({ ...action, direction: v })}
              variables={variables}
              entities={entities}
              listId={listId}
              targetType="vector2"
            />
            <ParamInput label="speed" value={action.speed} defaultValue={200} onChange={(v) => onUpdate({ ...action, speed: v })} variables={variables} entities={entities} listId={listId} />
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: '#888', width: 60 }}>Snap</span>
              <select
                value={action.snap === true ? "true" : "false"}
                onChange={(e) => onUpdate({ ...action, snap: e.target.value === "true" })}
                style={{ ...styles.smallSelect, flex: 1 }}
              >
                <option value="false">Off</option>
                <option value="true">On</option>
              </select>
            </div>
          </>
        )}

        {action.type === "MoveToward" && (
          <>
            <ParamInput
              label="position"
              value={action.position ?? { x: action.x ?? 0, y: action.y ?? 0 }}
              onChange={(v) => onUpdate({ ...action, position: v, x: undefined, y: undefined })}
              variables={variables}
              entities={entities}
              listId={listId}
              targetType="vector2"
            />
            <ParamInput label="speed" value={action.speed} defaultValue={100} onChange={(v) => onUpdate({ ...action, speed: v })} variables={variables} entities={entities} listId={listId} />
          </>
        )}

        {action.type === "Wait" && (
          <ParamInput
            label="seconds"
            value={action.seconds}
            defaultValue={1}
            onChange={(v) => onUpdate({ ...action, seconds: v })}
            variables={variables}
            entities={entities}
            listId={listId}
          />
        )}

        {action.type === "TakeDamage" && (
          <ParamInput label="amount" value={action.amount} defaultValue={10} onChange={(v) => onUpdate({ ...action, amount: v })} variables={variables} entities={entities} listId={listId} />
        )}

        {action.type === "Attack" && (
          <>
            <ParamInput label="range" value={action.range} defaultValue={100} onChange={(v) => onUpdate({ ...action, range: v })} variables={variables} entities={entities} listId={listId} />
            <ParamInput label="damage" value={action.damage} defaultValue={10} onChange={(v) => onUpdate({ ...action, damage: v })} variables={variables} entities={entities} listId={listId} />
          </>
        )}



        {action.type === "SetVar" && (
          <div className="flex flex-col gap-2 w-full">
            {/* Target Variable */}
            <div className="flex gap-1 items-center">
              <span className="text-xs text-gray-500 w-12">Target</span>
              <select
                value={(action.name as string) || ""}
                onChange={(e) => {
                  const newName = e.target.value;
                  const targetVar = variables.find(v => v.name === newName);

                  let updates: any = { name: newName };

                  if (targetVar) {
                    const isVectorVar = targetVar.type === 'vector2';
                    const currentOp1 = action.operand1;
                    const isOp1Vector = typeof currentOp1 === 'object' && currentOp1 !== null && 'x' in currentOp1;

                    if (isVectorVar && !isOp1Vector) {
                      updates.operand1 = { x: 0, y: 0 };
                      updates.operand2 = { x: 0, y: 0 };
                    } else if (!isVectorVar && isOp1Vector) {
                      updates.operand1 = 0;
                      updates.operand2 = 0;
                    }
                  }

                  onUpdate({ ...action, ...updates });
                }}
                style={{ ...styles.selectField, flex: 1, minWidth: 0 }}
              >
                <option value="" disabled>Select Variable</option>
                <optgroup label="Transform">
                  <option value="x">x (position)</option>
                  <option value="y">y (position)</option>
                  <option value="scaleX">scaleX</option>
                  <option value="scaleY">scaleY</option>
                  <option value="rotation">rotation</option>
                </optgroup>
                <optgroup label="Variables">
                  {variables.map((v) => (
                    <option key={v.id} value={v.name}>{v.name} ({v.type})</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Operation Selector */}
            <div className="flex gap-1 items-center">
              <span className="text-xs text-gray-500 w-12">Op</span>
              <select
                value={(action.operation as string) || "Set"}
                onChange={(e) => onUpdate({ ...action, operation: e.target.value })}
                style={{ ...styles.smallSelect, flex: 1 }}
              >
                <option value="Set">=</option>
                <option value="Add">+ (Add)</option>
                <option value="Sub">- (Sub)</option>
                <option value="Multiply">* (Mul)</option>
                <option value="Divide">/ (Div)</option>
              </select>
            </div>

            {/* Operand 1 */}
            <OperandInput
              label="Val 1"
              value={action.operand1 ?? (selectedVar?.type === "vector2" ? { x: 0, y: 0 } : 0)}
              onChange={(v) => onUpdate({ ...action, operand1: v })}
              variables={variables}
              entities={entities}
              listId={listId}
              targetType={selectedVar?.type}
            />

            {/* Operand 2 (Only if not Set) */}
            {((action.operation || 'Set') !== "Set") && (
              <OperandInput
                label="Val 2"
                value={action.operand2 ?? (selectedVar?.type === "vector2" ? { x: 0, y: 0 } : 0)}
                onChange={(v) => onUpdate({ ...action, operand2: v })}
                variables={variables}
                entities={entities}
                listId={listId}
                targetType={selectedVar?.type}
              />
            )}
          </div>
        )}



        {action.type === "Attack" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#aaa', fontSize: '11px', marginRight: '8px', width: '40px' }}>DMG</span>
              <input
                type="number"
                placeholder="10"
                value={(action.damage as number) ?? ""}
                onChange={(e) => onUpdate({ ...action, damage: parseFloat(e.target.value) })}
                style={{ ...styles.textInput, flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#aaa', fontSize: '11px', marginRight: '8px', width: '40px' }}>Range</span>
              <input
                type="number"
                placeholder="100"
                value={(action.range as number) ?? ""}
                onChange={(e) => onUpdate({ ...action, range: parseFloat(e.target.value) })}
                style={{ ...styles.textInput, flex: 1 }}
              />
            </div>
            <datalist id="action-particle-presets">
              <option value="none">❌ 이펙트 없음</option>
              <option value="hit_spark">⚡ hit_spark</option>
              <option value="blood">🩸 blood (피)</option>
              <option value="explosion">💥 explosion (폭발)</option>
              <option value="magic">🔮 magic (마법)</option>
              {/* Custom Particles */}
              {assets?.filter((a: Asset) => a.tag === 'Particle' || a.tag === 'Effect').map((a: Asset) => (
                <option key={a.id} value={`custom:${a.name}`}>{a.name}</option>
              ))}
            </datalist>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#aaa', fontSize: '11px', marginRight: '8px', width: '40px' }}>Effect</span>
              <input
                list="action-particle-presets"
                style={{ ...styles.textInput, flex: 1 }}
                placeholder="(재질 따름)"
                value={(action.hitEffect as string) || ""}
                onChange={(e) => onUpdate({ ...action, hitEffect: e.target.value })}
              />
            </div>
          </div>
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

            {currentAsset && (
              <button
                onClick={() => navigate(`/assets-editor?assetId=${currentAsset.id}`)}
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
          <ParamInput label="speed" value={action.speed} defaultValue={90} onChange={(v) => onUpdate({ ...action, speed: v })} variables={variables} entities={entities} listId={listId} />
        )}

        {action.type === "Pulse" && (
          <>
            <ParamInput label="speed" value={action.speed} defaultValue={2} onChange={(v) => onUpdate({ ...action, speed: v })} variables={variables} entities={entities} listId={listId} />
            <ParamInput label="min" value={action.minScale} defaultValue={0.9} onChange={(v) => onUpdate({ ...action, minScale: v })} variables={variables} entities={entities} listId={listId} />
            <ParamInput label="max" value={action.maxScale} defaultValue={1.1} onChange={(v) => onUpdate({ ...action, maxScale: v })} variables={variables} entities={entities} listId={listId} />
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
                    (next as any).prefabId = e.target.value;
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
                <ParamInput label="x" value={action.x} onChange={(v) => onUpdate({ ...action, x: v })} variables={variables} entities={entities} listId={listId} />
                <ParamInput label="y" value={action.y} onChange={(v) => onUpdate({ ...action, y: v })} variables={variables} entities={entities} listId={listId} />
              </>
            ) : (
              <>
                <ParamInput label="dx" value={action.offsetX} onChange={(v) => onUpdate({ ...action, offsetX: v })} variables={variables} entities={entities} listId={listId} />
                <ParamInput label="dy" value={action.offsetY} onChange={(v) => onUpdate({ ...action, offsetY: v })} variables={variables} entities={entities} listId={listId} />
              </>
            )}
            {/* Prefab Initial Variables Override UI */}
            <ParamInput label="cooldown" value={(action as any).cooldown} onChange={(v) => onUpdate({ ...action, cooldown: v })} variables={variables} entities={entities} listId={listId} />

            {spawnSourceType === "prefab" && spawnAssetId && (
              (() => {
                const prefabAsset = prefabAssets.find(a => a.id === spawnAssetId);
                let prefabVars: EditorVariable[] = [];
                try {
                  if (prefabAsset?.metadata?.prefab) {
                    const prefabData = typeof prefabAsset.metadata.prefab === 'string'
                      ? JSON.parse(prefabAsset.metadata.prefab)
                      : prefabAsset.metadata.prefab;
                    prefabVars = prefabData.variables || [];
                  }
                } catch (e) {
                  console.warn("Failed to parse prefab variables", e);
                }

                if (prefabVars.length === 0) return null;

                const initialVariables = (action.initialVariables as Record<string, any>) || {};

                return (
                  <div style={{
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
                  }}>
                    <div style={{ marginBottom: 2, fontWeight: 600 }}>Initial Variables</div>
                    {prefabVars.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "30% 1fr",
                          gap: 6,
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <div style={{ minWidth: 0, color: colors.textPrimary, fontSize: 11 }}>
                          {v.name}
                        </div>
                        {v.type === "bool" ? (
                          <select
                            value={(initialVariables[v.name] ?? v.value) === true ? "true" : "false"}
                            onChange={(e) => {
                              const newVal = e.target.value === "true";
                              const nextVars = { ...initialVariables, [v.name]: newVal };
                              // If value matches default, remove from override to save space? 
                              // For simplicity, just set it.
                              onUpdate({ ...action, initialVariables: nextVars });
                            }}
                            style={{ ...styles.smallSelect, flex: "1 1 auto", minWidth: 0 }}
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : v.type === "int" || v.type === "float" ? (
                          <input
                            type="number"
                            placeholder={String(v.value)}
                            value={initialVariables[v.name] !== undefined ? initialVariables[v.name] : ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? undefined : Number(e.target.value);
                              const nextVars = { ...initialVariables };
                              if (val === undefined) {
                                delete nextVars[v.name];
                              } else {
                                nextVars[v.name] = val;
                              }
                              onUpdate({ ...action, initialVariables: nextVars });
                            }}
                            style={{ ...styles.textInput, flex: "1 1 auto", width: "100%", marginBottom: 0 }}
                          />
                        ) : v.type === "vector2" ? (
                          // Vector2 Override UI
                          <div style={{ display: 'flex', gap: 2, minWidth: 0, flex: 1 }}>
                            <input
                              type="number"
                              placeholder="x"
                              style={{ ...styles.textInput, flex: 1, minWidth: 20, padding: "2px" }}
                              value={((initialVariables[v.name] as any)?.x) ?? (v.value as any)?.x ?? 0}
                              onChange={(e) => {
                                const oldVal = (initialVariables[v.name] as any) ?? (v.value as any) ?? { x: 0, y: 0 };
                                const nextVars = { ...initialVariables, [v.name]: { ...oldVal, x: Number(e.target.value) } };
                                onUpdate({ ...action, initialVariables: nextVars });
                              }}
                            />
                            <input
                              type="number"
                              placeholder="y"
                              style={{ ...styles.textInput, flex: 1, minWidth: 20, padding: "2px" }}
                              value={((initialVariables[v.name] as any)?.y) ?? (v.value as any)?.y ?? 0}
                              onChange={(e) => {
                                const oldVal = (initialVariables[v.name] as any) ?? (v.value as any) ?? { x: 0, y: 0 };
                                const nextVars = { ...initialVariables, [v.name]: { ...oldVal, y: Number(e.target.value) } };
                                onUpdate({ ...action, initialVariables: nextVars });
                              }}
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder={String(v.value)}
                            value={initialVariables[v.name] !== undefined ? initialVariables[v.name] : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextVars = { ...initialVariables };
                              if (val === "") delete nextVars[v.name];
                              else nextVars[v.name] = val;
                              onUpdate({ ...action, initialVariables: nextVars });
                            }}
                            style={{ ...styles.textInput, flex: "1 1 auto", width: "100%", marginBottom: 0 }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </>
        )}

        {action.type === "SpawnIfClear" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <select
              value={(action.templateId as string) || ""}
              onChange={(e) => onUpdate({ ...action, templateId: e.target.value })}
              style={styles.smallSelect}
            >
              <option value="">(template)</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name || ent.id}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "4px" }}>
              <ParamInput label="Count" value={(action as any).count ?? 1} onChange={(v) => onUpdate({ ...action, count: v })} variables={variables} entities={entities} listId={listId} />
              <ParamInput label="Radius" value={(action as any).radius ?? 100} onChange={(v) => onUpdate({ ...action, radius: v })} variables={variables} entities={entities} listId={listId} />
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <ParamInput label="CheckRad" value={(action as any).checkRadius ?? 30} onChange={(v) => onUpdate({ ...action, checkRadius: v })} variables={variables} entities={entities} listId={listId} />
              <ParamInput label="Cooldown" value={(action as any).cooldown ?? 0} onChange={(v) => onUpdate({ ...action, cooldown: v })} variables={variables} entities={entities} listId={listId} />
            </div>
            <select
              value={(action.role as string) || "neutral"}
              onChange={(e) => onUpdate({ ...action, role: e.target.value })}
              style={styles.smallSelect}
            >
              <option value="neutral">neutral</option>
              <option value="player">player</option>
              <option value="hostile">hostile</option>
              <option value="friendly">friendly</option>
              <option value="consumable">consumable</option>
              <option value="wall">wall</option>
            </select>
          </div>
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

            <ParamInput label="Scale" value={action.scale} defaultValue={1} onChange={(v) => onUpdate({ ...action, scale: v })} variables={variables} entities={entities} listId={listId} />
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

        {action.type === "If" && (
          <IfActionEditor
            action={action}
            variables={variables}
            entities={entities}
            modules={modules}
            scenes={scenes}
            assets={assets}
            currentEntity={currentEntity}
            availableActions={availableActions}
            actionLabels={actionLabels}
            onCreateVariable={onCreateVariable}
            onUpdateModuleVariable={onUpdateModuleVariable}
            onUpdate={onUpdate}
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
                {moduleVariables.map((v) => {
                  const initialVariables = (action.initialVariables as Record<string, any>) || {};
                  const currentVal = initialVariables[v.name] ?? v.value;

                  const updateVar = (newVal: any) => {
                    const nextVars = { ...initialVariables, [v.name]: newVal };
                    onUpdate({ ...action, initialVariables: nextVars });
                  };

                  return (
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
                          value={currentVal === true ? "true" : "false"}
                          onChange={(e) => updateVar(e.target.value === "true")}
                          style={{ ...styles.smallSelect, flex: "1 1 auto", minWidth: 0 }}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : v.type === "int" || v.type === "float" ? (
                        <input
                          type="number"
                          value={typeof currentVal === "number" ? currentVal : Number(currentVal ?? 0)}
                          onChange={(e) => updateVar(Number(e.target.value))}
                          style={{ ...styles.textInput, flex: "1 1 auto", width: "100%", marginBottom: 0 }}
                        />
                      ) : v.type === "vector2" ? (
                        <div style={{ display: 'flex', gap: 2, minWidth: 0, flex: 1 }}>
                          <input
                            type="number"
                            placeholder="x"
                            style={{ ...styles.textInput, flex: 1, minWidth: 20, padding: "2px" }}
                            value={((currentVal as any)?.x) ?? 0}
                            onChange={(e) => {
                              const oldVal = (currentVal as any) ?? { x: 0, y: 0 };
                              const nextVal = { ...oldVal, x: Number(e.target.value) };
                              updateVar(nextVal);
                            }}
                          />
                          <input
                            type="number"
                            placeholder="y"
                            style={{ ...styles.textInput, flex: 1, minWidth: 20, padding: "2px" }}
                            value={((currentVal as any)?.y) ?? 0}
                            onChange={(e) => {
                              const oldVal = (currentVal as any) ?? { x: 0, y: 0 };
                              const nextVal = { ...oldVal, y: Number(e.target.value) };
                              updateVar(nextVal);
                            }}
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={String(currentVal ?? "")}
                          onChange={(e) => updateVar(e.target.value)}
                          style={{ ...styles.textInput, flex: "1 1 auto", width: "100%", marginBottom: 0 }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div >
  );
}

function ParamInput({
  label,
  value,
  defaultValue = 0,
  onChange,
  variables,
  entities,
  listId,
  targetType,
}: {
  label: string;
  value: any;
  defaultValue?: number;
  onChange: (v: any) => void;
  variables: EditorVariable[];
  entities: { id: string; name: string }[];
  listId: string;
  targetType?: string;
}) {
  return (
    <OperandInput
      label={label}
      value={value ?? defaultValue}
      onChange={onChange}
      variables={variables}
      entities={entities}
      listId={listId}
      targetType={targetType}
    />
  );
}

function OperandInput({
  label,
  value,
  onChange,
  variables,
  entities,
  listId,
  targetType
}: {
  label: string;
  value: any; // ValueSource | number | string | ...
  onChange: (val: any) => void;
  variables: EditorVariable[];
  entities: { id: string; name: string }[];
  listId: string;
  targetType?: string;
}) {
  // Normalize value to ValueSource structure if it isn't already
  const source = (typeof value === 'object' && value !== null && 'type' in value)
    ? value
    : { type: 'literal', value: value };

  const sourceType = source.type || 'literal';

  // Decide Vector2 mode:
  // 1. If strict `targetType` is provided, use it ('vector2' -> true, else false)
  // 2. Fallback to inferring from value (legacy behavior)
  const isVector2 = targetType
    ? targetType === 'vector2'
    : (sourceType === 'literal' && typeof source.value === 'object' && source.value !== null && 'x' in source.value);

  const updateSource = (updates: any) => {
    onChange({ ...source, ...updates });
  };

  const normalizeVector2 = (val: any) => {
    if (typeof val === "object" && val !== null && "x" in val && "y" in val) {
      return { x: (val as any).x, y: (val as any).y };
    }
    return { x: 0, y: 0 };
  };

  const parseMaybeNumber = (raw: string) => {
    if (raw === "" || raw === "-" || raw === "." || raw === "-.") return raw;
    const num = Number(raw);
    return Number.isNaN(num) ? raw : num;
  };

  const coerceNumber = (raw: string) => {
    const num = Number(raw);
    return Number.isNaN(num) ? 0 : num;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 4, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span className="text-xs text-gray-500">{label}</span>
        {/* Type Selector */}
        <select
          value={sourceType}
          onChange={(e) => updateSource({ type: e.target.value })}
          style={{ ...styles.smallSelect, width: '70px', flex: '0 0 auto' }}
        >
          <option value="literal">Value</option>
          <option value="variable">Var</option>
          <option value="property">Prop</option>
          <option value="mouse">Mouse</option>
        </select>
      </div>

      {/* Inputs based on Type */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>

        {sourceType === 'literal' && (
          <>
            {isVector2 ? (
              <div className="flex gap-1 items-center flex-1 min-w-0" style={{ minWidth: '100%' }}>
                <span className="text-[10px] text-gray-500 shrink-0">X</span>
                <input
                  className="variable-value min-w-0"
                  style={{ ...styles.smallNumberInput, flex: 1, width: '100%' }}
                  value={source.value?.x ?? 0}
                  onChange={(e) => {
                    const vector = normalizeVector2(source.value);
                    updateSource({ value: { ...vector, x: parseMaybeNumber(e.target.value) } });
                  }}
                  onBlur={(e) => {
                    const vector = normalizeVector2(source.value);
                    updateSource({ value: { ...vector, x: coerceNumber(e.target.value) } });
                  }}
                />
                <span className="text-[10px] text-gray-500 shrink-0">Y</span>
                <input
                  className="variable-value min-w-0"
                  style={{ ...styles.smallNumberInput, flex: 1, width: '100%' }}
                  value={source.value?.y ?? 0}
                  onChange={(e) => {
                    const vector = normalizeVector2(source.value);
                    updateSource({ value: { ...vector, y: parseMaybeNumber(e.target.value) } });
                  }}
                  onBlur={(e) => {
                    const vector = normalizeVector2(source.value);
                    updateSource({ value: { ...vector, y: coerceNumber(e.target.value) } });
                  }}
                />
              </div>
            ) : (
              <div className="flex gap-1 items-center flex-1 min-w-0" style={{ width: '100%' }}>
                <input
                  className="variable-value"
                  style={{ ...styles.textInput, flex: 1, width: '100%', minWidth: 0 }}
                  placeholder="0 or text"
                  value={(typeof source.value === 'object' && source.value !== null) ? 0 : (source.value ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = parseFloat(v);
                    updateSource({ value: isNaN(n) ? v : n });
                  }}
                />
              </div>
            )}
          </>
        )}

        {sourceType === 'variable' && (
          <select
            className="variable-value"
            style={{ ...styles.smallSelect, width: '100%', minWidth: 0, flex: 1 }}
            value={source.name ?? ""}
            onChange={(e) => updateSource({ name: e.target.value })}
          >
            <option value="" disabled>Select Variable</option>
            {variables && variables.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name} ({v.type})
              </option>
            ))}
          </select>
        )}

        {sourceType === 'property' && (
          <>
            <select
              style={{ ...styles.smallSelect, flex: 1, minWidth: '40%' }}
              value={source.targetId ?? ""}
              onChange={(e) => updateSource({ targetId: e.target.value })}
            >
              <option value="">(Self)</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select
              style={{ ...styles.smallSelect, flex: 1, minWidth: '40%' }}
              value={source.property ?? ""}
              onChange={(e) => updateSource({ property: e.target.value })}
            >
              <option value="">속성 선택</option>
              <option value="position">📍 position (Vector2)</option>
              <option value="x">X 좌표</option>
              <option value="y">Y 좌표</option>
              <option value="rotation">🔄 rotation</option>
              <option value="scaleX">↔️ scaleX</option>
              <option value="scaleY">↕️ scaleY</option>
            </select>
          </>
        )}

        {sourceType === 'mouse' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: 10, color: '#aaa' }}>Mode</span>
            <select
              value={source.mode || 'absolute'}
              onChange={(e) => updateSource({ mode: e.target.value })}
              style={{ ...styles.smallSelect, flex: 1 }}
            >
              <option value="absolute">World (Abs)</option>
              <option value="relative">Entity (Rel)</option>
              <option value="screen">Screen UI</option>
            </select>
          </div>
        )}

      </div>
    </div>
  );
}

// --- Available Condition Types for If Action ---
const CONDITION_TYPES = [
  { value: "VarEquals", label: "변수 = 값" },
  { value: "VarNotEquals", label: "변수 ≠ 값" },
  { value: "VarGreaterThan", label: "변수 > 값" },
  { value: "VarLessThan", label: "변수 < 값" },
  { value: "VarGreaterOrEqual", label: "변수 ≥ 값" },
  { value: "VarLessOrEqual", label: "변수 ≤ 값" },
  { value: "IsGrounded", label: "땅에 닿음" },
  { value: "IsAlive", label: "HP > 0" },
  { value: "HpBelow", label: "HP <" },
  { value: "HpAbove", label: "HP >" },
  { value: "InRange", label: "범위 내" },
  { value: "OutOfRange", label: "범위 밖" },
  { value: "InputLeft", label: "← 입력" },
  { value: "InputRight", label: "→ 입력" },
  { value: "InputUp", label: "↑ 입력" },
  { value: "InputDown", label: "↓ 입력" },
  { value: "InputJump", label: "점프 입력" },
  { value: "InputKey", label: "키 입력" },
  { value: "SignalFlag", label: "시그널 플래그" },
  { value: "SignalKeyEquals", label: "신호 키 비교" },
];

function IfActionEditor({
  action,
  variables,
  entities,
  modules,
  scenes,
  assets,
  currentEntity,
  availableActions,
  actionLabels,
  onCreateVariable,
  onUpdateModuleVariable,
  onUpdate,
}: {
  action: { type: string;[key: string]: unknown };
  variables: EditorVariable[];
  entities: { id: string; name: string }[];
  modules: ModuleGraph[];
  scenes?: { id: string; name: string }[];
  assets?: Asset[];
  currentEntity?: EditorEntity;
  availableActions: string[];
  actionLabels?: Record<string, string>;
  onCreateVariable?: (name: string, value: unknown, type?: EditorVariable["type"]) => void;
  onUpdateModuleVariable?: (moduleId: string, name: string, value: unknown, type?: EditorVariable["type"]) => void;
  onUpdate: (a: { type: string;[key: string]: unknown }) => void;
}) {
  const condition = (action.condition as { type: string;[key: string]: unknown }) || { type: "VarEquals" };
  const thenActions = (action.then as Array<{ type: string;[key: string]: unknown }>) || [];
  const elseActions = (action.else as Array<{ type: string;[key: string]: unknown }>) || [];

  const updateCondition = (updates: Record<string, unknown>) => {
    onUpdate({ ...action, condition: { ...condition, ...updates } });
  };

  const updateThenActions = (newActions: Array<{ type: string;[key: string]: unknown }>) => {
    onUpdate({ ...action, then: newActions });
  };

  const updateElseActions = (newActions: Array<{ type: string;[key: string]: unknown }>) => {
    onUpdate({ ...action, else: newActions });
  };

  const conditionNeedsVarName = ["VarEquals", "VarNotEquals", "VarGreaterThan", "VarLessThan", "VarGreaterOrEqual", "VarLessOrEqual"].includes(condition.type);
  const conditionNeedsValue = ["VarEquals", "VarNotEquals", "VarGreaterThan", "VarLessThan", "VarGreaterOrEqual", "VarLessOrEqual", "HpBelow", "HpAbove"].includes(condition.type);
  const conditionNeedsRange = ["InRange", "OutOfRange"].includes(condition.type);
  const conditionNeedsKey = ["InputKey", "SignalFlag"].includes(condition.type);
  const conditionNeedsSignalKey = condition.type === "SignalKeyEquals";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
      {/* Condition - Compact */}
      <div style={{ background: colors.bgTertiary, borderRadius: 4, padding: 6, border: `1px solid ${colors.borderColor}` }}>
        <div style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>📋 조건</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <select
            value={condition.type || "VarEquals"}
            onChange={(e) => updateCondition({ type: e.target.value })}
            style={{ ...styles.selectField, fontSize: 11, padding: "3px 4px" }}
          >
            {CONDITION_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {conditionNeedsVarName && (
            <select
              value={(condition.name as string) || ""}
              onChange={(e) => updateCondition({ name: e.target.value })}
              style={{ ...styles.selectField, fontSize: 11, padding: "3px 4px" }}
            >
              <option value="">변수 선택</option>
              {variables.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          )}

          {conditionNeedsValue && (
            <input
              type="text"
              placeholder="비교값"
              value={(condition.value as string | number) ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                const num = parseFloat(val);
                updateCondition({ value: isNaN(num) ? val : num });
              }}
              style={{ ...styles.textInput, fontSize: 11, padding: "3px 4px" }}
            />
          )}

          {conditionNeedsRange && (
            <div style={{ display: "flex", gap: 3 }}>
              <select
                value={(condition.targetRole as string) || ""}
                onChange={(e) => updateCondition({ targetRole: e.target.value })}
                style={{ ...styles.selectField, fontSize: 11, padding: "3px 4px", flex: 1 }}
              >
                <option value="">역할</option>
                <option value="enemy">enemy</option>
                <option value="player">player</option>
              </select>
              <input
                type="number"
                placeholder="범위"
                value={(condition.range as number) ?? 100}
                onChange={(e) => updateCondition({ range: parseFloat(e.target.value) || 100 })}
                style={{ ...styles.textInput, fontSize: 11, padding: "3px 4px", width: 50 }}
              />
            </div>
          )}

          {conditionNeedsKey && (
            <input
              type="text"
              placeholder="키"
              value={(condition.key as string) || ""}
              onChange={(e) => updateCondition({ key: e.target.value })}
              style={{ ...styles.textInput, fontSize: 11, padding: "3px 4px" }}
            />
          )}

          {conditionNeedsSignalKey && (
            <input
              type="text"
              placeholder="신호 키 (signalKey)"
              value={(condition.signalKey as string) || ""}
              onChange={(e) => updateCondition({ signalKey: e.target.value })}
              style={{ ...styles.textInput, fontSize: 11, padding: "3px 4px" }}
            />
          )}
        </div>
      </div>

      {/* Then Branch - Compact & Scrollable */}
      <div style={{ background: "#1a2e1a", borderRadius: 4, padding: 6, border: "1px solid #2d4a2d" }}>
        <div style={{ fontSize: 10, color: "#8bc34a", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✅ Then</span>
          <button
            onClick={() => updateThenActions([...thenActions, { type: "Wait" }])}
            style={{ ...styles.addButton, padding: "1px 4px", fontSize: 9 }}
          >
            +
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 120, overflowY: "auto" }}>
          {thenActions.map((act, idx) => (
            <ActionEditor
              key={idx}
              action={act}
              availableActions={availableActions}
              actionLabels={actionLabels}
              variables={variables}
              entities={entities}
              modules={modules}
              scenes={scenes}
              assets={assets}
              currentEntity={currentEntity}
              onCreateVariable={onCreateVariable}
              onUpdateModuleVariable={onUpdateModuleVariable}
              onUpdate={(updated) => {
                const newActions = [...thenActions];
                newActions[idx] = updated;
                updateThenActions(newActions);
              }}
              onRemove={() => updateThenActions(thenActions.filter((_, i) => i !== idx))}
              showRemove={true}
            />
          ))}
          {thenActions.length === 0 && (
            <div style={{ fontSize: 9, color: "#6b8066", fontStyle: "italic" }}>없음</div>
          )}
        </div>
      </div>

      {/* Else Branch - Compact & Scrollable */}
      <div style={{ background: "#2e1a1a", borderRadius: 4, padding: 6, border: "1px solid #4a2d2d" }}>
        <div style={{ fontSize: 10, color: "#f44336", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>❌ Else</span>
          <button
            onClick={() => updateElseActions([...elseActions, { type: "Wait" }])}
            style={{ ...styles.addButton, padding: "1px 4px", fontSize: 9 }}
          >
            +
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 120, overflowY: "auto" }}>
          {elseActions.map((act, idx) => (
            <ActionEditor
              key={idx}
              action={act}
              availableActions={availableActions}
              actionLabels={actionLabels}
              variables={variables}
              entities={entities}
              modules={modules}
              scenes={scenes}
              assets={assets}
              currentEntity={currentEntity}
              onCreateVariable={onCreateVariable}
              onUpdateModuleVariable={onUpdateModuleVariable}
              onUpdate={(updated) => {
                const newActions = [...elseActions];
                newActions[idx] = updated;
                updateElseActions(newActions);
              }}
              onRemove={() => updateElseActions(elseActions.filter((_, i) => i !== idx))}
              showRemove={true}
            />
          ))}
          {elseActions.length === 0 && (
            <div style={{ fontSize: 9, color: "#806666", fontStyle: "italic" }}>없음</div>
          )}
        </div>
      </div>
    </div>
  );
}


