import { useState } from "react";
import type { Asset } from "./types/Asset";
import { colors } from "./constants/colors";

type Props = {
  changeSelectedAsset: (selectedAsset: Asset | null) => void;
  assets: Asset[];
  changeDraggedAsset: (asset: Asset | null, options?: { defer?: boolean }) => void;
};

export function AssetPanel({ changeSelectedAsset, assets, changeDraggedAsset }: Props) {
  const [currentTag, setCurrentTag] = useState<string>("Tile");

  const onGlobalPointerUp = () => {
    changeDraggedAsset(null);
    window.removeEventListener("pointerup", onGlobalPointerUp);
  };

  const tabs = ["Tile", "Character"];

  const handleTileClick = (asset: Asset) => {
    changeSelectedAsset(asset);
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
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            changeSelectedAsset(null);
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
                background: colors.bgSecondary,
                border: `2px solid ${colors.borderColor}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.borderAccent;
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.borderColor;
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
              onClick={() => handleTileClick(asset)}
            >
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
            </div>
          ))}
      </div>

    </div>
  );
}
