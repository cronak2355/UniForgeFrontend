import { useState } from "react";
import type { Asset } from "../data/Asset"
type Props = {
  onChangeValue: (selectedAsset: Asset) => void;
  assets: Asset[];
};

export function AssetLibrary({ onChangeValue, assets }: Props) {
  const [currentTag, setCurrentTag] = useState<"Tile" | "Sfx">("Tile");

  return (
    <>
      <div className="editor-assets-tabs">
        <span onClick={() => setCurrentTag("Tile")}>Tile</span>
        <span onClick={() => setCurrentTag("Sfx")}>Sfx</span>
      </div>
      <div className="editor-assets-grid">
        {Object.values(assets)
          .filter(asset => asset.tag == currentTag)
          .map(asset => (
            <img src={asset.url} key={asset.id} className="asset-item" onClick={ () => onChangeValue(asset) } />
          ))}
      </div>
    </>
  );
}
