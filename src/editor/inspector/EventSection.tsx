import type { EditorEvent, TriggerType, ActionType } from "../types/Event";

const TRIGGERS: TriggerType[] = [
  "OnClick",
  "OnStart",
  "OnInteract",
  "OnEnterArea",
  "OnVariableEqual",
];

const ACTIONS: ActionType[] = [
  "Log",
  "OpenUrl",
  "ShowText",
  "SetVariable",
  "ChangeMap",
  "MoveEntity",
  "SpawnEntity",
  "PlaySound",
  "PlayAnimation",
];

export function EventSection({
  events,
  onAdd,
  onUpdate,
  onRemove
}: {
  events: EditorEvent[];
  onAdd: () => void;
  onUpdate: (e: EditorEvent) => void;
  onRemove: (id: string) => void;
}) {
  const inputStyle = {
    background: '#1e1e1e',
    border: '1px solid #3e3e3e',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box' as const
  };

  const labelStyle = {
    color: '#aaa',
    fontSize: '12px',
    width: '60px',
    display: 'inline-block'
  };

  const rowStyle = {
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center'
  };

  const itemStyle = {
    background: '#252525',
    padding: '8px',
    borderRadius: '6px',
    marginBottom: '8px',
    border: '1px solid #3e3e3e',
    position: 'relative' as const
  };

  const removeBtnStyle = {
    position: 'absolute' as const,
    top: '4px',
    right: '4px',
    background: 'transparent',
    border: 'none',
    color: '#ff5555',
    cursor: 'pointer',
    fontSize: '14px'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#ddd', fontSize: '14px', fontWeight: 600 }}>Events</span>
        <button
          onClick={onAdd}
          style={{
            background: '#3498db',
            border: 'none',
            color: 'white',
            borderRadius: '4px',
            width: '24px',
            height: '24px',
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {events.map(e => (
          <div key={e.id} style={itemStyle}>
            <button style={removeBtnStyle} onClick={() => onRemove(e.id)}>×</button>
            <div style={rowStyle}>
              <span style={labelStyle}>Trigger</span>
              <select
                style={inputStyle}
                value={e.trigger}
                onChange={ev =>
                  onUpdate({ ...e, trigger: ev.target.value as TriggerType })
                }
              >
                {TRIGGERS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div style={rowStyle}>
              <span style={labelStyle}>Action</span>
              <select
                style={inputStyle}
                value={e.action}
                onChange={ev =>
                  onUpdate({ ...e, action: ev.target.value as ActionType })
                }
              >
                {ACTIONS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div style={rowStyle}>
              <span style={labelStyle}>Payload</span>
              <input
                style={inputStyle}
                placeholder="Message, URL, etc."
                value={e.payload || ""}
                onChange={ev => onUpdate({ ...e, payload: ev.target.value })}
              />
            </div>
          </div>
        ))}
        {events.length === 0 && <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>No events defined.</div>}
      </div>
    </div>
  )
}