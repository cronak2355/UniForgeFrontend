import type { Asset } from "./types/Asset";
import { getCloudFrontUrl } from "../utils/imageUtils";
import { colors } from "./constants/colors";
import { useRef } from "react";

type Props = {
    assets: Asset[];
    changeDraggedAsset: (asset: Asset | null, options?: { defer?: boolean }) => void;
    onSelectAsset: (asset: Asset) => void;
};

export function RecentAssetsPanel({ assets, changeDraggedAsset, onSelectAsset }: Props) {
    const dragStateRef = useRef<{ asset: Asset; startX: number; startY: number; hasDragged: boolean } | null>(null);

    const clearDragListeners = () => {
        window.removeEventListener("pointermove", onGlobalPointerMove);
        window.removeEventListener("pointerup", onGlobalPointerUp);
        dragStateRef.current = null;
    };

    const onGlobalPointerMove = (e: PointerEvent) => {
        const state = dragStateRef.current;
        if (!state || state.hasDragged) return;
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        if (Math.hypot(dx, dy) < 5) return;
        state.hasDragged = true;
        changeDraggedAsset(state.asset);
    };

    const onGlobalPointerUp = () => {
        const state = dragStateRef.current;
        if (state?.hasDragged) {
            changeDraggedAsset(null, { defer: true });
        }
        clearDragListeners();
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: colors.bgSecondary,
            borderTop: `1px solid ${colors.borderColor}`,
            overflow: "hidden"
        }}>
            <div style={{
                padding: "10px 12px",
                fontSize: "11px",
                fontWeight: 600,
                color: colors.textSecondary,
                background: colors.bgTertiary,
                borderBottom: `1px solid ${colors.borderColor}`,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
            }}>
                <i className="fa-solid fa-clock-rotate-left"></i>
                Recent Assets
            </div>

            <div className="custom-scrollbar" style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
                gap: "8px",
                alignContent: "start"
            }}>
                {assets.length === 0 ? (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: colors.textSecondary, fontSize: "12px" }}>
                        <i className="fa-regular fa-square-full" style={{ opacity: 0.3, fontSize: "20px", marginBottom: "8px", display: "block" }}></i>
                        No recent items
                    </div>
                ) : (
                    assets.map((asset) => (
                        <div
                            key={asset.id}
                            title={asset.name}
                            style={{
                                position: 'relative',
                                aspectRatio: '1/1',
                                background: colors.itemBg || '#222',
                                border: `1px solid ${colors.borderColor}`,
                                borderRadius: '8px',
                                cursor: 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dragStateRef.current = { asset, startX: e.clientX, startY: e.clientY, hasDragged: false };
                                window.addEventListener("pointermove", onGlobalPointerMove);
                                window.addEventListener("pointerup", onGlobalPointerUp);
                            }}
                            onClick={() => onSelectAsset(asset)}
                        >
                            <img
                                src={getCloudFrontUrl(asset.url)}
                                alt={asset.name}
                                style={{
                                    maxWidth: '80%',
                                    maxHeight: '80%',
                                    objectFit: 'contain',
                                    pointerEvents: 'none'
                                }}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
