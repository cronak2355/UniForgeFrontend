import { useState } from "react";
import type { Asset } from "./types/Asset";

type Props = {
  changeSelectedAsset: (selectedAsset: Asset | null) => void;
  assets: Asset[];
  changeDraggAsset: (asset: Asset | null, options?: { defer?: boolean }) => void;
};

export function AssetPanel({ changeSelectedAsset, assets, changeDraggAsset }: Props) {
  const [currentTag, setCurrentTag] = useState<string>("Tile");
  const onGlobalPointerUp = () => {
    changeDraggAsset(null);
    window.removeEventListener("pointerup", onGlobalPointerUp)
  }
  return (
    <>
      <div className="editor-assets-tabs">
        <span onClick={() => setCurrentTag("Tile")}>Tile</span>
        <span onClick={() => setCurrentTag("Character")}>Character</span>
      </div>

      <div
        className="editor-assets-grid"
        onClick={(e) => {
          // 👉 진짜 배경 클릭일 때만
          if (e.target !== e.currentTarget) return;

          changeSelectedAsset(null);
        }}
      >
        {assets
          .filter(asset => asset.tag === currentTag)
          .map(asset => (
            <img
              key={asset.id}
              src={asset.url}
              className="asset-item"
              draggable={false}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // 포인터를 이 img가 "캡처"해서 이후 up/move를 계속 받게 함
                // (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

                if (asset.tag === "Tile") return;
                window.addEventListener("pointerup", onGlobalPointerUp);
                changeDraggAsset(asset);
              }}

              onPointerUp={() => {
                console.log("pointer up");


                // 선택사항: 명시적으로 해제
                //try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
              }}

              onPointerCancel={() => {
                // OS 제스처/창밖/모바일 등으로 캔슬될 때도 안전하게 종료
                changeDraggAsset(null);
              }}
              onClick={() => {
                changeSelectedAsset(asset);
              }}
            />
          ))}
      </div>
    </>
  );
}
