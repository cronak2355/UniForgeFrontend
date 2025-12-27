import type { EditorEntity } from "./EditorLayout";


export function HierarchyPanel({
    entities,
    selectedId,
    onSelect
}: {
    entities: EditorEntity[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="w-60 border-r border-white p-2">
            <div className="mb-2">Hierarchy</div>
            {entities.map(e => (
                <div
                    key={e.id}
                    className={`cursor-pointer ${selectedId === e.id ? "bg-white text-black" : ""}`}
                    onClick={() => onSelect(e.id)}
                >
                    {e.name}
                </div>
            ))}
        </div>
    );
}