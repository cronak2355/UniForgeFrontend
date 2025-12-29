import { VariableSection } from "./VariableSection";
import type { EditorEntity } from "../types/Entity";
import type { EditorVariable } from "../types/Variable";
import { EventSection } from "./EventSection";
import type { EditorEvent } from "../types/Event";

/**
 * InspectorPanel
 * 선택된 Entity의 정보를 수정할 수 있는 패널
 * - Basic 정보 (이름, 위치)
 * - Variables 편집
 * - Events 편집
 */
type Props = {
  selectedId: string | null;
  entities: EditorEntity[];
};

export function InspectorPanel({
  selectedId,
  entities,
}: Props) {
  
export function InspectorPanel({
  entity,
  onUpdateEntity,
}: {
  entity: EditorEntity | null;
  onUpdateEntity: (entity: EditorEntity) => void;
}) {
  if (!entity) {
    return (
      <div className="inspector-root opacity-50">
        Inspector<br />
        아무 오브젝트도 선택되지 않았습니다.
      </div>
    );
  }

  /**
   * 새로운 이벤트를 Entity에 추가
   */
  const handleAddEvent = () => {
    onUpdateEntity({
      ...entity,
      events: [
        ...entity.events,
        {
          id: crypto.randomUUID(),
          trigger: "OnStart",
          action: "ShowText",
        },
      ],
    });
  };

  /**
 * 기존 이벤트 수정
 */
  const handleUpdateEvent = (updatedEvent: EditorEvent) => {
    onUpdateEntity({
      ...entity,
      events: entity.events.map(e =>
        e.id === updatedEvent.id ? updatedEvent : e
      ),
    });
  };

  return (
    <div className="inspector-root">
      <div className="font-bold text-base"></div>

      {/* BASIC */}
      <section className="inspector-section">
        <div className="inspector-section-title">Basic</div>

        <div className="inspector-row">
          <span className="inspector-label">Name</span>
          <span>{entity.name}</span>
        </div>

        <div className="inspector-row">
          <span className="inspector-label">Position</span>
          <span>X:{entity.x} Y:{entity.y}</span>
        </div>
      </section>

      {/* VARIABLES */}
      <div className="inspector-scroll">
        <section className="inspector-section">
          <VariableSection
            variables={entity.variables}
            onAdd={() => {
              onUpdateEntity({
                ...entity,
                variables: [
                  ...entity.variables,
                  {
                    id: crypto.randomUUID(),
                    name: "newVar",
                    type: "int",
                    value: 0,
                  },
                ],
              });
            }}
            onUpdate={(updatedVar) => {
              onUpdateEntity({
                ...entity,
                variables: entity.variables.map(v =>
                  v.id === updatedVar.id ? updatedVar : v
                ),
              });
            }}
          />
        </section>

        {/* EVENTS */}
        <section className="inspector-section opacity-50">
          <div className="inspector-section-title"></div>
          <EventSection
            events={entity.events}
            onAdd={handleAddEvent}
            onUpdate={handleUpdateEvent}
          />
        </section>
      </div>
    </div>
  );
}

