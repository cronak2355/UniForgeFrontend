import { VariableSection } from "./VariableSection";
import type { EditorEntity } from "../types/Entity";
import { EventSection } from "./EventSection";
import type { EditorEvent } from "../types/Event";
import { InspectorScroll } from "./InspectorScroll";
import { colors } from "../constants/colors";
import { ComponentSection } from "./ComponentSection";
import { ModuleSection } from "./ModuleSection";
import type { EditorModule } from "../types/Module";


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
        <div style={{ marginBottom: "16px" }}>
          <ComponentSection
            components={entity.components || []}
            onAdd={(comp) => {
              onUpdateEntity({
                ...entity,
                components: [...(entity.components || []), comp],
              });
            }}
            onUpdate={(updatedComp) => {
              onUpdateEntity({
                ...entity,
                components: (entity.components || []).map((c) =>
                  c.id === updatedComp.id ? updatedComp : c
                ),
              });
            }}
            onRemove={(id) => {
              onUpdateEntity({
                ...entity,
                components: (entity.components || []).filter((c) => c.id !== id),
              });
            }}
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <ModuleSection
            modules={entity.modules || []}
            onAdd={(mod) => {
              onUpdateEntity({
                ...entity,
                modules: [...(entity.modules || []), mod],
              });
            }}
            onUpdate={(updatedMod) => {
              onUpdateEntity({
                ...entity,
                modules: (entity.modules || []).map((m) =>
                  m.id === updatedMod.id ? updatedMod : m
                ),
              });
            }}
            onRemove={(id) => {
              onUpdateEntity({
                ...entity,
                modules: (entity.modules || []).filter((m) => m.id !== id),
              });
            }}
          />
        </div>
      </InspectorScroll>
    </div>
  );
}
