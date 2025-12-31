import type { EditorEntity } from "./types/Entity";
import { colors } from "./constants/colors";

type Props = {
    entities: EditorEntity[];
    selectedId: string | null;
    onSelect: (entity: EditorEntity) => void;
};

export function HierarchyPanel({ entities, selectedId, onSelect }: Props) {
    if (entities.length === 0) {
        return (
            <div style={{
                color: colors.textSecondary,
                fontSize: '12px',
                textAlign: 'center',
                padding: '20px',
            }}>
                오브젝트를 추가해보세요
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {entities.map((e) => (
                <div
                    key={e.id}
                    onClick={() => onSelect(e)}
                    style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        background: e.id === selectedId ? colors.bgTertiary : 'transparent',
                        border: `1px solid ${e.id === selectedId ? colors.borderAccent : 'transparent'}`,
                        borderRadius: '4px',
                        color: e.id === selectedId ? colors.accentLight : colors.textPrimary,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={(ev) => {
                        if (e.id !== selectedId) {
                            ev.currentTarget.style.background = colors.bgTertiary;
                        }
                    }}
                    onMouseLeave={(ev) => {
                        if (e.id !== selectedId) {
                            ev.currentTarget.style.background = 'transparent';
                        }
                    }}
                >
                    {e.name}
                </div>
            ))}
        </div>
    );
}
