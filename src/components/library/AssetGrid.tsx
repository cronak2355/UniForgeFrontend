import AssetCard from "./AssetCard";

const assets = [
    { title: "Plasma Rifle", subtitle: "Plasma Rifle Model" },
    { title: "Neon City", subtitle: "Neon City Texture" },
    { title: "AI Script", subtitle: "AI Patrol Script" },
];

export default function AssetGrid() {
    return (
        <div className="asset-grid">
            {assets.map(a => (
                <AssetCard
                    key={a.title}
                    title={a.title}
                    subtitle={a.subtitle}
                />
            ))}
        </div>
    );
}
