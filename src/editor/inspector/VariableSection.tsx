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
            <span className="variable-type">{v.type}</span>

            <input
              className="variable-input"
              value={v.name}
              onChange={e =>
                onUpdate({ ...v, name: e.target.value })
              }
            />

            <input
              className="bg-black border border-white px-1 text-xs"
              value={String(v.value)}
              onChange={e =>
                onUpdate({ ...v, value: e.target.value })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
