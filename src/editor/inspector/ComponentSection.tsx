import { memo } from "react";
import {
  TransformComponent,
  RenderComponent,
  VariablesComponent,
  EditorComponent,
  ComponentType,
  ComponentDefaults,
} from "../types/Component";
import type { EditorEntity } from "../types/Entity";

/* ===================== UI COLORS ===================== */

const colors = {
  bgPrimary: "#0d1117",
  bgSecondary: "#161b22",
  bgTertiary: "#21262d",
  borderColor: "#30363d",
  accentLight: "#58a6ff",
  textPrimary: "#f0f6fc",
  textSecondary: "#8b949e",
  textMuted: "#6e7681",
  danger: "#da3633",
};

const labelStyle = {
  fontSize: "10px",
  color: colors.textSecondary,
  alignSelf: "center",
};

const inputStyle = {
  padding: "2px 4px",
  fontSize: "10px",
  background: colors.bgSecondary,
  border: `1px solid ${colors.borderColor}`,
  borderRadius: "2px",
  color: colors.textPrimary,
};

/* ===================== PROPS ===================== */

interface Props {
  entity: EditorEntity;
  onUpdateEntity: (next: EditorEntity) => void;
}

/* ===================== COMPONENT ===================== */

export const ComponentSection = memo(function ComponentSection({
  entity,
  onUpdateEntity,
}: Props) {
  /** 🔑 절대 undefined 안 되게 */
  const components = entity.components ?? [];

  /* ---------- helpers ---------- */

  function updateComponents(next: EditorComponent[]) {
    onUpdateEntity({
      ...entity,
      components: next,
    });
  }

  function handleAdd(type: ComponentType) {
    const base = ComponentDefaults[type];

    const next: EditorComponent = {
      id: crypto.randomUUID(),
      ...base,
    };

    updateComponents([...components, next]);
  }

  function update(next: EditorComponent) {
    updateComponents(
      components.map((c) => (c.id === next.id ? next : c))
    );
  }

  function onRemove(id: string) {
    updateComponents(components.filter((c) => c.id !== id));
  }

  /* ---------- type guards ---------- */

  function isTransform(c: EditorComponent): c is TransformComponent {
    return c.type === "Transform";
  }

  function isRender(c: EditorComponent): c is RenderComponent {
    return c.type === "Render";
  }

  function isVariables(c: EditorComponent): c is VariablesComponent {
    return c.type === "Variables";
  }

  /* ===================== RENDER ===================== */

  return (
    <div style={{ padding: "12px 0", borderTop: `1px solid ${colors.borderColor}` }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: colors.accentLight,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Components
        </span>

        <div style={{ display: "flex", gap: "4px" }}>
          {(["Transform", "Render", "Variables"] as ComponentType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => handleAdd(type)}
                style={{
                  padding: "4px 8px",
                  fontSize: "10px",
                  background: colors.bgTertiary,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: "4px",
                  color: colors.textPrimary,
                  cursor: "pointer",
                }}
              >
                + {type}
              </button>
            )
          )}
        </div>
      </div>

      {components.length === 0 && (
        <div
          style={{
            fontSize: "11px",
            color: colors.textMuted,
            fontStyle: "italic",
          }}
        >
          No components attached
        </div>
      )}

      {components.map((comp) => (
        <div
          key={comp.id}
          style={{
            padding: "8px",
            marginBottom: "6px",
            background: colors.bgTertiary,
            border: `1px solid ${colors.borderColor}`,
            borderRadius: "4px",
          }}
        >
          {/* Component Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              {comp.type}
            </span>

            <button
              onClick={() => onRemove(comp.id)}
              style={{
                padding: "2px 6px",
                fontSize: "10px",
                background: colors.danger,
                border: "none",
                borderRadius: "2px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <label style={labelStyle}>Trigger</label>
            <select
              value={comp.trigger?.type ?? "OnUpdate"}
              onChange={(e) =>
                update({
                  ...comp,
                  trigger: { type: e.target.value as any },
                })
              }
              style={inputStyle}
            >
              <option value="OnStart">On Start</option>
              <option value="OnUpdate">On Update</option>
              <option value="OnKeyDown">On Key Down</option>
            </select>

            <label style={labelStyle}>Condition</label>
            <select
              value={comp.condition?.type ?? "Always"}
              onChange={(e) =>
                update({
                  ...comp,
                  condition: { type: e.target.value as any },
                })
              }
              style={inputStyle}
            >
              <option value="Always">Always</option>
              <option value="Equals">Equals</option>
              <option value="GreaterThan">Greater Than</option>
            </select>
          </div>

          {/* ================= Transform ================= */}
          {isTransform(comp) && (
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: "6px" }}>
              <label style={labelStyle}>X</label>
              <input
                type="number"
                value={comp.x}
                onChange={(e) => update({ ...comp, x: +e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>Y</label>
              <input
                type="number"
                value={comp.y}
                onChange={(e) => update({ ...comp, y: +e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>Rotation</label>
              <input
                type="number"
                value={comp.rotation}
                onChange={(e) =>
                  update({ ...comp, rotation: +e.target.value })
                }
                style={inputStyle}
              />

              <label style={labelStyle}>Scale X</label>
              <input
                type="number"
                step="0.1"
                value={comp.scaleX}
                onChange={(e) =>
                  update({ ...comp, scaleX: +e.target.value })
                }
                style={inputStyle}
              />

              <label style={labelStyle}>Scale Y</label>
              <input
                type="number"
                step="0.1"
                value={comp.scaleY}
                onChange={(e) =>
                  update({ ...comp, scaleY: +e.target.value })
                }
                style={inputStyle}
              />
            </div>
          )}

          {/* ================= Render ================= */}
          {isRender(comp) && (
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: "6px" }}>
              <label style={labelStyle}>Sprite</label>
              <input
                type="text"
                value={comp.spriteId}
                onChange={(e) =>
                  update({ ...comp, spriteId: e.target.value })
                }
                style={inputStyle}
              />
            </div>
          )}

          {/* ================= Variables ================= */}
          {isVariables(comp) && (
            <div style={{ fontSize: "10px", color: colors.textMuted }}>
              Variables editor coming soon
            </div>
          )}
        </div>
      ))}
    </div>
  );
});
