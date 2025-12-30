import type { EditorEvent, TriggerType, ActionType } from "../types/Event";

const TRIGGERS: TriggerType[] = [
  "OnStart",
  "OnInteract",
  "OnEnterArea",
  "OnVariableEqual",
];

const ACTIONS: ActionType[] = [
  "ShowText",
  "SetVariable",
  "ChangeMap",
  "MoveEntity",
  "SpawnEntity",
  "PlaySound",
];

/*
 * EventSection
 * Entity가 가지는 이벤트 목록을 편집하는 UI
 * - Trigger 선택
 * - Action 선택
 */

export function EventSection({
  events,
  onAdd,
  onUpdate,
}: {
  events: EditorEvent[];
  onAdd: () => void;
  onUpdate: (e: EditorEvent) => void;
}) {
  return (
    <div className="event-root">
      <div className="event-header">
        <span>Events</span>
        <button className="event-add" onClick={onAdd}>+</button>
      </div>

      {events.map(e => (
        <div key={e.id} className="event-item">
          <div className="event-row">
            <span className="event-label">Trigger</span>
            <select
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

          <div className="event-row">
            <span className="event-label">Action</span>
            <select
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
        </div>
      ))}

      <button className="event-open">open event editor</button>
    </div>
  )
}