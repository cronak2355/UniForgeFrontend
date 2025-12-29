import type { EditorEntity } from "./EditorState";

type Props = {
    selectedId: string | null;
    entities: EditorEntity[];
};

export function InspectorPanel({
    selectedId,
    entities,
}: Props) {
    if (!selectedId) {
        return <div className="inspector-empty">No selection</div>;
    }

    const entity = entities.find((e) => e.id === selectedId);

    if (!entity) {
        return <div className="inspector-empty">Invalid selection</div>;
    }

    return (
        <div className="inspector-content">
            <div>
                <strong>ID</strong>
                <div>{entity.id}</div>
            </div>

            <div>
                <strong>Type</strong>
                <div>{entity.type}</div>
            </div>

            <div>
                <strong>Position</strong>
                <div>
                    x: {Math.round(entity.x)}, y: {Math.round(entity.y)}
                </div>
            </div>
        </div>
    );
}
