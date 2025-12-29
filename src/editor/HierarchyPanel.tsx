import type { EditorEntity } from "./EditorState";

type Props = {
    entities: EditorEntity[];
    selectedId: string | null;
    onSelect: (id: string) => void;
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
                    onClick={() => onSelect(e.id)}
                >
                    {e.name}
                </div>
            ))}
        </div>
    );
}
