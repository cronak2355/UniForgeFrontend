import type { EditorEntity } from "./types/Entity";

type Props = {
    entities: EditorEntity[];
    selectedId: string | null;
    onSelect: (entity: EditorEntity) => void;
};

export function HierarchyPanel({
    entities,
    selectedId,
    onSelect,
}: Props) {
    return (
        <div className="hierarchy-list">
            {entities.map((e) => (
                <div
                    key={e.id}
                    className={
                        "hierarchy-item" +
                        (e.id === selectedId ? " selected" : "")
                    }
                    onClick={() => onSelect(e)}
                >
                    {e.name}
                </div>
            ))}
        </div>
    );
}
