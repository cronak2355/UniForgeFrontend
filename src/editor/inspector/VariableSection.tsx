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
    if (variable.type === "int" || variable.type === "float") {
      // Allow intermediate states like "1." or "-" for better UX
      if (raw.endsWith('.') || raw === '-' || raw === '-.') return raw;
      const next = Number(raw);
      return Number.isNaN(next) ? 0 : next;
    }
    return raw;
  };

  // Check for duplicate variable names
  const getDuplicateNames = (): Set<string> => {
    const nameCounts = new Map<string, number>();
    for (const v of variables) {
      const name = v.name.toLowerCase();
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
    const duplicates = new Set<string>();
    for (const [name, count] of nameCounts) {
      if (count > 1) duplicates.add(name);
    }
    return duplicates;
  };

  const duplicateNames = getDuplicateNames();

  return (
    <div>
      {/* 헤더 */}
      <div className="variable-header">
        <span className="inspector-section-title">변수 목록 (Variables)</span>
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
        {variables.map(v => {
          const isDuplicate = duplicateNames.has(v.name.toLowerCase());
          return (
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
                <option value="int">정수 (int)</option>
                <option value="float">실수 (float)</option>
                <option value="string">문자열 (string)</option>
                <option value="bool">논리 (bool)</option>
                <option value="vector2">좌표 (vector2)</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  className="variable-input"
                  value={v.name}
                  onChange={e =>
                    onUpdate({ ...v, name: e.target.value.toLowerCase() })
                  }
                  style={isDuplicate ? { borderColor: '#e74c3c', boxShadow: '0 0 0 1px #e74c3c' } : {}}
                />
                {isDuplicate && (
                  <span
                    title="중복된 변수 이름"
                    style={{ color: '#e74c3c', fontSize: '12px', cursor: 'help' }}
                  >
                    ⚠️
                  </span>
                )}
              </div>

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
                  value={typeof v.value === 'object' && v.value !== null
                    ? JSON.stringify(v.value)
                    : String(v.value ?? "")}
                  onChange={e =>
                    onUpdate({ ...v, value: coerceValue(v, e.target.value) })
                  }
                  onBlur={() => {
                    if (v.type === "int" || v.type === "float") {
                      const num = Number(v.value);
                      onUpdate({ ...v, value: Number.isNaN(num) ? 0 : num });
                    }
                  }}
                />
              )}
              <button
                className="variable-remove"
                onClick={() => onRemove(v.id)}
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
