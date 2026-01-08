import type { EditorVariable } from "../types/Variable";

export function VariableSection({
  variables,
  onAdd,
  onUpdate,
}: {
  variables: EditorVariable[];
  onAdd: () => void;
  onUpdate: (v: EditorVariable) => void;
}) {
  const coerceType = (variable: EditorVariable, nextType: EditorVariable["type"]) => {
    if (nextType === variable.type) return variable;
    if (nextType === "bool") {
      return { ...variable, type: nextType, value: false };
    }
    if (nextType === "string") {
      return { ...variable, type: nextType, value: String(variable.value ?? "") };
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
                className="bg-black border border-white px-1 text-xs"
                value={v.value === true ? "true" : "false"}
                onChange={e => onUpdate({ ...v, value: e.target.value === "true" })}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                className="bg-black border border-white px-1 text-xs"
                value={String(v.value)}
                onChange={e =>
                  onUpdate({ ...v, value: coerceValue(v, e.target.value) })
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
