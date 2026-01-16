import React from 'react';
import { getCloudFrontUrl } from '../../utils/imageUtils';

interface AssetCardProps {
    id: string;
    title: string;
    author: string;
    image: string;
    type?: string;
    description?: string;
    rating?: number;
    purchaseDate?: string;
    isGame?: boolean;
    onClick?: () => void;
    overlayActions?: React.ReactNode;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({
    id,
    title,
    author,
    image,
    type = "Asset",
    purchaseDate,
    isGame = false,
    onClick,
    overlayActions,
    draggable,
    onDragStart
}) => {
    return (
        <div
            onClick={onClick}
            draggable={draggable}
            onDragStart={onDragStart}
            className={`
                group relative bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden 
                hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1 
                transition-all duration-300 cursor-pointer
                ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
            `}
        >
            {/* Thumbnail */}
            <div className="aspect-video w-full relative overflow-hidden bg-[#111]">
                <img
                    src={getCloudFrontUrl(image)}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-gray-600');
                        e.currentTarget.parentElement!.innerHTML = '<i class="fa-solid fa-image text-4xl"></i>';
                    }}
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                {/* Type Badge */}
                <span className={`absolute top-3 left-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-md border border-white/10 ${isGame ? 'bg-purple-600/80 text-white' : 'bg-blue-600/80 text-white'}`}>
                    {isGame ? 'GAME' : type}
                </span>

                {/* Overlay Actions (Hover) */}
                {overlayActions && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                        {overlayActions}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-white font-bold text-lg mb-1 truncate">{title}</h3>

                <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-[8px] text-white font-bold">
                            {author.substring(0, 1)}
                        </div>
                        <span className="truncate max-w-[100px]">{author}</span>
                    </div>

                    {purchaseDate && (
                        <span className="text-xs opacity-60">{purchaseDate}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetCard;
