import { useId } from "react";
import type { EditorVariable } from "../types/Variable";
import * as styles from "./ComponentSection.styles";

export function ActionEditor({
  action,
  availableActions,
  actionLabels,
  variables,
  entities,
  modules,
  onCreateVariable,
  onUpdate,
  onRemove,
  showRemove = true,
}: {
  action: { type: string; [key: string]: unknown };
  availableActions: string[];
  actionLabels?: Record<string, string>;
  variables: EditorVariable[];
  entities: { id: string; name: string }[];
  modules: { id: string; name: string }[];
  onCreateVariable?: (name: string, value: unknown, type?: EditorVariable["type"]) => void;
  onUpdate: (a: { type: string; [key: string]: unknown }) => void;
  onRemove: () => void;
  showRemove?: boolean;
}) {
  const listId = useId();
  const selectedVar = variables.find((v) => v.name === (action.name as string));
  const selectedModuleId =
    (action.moduleId as string) ??
    (action.moduleName as string) ??
    (action.name as string) ??
    "";

  return (
    <div style={styles.actionRow}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
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

      {action.type === "RunModule" && (
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
      )}

      {showRemove && (
        <button onClick={onRemove} style={styles.removeButton}>×</button>
      )}
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
