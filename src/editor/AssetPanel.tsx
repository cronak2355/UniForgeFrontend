import { useState } from "react";
import type { Asset } from "./types/Asset";
import { colors } from "./constants/colors";
import { ColorPicker } from "./components/ColorPicker";

type Props = {
  changeSelectedAsset: (selectedAsset: Asset | null) => void;
  assets: Asset[];
  changeDraggedAsset: (asset: Asset | null, options?: { defer?: boolean }) => void;
  onUpdateAssetColor?: (assetId: number, color: string) => void;
};

export function AssetPanel({ changeSelectedAsset, assets, changeDraggedAsset, onUpdateAssetColor }: Props) {
  const [currentTag, setCurrentTag] = useState<string>("Tile");
  const [activePicker, setActivePicker] = useState<{ id: number; rect: { left: number; top: number; width: number; height: number } } | null>(null);

  const onGlobalPointerUp = () => {
    changeDraggedAsset(null);
    window.removeEventListener("pointerup", onGlobalPointerUp);
  };

  const tabs = ["Tile", "Character"];

  const handleTileClick = (asset: Asset, e: React.MouseEvent) => {
    if (asset.tag === "Tile") {
      // 타일이면 컬러 피커 토글
      if (activePicker?.id === asset.id) {
        setActivePicker(null);
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        setActivePicker({
          id: asset.id,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        });
      }
      changeSelectedAsset(asset);
    } else {
      changeSelectedAsset(asset);
    }
  };

  return (
    <div style={{ background: colors.bgSecondary }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${colors.borderColor}`,
      }}>
        {tabs.map((tab) => (
          <div
            key={tab}
            onClick={() => {
              setCurrentTag(tab);
              setActivePicker(null);
            }}
            style={{
              padding: '10px 20px',
              fontSize: '12px',
              fontWeight: 500,
              color: currentTag === tab ? colors.accentLight : colors.textSecondary,
              background: currentTag === tab ? colors.bgPrimary : 'transparent',
              borderBottom: currentTag === tab ? `2px solid ${colors.borderAccent}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (currentTag !== tab) {
                e.currentTarget.style.color = colors.textPrimary;
              }
            }}
            onMouseLeave={(e) => {
              if (currentTag !== tab) {
                e.currentTarget.style.color = colors.textSecondary;
              }
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Asset Grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px',
          background: colors.bgPrimary,
          minHeight: '100px',
          maxHeight: '140px',
          overflowY: 'auto',
        }}
        onScroll={() => setActivePicker(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            changeSelectedAsset(null);
            setActivePicker(null);
          }
        }}
      >
        {assets
          .filter((asset) => asset.tag === currentTag)
          .map((asset) => (
            <div
              key={asset.id}
              style={{
                position: 'relative',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: asset.tag === "Tile" && asset.color ? asset.color : colors.bgSecondary,
                border: `2px solid ${activePicker?.id === asset.id ? colors.accentPrimary : colors.borderColor}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.borderAccent;
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = activePicker?.id === asset.id ? colors.accentPrimary : colors.borderColor;
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onPointerDown={(e) => {
                if (asset.tag === "Tile") return;
                e.preventDefault();
                e.stopPropagation();
                window.addEventListener("pointerup", onGlobalPointerUp);
                changeDraggedAsset(asset);
              }}
              onPointerUp={() => { }}
              onPointerCancel={() => changeDraggedAsset(null)}
              onClick={(e) => handleTileClick(asset, e)}
            >
              {asset.tag === "Tile" ? (
                // 타일은 색상만 표시
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
              ) : (
                <img
                  src={asset.url}
                  alt={asset.name}
                  draggable={false}
                  style={{
                    maxWidth: '44px',
                    maxHeight: '44px',
                    objectFit: 'contain',
                  }}
                />
              )}

            </div>
          ))}
      </div>

      {/* Color Picker 팝업 (Stacking Context 문제 해결을 위해 루프 밖으로 이동) */}
      {activePicker && (() => {
        const activeAsset = assets.find(a => a.id === activePicker.id);
        if (activeAsset && activeAsset.tag === "Tile") {
          return (
            <ColorPicker
              currentColor={activeAsset.color || "#4ade80"}
              onColorChange={(color) => {
                onUpdateAssetColor?.(activeAsset.id, color);
              }}
              onClose={() => setActivePicker(null)}
              anchorRect={activePicker.rect}
            />
          );
        }
        return null;
      })()}
    </div>
  );
}
