import { useState } from "react";
import type { CSSProperties } from "react";
import type { EditorEntity } from "../types/Entity";
import { createDefaultModuleGraph } from "../types/Module";
import { ModuleGraphEditor } from "../modules/ModuleGraphEditor";
import { colors } from "../constants/colors";
import { useEditorCoreSnapshot } from "../../contexts/EditorCoreContext";

type Props = {
  entity: EditorEntity;
  onUpdateEntity: (entity: EditorEntity) => void;
};

export function ModuleSection({ entity, onUpdateEntity }: Props) {
  const { modules: libraryModules } = useEditorCoreSnapshot();
  const modules = entity.modules ?? [];
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const activeModule = modules.find((m) => m.id === activeModuleId) ?? null;

  const updateModules = (nextModules: typeof modules) => {
    onUpdateEntity({ ...entity, modules: nextModules });
  };

  const handleAddModule = () => {
    const next = createDefaultModuleGraph();
    next.name = `Module ${modules.length + 1}`;
    updateModules([...modules, next]);
    setActiveModuleId(next.id);
  };

  const handleRename = (id: string, name: string) => {
    updateModules(modules.map((m) => (m.id === id ? { ...m, name } : m)));
  };

  const handleUpdateModule = (updated: typeof activeModule) => {
    if (!updated) return;
    updateModules(modules.map((m) => (m.id === updated.id ? updated : m)));
  };

  const ensureVariable = (name: string, value: unknown, explicitType?: "int" | "float" | "string" | "bool") => {
    if (!name) return;
    if ((entity.variables ?? []).some((v) => v.name === name)) return;
    let type: "int" | "float" | "string" | "bool" = "string";
    let nextValue: number | string | boolean = "";
    if (explicitType) {
      type = explicitType;
    }
    if (typeof value === "boolean") {
      type = "bool";
      nextValue = value;
    } else if (typeof value === "number" && !Number.isNaN(value)) {
      type = Number.isInteger(value) ? "int" : "float";
      nextValue = value;
    } else if (value === undefined || value === null) {
      type = "int";
      nextValue = 0;
    } else {
      nextValue = String(value);
    }
    onUpdateEntity({
      ...entity,
      variables: [
        ...(entity.variables ?? []),
        { id: crypto.randomUUID(), name, type, value: nextValue },
      ],
    });
  };

  const updateVariable = (name: string, value: unknown, explicitType?: "int" | "float" | "string" | "bool") => {
    if (!name) return;
    const variables = entity.variables ?? [];
    const target = variables.find((v) => v.name === name);
    if (!target) return;
    let type: "int" | "float" | "string" | "bool" = explicitType ?? target.type ?? "string";
    let nextValue: number | string | boolean = target.value ?? "";
    if (typeof value === "boolean") {
      type = "bool";
      nextValue = value;
    } else if (typeof value === "number" && !Number.isNaN(value)) {
      type = Number.isInteger(value) ? "int" : "float";
      nextValue = value;
    } else if (value === undefined || value === null) {
      type = "int";
      nextValue = 0;
    } else {
      nextValue = String(value);
    }
    const nextVariables = variables.map((v) =>
      v.id === target.id ? { ...v, type, value: nextValue } : v
    );
    onUpdateEntity({ ...entity, variables: nextVariables });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: colors.textSecondary }}>Modules ({modules.length})</div>
        <button style={addButton} onClick={handleAddModule}>
          + Add
        </button>
      </div>
      {modules.length === 0 && (
        <div style={{ color: colors.textMuted, fontSize: 11 }}>No modules yet.</div>
      )}
      {modules.map((mod) => (
        <div key={mod.id} style={moduleRow}>
          <input
            value={mod.name}
            onChange={(e) => handleRename(mod.id, e.target.value)}
            style={nameInput}
          />
          <button style={editButton} onClick={() => setActiveModuleId(mod.id)}>
            Edit
          </button>
        </div>
      ))}

      {activeModule && (
        <div style={modalBackdrop} onClick={() => setActiveModuleId(null)}>
          <div style={modalPanel} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{activeModule.name}</div>
              <button style={closeButton} onClick={() => setActiveModuleId(null)}>
                Close
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
      <ModuleGraphEditor
        module={activeModule}
        variables={entity.variables}
        modules={libraryModules}
        actionLabels={buildModuleActionLabels(libraryModules)}
        onCreateVariable={ensureVariable}
        onUpdateVariable={updateVariable}
        onChange={(next) => handleUpdateModule(next)}
      />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildModuleActionLabels(modules: { id: string; name: string }[]) {
  const labels: Record<string, string> = {};
  modules.forEach((module) => {
    labels[`Module:${module.id}`] = `Module: ${module.name}`;
  });
  return labels;
}

const moduleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};

const nameInput: CSSProperties = {
  flex: 1,
  background: colors.bgPrimary,
  border: `1px solid ${colors.borderColor}`,
  borderRadius: 4,
  color: colors.textPrimary,
  padding: "4px 6px",
  fontSize: 11,
};

const addButton: CSSProperties = {
  background: colors.bgTertiary,
  border: `1px solid ${colors.borderColor}`,
  color: colors.textPrimary,
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const editButton: CSSProperties = {
  background: colors.accentDark,
  border: `1px solid ${colors.borderColor}`,
  color: colors.textPrimary,
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3000,
  padding: 24,
};

const modalPanel: CSSProperties = {
  width: "90vw",
  height: "80vh",
  background: colors.bgSecondary,
  border: `1px solid ${colors.borderColor}`,
  borderRadius: 10,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const modalHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderBottom: `1px solid ${colors.borderColor}`,
  background: colors.bgTertiary,
};

const closeButton: CSSProperties = {
  background: "transparent",
  border: "none",
  color: colors.textSecondary,
  cursor: "pointer",
  fontSize: 12,
};
