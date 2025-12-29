export function AssetPanel() {
    const onDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData(
            "application/editor-entity",
            JSON.stringify({
                type: "Box",
                preview: "/src/assets/placeholder.png",
            })
        );
    };

    return (
        <div className="asset-panel">
            <div className="asset-panel-header">Assets</div>

            <div className="asset-panel-content">
                <div
                    className="asset-item"
                    draggable
                    onDragStart={onDragStart}
                >
                    <img
                        src="/src/assets/placeholder.png"
                        alt="Box"
                        width={48}
                        height={48}
                    />
                </div>
            </div>
        </div>
    );
}
