import './App.css'
import { useContext, useState } from "react";
import type { Asset } from "./data/Asset";
import { AssetLibrary } from "./editor/AssetLibrary";
import { PhaserCanvas } from "./editor/PhaserCanvas"

function App() {
  const [useAssets, SetUseAssets] = useState<Asset[]>([
    {
      id: 0,
      tag: "Tile",
      url: "TestAsset.webp",
      name: "grass"
    },
    {
      id: 1,
      tag: "Tile",
      url: "TestAsset2.webp",
      name: "dirt"
    },
    {
      id: 2,
      tag: "Tile",
      url: "TestAsset3.webp",
      name: "water"
    },
  ]);
  const [currentAsset, SetAsset] = useState<Asset | null>(null);

  const handleCurrentAsset = (selectedAsset: Asset) => 
  {
    SetAsset(selectedAsset)
  };

  return (
    <div className="editor-root">
      <div className="editor-topbar">
        <span>file</span>
        <span>assets</span>
        <span>edit</span>
      </div>

      <div className="editor-main">
        <div className="editor-panel left">
          <div className="editor-panel-header">Hierarchy</div>
        </div>

        <div className="editor-camera">
            <PhaserCanvas assets={useAssets} selected_asset={currentAsset}/>
        </div>

        <div className="editor-panel right">
          <div className="editor-panel-header">Inspector</div>
        </div>
      </div>

      <div className="editor-assets">
        <AssetLibrary assets={useAssets} onChangeValue={handleCurrentAsset} />
      </div>
    </div>
  );
}

export default App;
