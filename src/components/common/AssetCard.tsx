import { useNavigate } from "react-router-dom";

export interface AssetCardProps {
    id: string;
    title: string;
    author: string;
    image: string;
    type?: string;
    price?: number;
    rating?: number;
    purchaseDate?: string;
    isGame?: boolean; // If true, show "Play" instead of "Download" etc.
    onClick?: () => void;
    // Optional overlay actions
    overlayActions?: React.ReactNode;
}

const AssetCard = ({
    id,
    title,
    author,
    image,
    type = "Asset",
    price,
    rating,
    purchaseDate,
    isGame = false,
    onClick,
    overlayActions
}: AssetCardProps) => {
    const navigate = useNavigate();

    // Handling image error fallback
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = 'https://placehold.co/400x300/1a1a1a/666?text=No+Image';
    };

    return (
        <div
            className="group bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden cursor-pointer relative hover:-translate-y-1 hover:border-[#444] transition-all duration-200"
            onClick={onClick}
        >
            {/* Thumbnail */}
            <div className="h-40 relative overflow-hidden">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                />

                {/* Type Badge (if not game, or always?) */}
                {!isGame && (
                    <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-semibold">
                        {type}
                    </span>
                )}

                {/* Overlay with Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition-opacity duration-200">
                    {overlayActions}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white text-base font-semibold m-0 truncate pr-2">{title}</h3>
                </div>
                <p className="text-[#888] text-[0.85rem] mb-4 truncate">by {author}</p>

                <div className="flex justify-between items-center text-xs">
                    {/* Left Side: Rating or Type */}
                    {rating !== undefined ? (
                        <div className="flex items-center gap-1 text-amber-400">
                            <i className="fa-solid fa-star"></i>
                            <span>{rating}</span>
                        </div>
                    ) : (
                        <span className="text-[#555]">{type}</span>
                    )}

                    {/* Right Side: Price or Date */}
                    {price !== undefined ? (
                        <span className={`font-semibold ${price === 0 ? 'text-green-500' : 'text-white'}`}>
                            {price === 0 ? 'Free' : `₩${price.toLocaleString()}`}
                        </span>
                    ) : purchaseDate ? (
                        <span className="text-[#555]">{purchaseDate}</span>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default AssetCard;
