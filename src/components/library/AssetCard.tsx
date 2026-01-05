interface Props {
    title: string;
    subtitle: string;
}

export default function AssetCard({ title, subtitle }: Props) {
    return (
        <div className="asset-card">
            <div className="asset-title">{title}</div>
            <div className="asset-subtitle">{subtitle}</div>
        </div>
    );
}
