import type { EditorEntity } from "./EditorLayout";


export function InspectorPanel({ entity }: { entity: EditorEntity | null }) {
    return (
        <div className="w-72 border-l border-white p-2">
            <div className="mb-2">Inspector</div>
            {entity ? (
                <div>
                    <div>ID: {entity.id}</div>
                    <div>Name: {entity.name}</div>
                    <div>X: {entity.x}</div>
                    <div>Y: {entity.y}</div>
                </div>
            ) : (
                <div>No selection</div>
            )}
        </div>
    );
}