import { useRef, useState } from "react";
import type { Asset } from "./types/Asset";
import type { ModuleGraph } from "./types/Module";
import { createDefaultModuleGraph } from "./types/Module";
import { ModuleGraphEditor } from "./modules/ModuleGraphEditor";
import { colors } from "./constants/colors";

type Props = {
  changeSelectedAsset: (selectedAsset: Asset | null) => void;
  assets: Asset[];
  changeDraggedAsset: (asset: Asset | null, options?: { defer?: boolean }) => void;
  modules: ModuleGraph[];
  addModule: (module: ModuleGraph) => void;
  updateModule: (module: ModuleGraph) => void;
  selectedEntityVariables: AssetPanelVars;
  actionLabels: Record<string, string>;
  onCreateVariable?: (name: string, value: unknown, type?: "int" | "float" | "string" | "bool") => void;
  onUpdateVariable?: (name: string, value: unknown, type?: "int" | "float" | "string" | "bool") => void;
};

type AssetPanelVars = Array<{ id: string; name: string; type: string; value: number | string | boolean }>;

export function AssetPanel({
  changeSelectedAsset,
  assets,
  changeDraggedAsset,
  modules,
  addModule,
  updateModule,
  selectedEntityVariables,
  actionLabels,
  onCreateVariable,
  onUpdateVariable,
}: Props) {
  const [currentTag, setCurrentTag] = useState<string>("Tile");
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
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

  const tabs = ["Tile", "Character", "Modules"];

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

      {currentTag !== "Modules" ? (
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
                key={`${asset.id}-${asset.url}`}
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
                  dragStateRef.current = { asset, startX: e.clientX, startY: e.clientY, hasDragged: false };
                  window.addEventListener("pointermove", onGlobalPointerMove);
                  window.addEventListener("pointerup", onGlobalPointerUp);
                }}
                onPointerUp={() => { }}
                onPointerCancel={() => {
                  const state = dragStateRef.current;
                  if (state?.hasDragged) {
                    changeDraggedAsset(null, { defer: true });
                  }
                  clearDragListeners();
                }}
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
      ) : (
        <div
          style={{
            padding: '16px',
            background: colors.bgPrimary,
            minHeight: '100px',
            maxHeight: '140px',
            overflowY: 'auto',
            display: 'grid',
            gap: '8px',
          }}
        >
          <button
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              background: colors.bgTertiary,
              border: `1px solid ${colors.borderColor}`,
              borderRadius: '6px',
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
            onClick={() => {
              const next = createDefaultModuleGraph();
              next.name = `Module ${modules.length + 1}`;
              addModule(next);
              setActiveModuleId(next.id);
            }}
          >
            + Add Module
          </button>
          {modules.map((module) => (
            <div
              key={module.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${colors.borderColor}`,
                background: colors.bgSecondary,
                fontSize: '12px',
              }}
            >
              <span>{module.name}</span>
              <button
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  background: colors.borderAccent,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: '6px',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                }}
                onClick={() => setActiveModuleId(module.id)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {currentTag === "Modules" && activeModuleId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            padding: 24,
          }}
          onClick={() => setActiveModuleId(null)}
        >
          <div
            style={{
              width: "90vw",
              height: "80vh",
              background: colors.bgSecondary,
              border: `1px solid ${colors.borderColor}`,
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderBottom: `1px solid ${colors.borderColor}`,
                background: colors.bgTertiary,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {modules.find((m) => m.id === activeModuleId)?.name ?? "Module"}
              </div>
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.textSecondary,
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onClick={() => setActiveModuleId(null)}
              >
                Close
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {modules
                .filter((m) => m.id === activeModuleId)
                .map((module) => (
                  <ModuleGraphEditor
                    key={module.id}
                    module={module}
                    variables={selectedEntityVariables}
                    modules={modules}
                    actionLabels={actionLabels}
                    onCreateVariable={onCreateVariable}
                    onUpdateVariable={onUpdateVariable}
                    onChange={(next) => updateModule(next)}
                  />
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
