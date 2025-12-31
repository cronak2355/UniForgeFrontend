import { VariableSection } from "./VariableSection";
import type { EditorEntity } from "../types/Entity";
import { EventSection } from "./EventSection";
import type { EditorEvent } from "../types/Event";
import { InspectorScroll } from "./InspectorScroll";
import { colors } from "../constants/colors";

type Props = {
  entity: EditorEntity | null;
  onUpdateEntity: (entity: EditorEntity) => void;
};

export function InspectorPanel({ entity, onUpdateEntity }: Props) {
  if (!entity) {
    return (
      <div style={{
        padding: '24px 16px',
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: '13px',
      }}>
        오브젝트를 선택해주세요
      </div>
    );
  }

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

  const handleUpdateEvent = (updatedEvent: EditorEvent) => {
    onUpdateEntity({
      ...entity,
      events: entity.events.map((e) =>
        e.id === updatedEvent.id ? updatedEvent : e
      ),
    });
  };

  return (
    <div style={{ padding: '12px' }}>
      {/* Basic Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: colors.accentLight,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px',
          paddingBottom: '6px',
          borderBottom: `1px solid ${colors.borderColor}`,
        }}>
          Basic
        </div>

        {/* Name Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 0',
          gap: '8px',
        }}>
          <span style={{
            flex: '0 0 70px',
            fontSize: '12px',
            color: colors.textSecondary,
          }}>
            Name
          </span>
          <span style={{
            fontSize: '13px',
            color: colors.textPrimary,
          }}>
            {entity.name}
          </span>
        </div>

        {/* Position Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 0',
          gap: '8px',
        }}>
          <span style={{
            flex: '0 0 70px',
            fontSize: '12px',
            color: colors.textSecondary,
          }}>
            Position
          </span>
          <span style={{
            fontSize: '13px',
            color: colors.textPrimary,
          }}>
            X: {entity.x} &nbsp; Y: {entity.y}
          </span>
        </div>
      </div>

      {/* Variables & Events */}
      <InspectorScroll>
        <div style={{ marginBottom: '16px' }}>
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
                variables: entity.variables.map((v) =>
                  v.id === updatedVar.id ? updatedVar : v
                ),
              });
            }}
          />
        </div>

        <div style={{ opacity: 0.6 }}>
          <EventSection
            events={entity.events}
            onAdd={handleAddEvent}
            onUpdate={handleUpdateEvent}
          />
        </div>
      </InspectorScroll>
    </div>
  );
}
