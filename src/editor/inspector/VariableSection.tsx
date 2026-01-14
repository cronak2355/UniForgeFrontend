import type { EditorVariable } from "../types/Variable";

export function VariableSection({
  variables,
  onAdd,
  onUpdate,
  entityId,
  onRemove,
}: {
  variables: EditorVariable[];
  onAdd: () => void;
  onUpdate: (v: EditorVariable) => void;
  entityId?: string; // For drag-drop: identifies which entity owns these variables
  onRemove: (id: string) => void;
}) {
  const coerceType = (variable: EditorVariable, nextType: EditorVariable["type"]) => {
    if (nextType === variable.type) return variable;
    if (nextType === "bool") {
      return { ...variable, type: nextType, value: false };
    }
    if (nextType === "vector2") {
      return { ...variable, type: nextType, value: { x: 0, y: 0 } };
    }
    if (nextType === "string") {
      return { ...variable, type: nextType, value: String(variable.value ?? "") };
    }
    // Handle conversion from vector2 to primitive?
    if (typeof variable.value === 'object' && variable.value !== null) {
      // Reset to 0 if coming from vector2
      return { ...variable, type: nextType, value: 0 };
    }

    const numeric =
      typeof variable.value === "number"
        ? variable.value
        : Number(String(variable.value ?? ""));
    const fallback = Number.isNaN(numeric) ? 0 : numeric;
    return { ...variable, type: nextType, value: fallback };
  };

  const coerceValue = (variable: EditorVariable, raw: string): number | string => {
    if (variable.type === "int") {
      const next = parseInt(raw, 10);
      return Number.isNaN(next) ? 0 : next;
    }
    if (variable.type === "float") {
      const next = Number(raw);
      return Number.isNaN(next) ? 0 : next;
    }
    return raw;
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="variable-header">
        <span className="inspector-section-title">Variables</span>
        <button
          onClick={onAdd}
          className="variable-add"
        >
          +
        </button>
      </div>

      {/* 비어있을 때 */}

      {variables.length === 0 && (
        <div className="text-xs opacity-50">
          등록된 변수가 없습니다.
        </div>
      )}

      {/* 변수 리스트 */}
      <div className="space-y-1">
        {variables.map(v => (
          <div
            key={v.id}
            className="variable-item"
            draggable={!!entityId}
            onDragStart={(e) => {
              if (entityId) {
                e.dataTransfer.setData("text/plain", `${entityId}|${v.name}`);
                e.dataTransfer.effectAllowed = "link";
              }
            }}
            style={{ cursor: entityId ? 'grab' : 'default' }}
          >
            <select
              className="variable-type"
              value={v.type}
              onChange={(e) => onUpdate(coerceType(v, e.target.value as EditorVariable["type"]))}
            >
              <option value="int">int</option>
              <option value="float">float</option>
              <option value="string">string</option>
              <option value="bool">bool</option>
              <option value="vector2">vector2</option>
            </select>

            <input
              className="variable-input"
              value={v.name}
              onChange={e =>
                onUpdate({ ...v, name: e.target.value })
              }
            />

            {v.type === "bool" ? (
              <select
                className="variable-value"
                value={v.value === true ? "true" : "false"}
                onChange={e => onUpdate({ ...v, value: e.target.value === "true" })}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : v.type === "vector2" ? (
              <div className="flex gap-1 items-center">
                <span className="text-xs text-gray-500">X</span>
                <input
                  className="variable-value w-8"
                  value={typeof v.value === 'object' && v.value !== null ? (v.value as { x: number, y: number }).x : 0}
                  onChange={e => {
                    const val = Number(e.target.value);
                    const current = typeof v.value === 'object' && v.value !== null ? v.value as { x: number, y: number } : { x: 0, y: 0 };
                    onUpdate({ ...v, value: { ...current, x: Number.isNaN(val) ? 0 : val } });
                  }}
                />
                <span className="text-xs text-gray-500">Y</span>
                <input
                  className="variable-value w-8"
                  value={typeof v.value === 'object' && v.value !== null ? (v.value as { x: number, y: number }).y : 0}
                  onChange={e => {
                    const val = Number(e.target.value);
                    const current = typeof v.value === 'object' && v.value !== null ? v.value as { x: number, y: number } : { x: 0, y: 0 };
                    onUpdate({ ...v, value: { ...current, y: Number.isNaN(val) ? 0 : val } });
                  }}
                />
              </div>
            ) : (
              <input
                className="variable-value"
                value={String(v.value)}
                onChange={e =>
                  onUpdate({ ...v, value: coerceValue(v, e.target.value) })
                }
              />
            )}
            <button
              className="variable-remove"
              onClick={() => onRemove(v.id)}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
