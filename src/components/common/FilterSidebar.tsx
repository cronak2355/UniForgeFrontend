import React from 'react';

export interface CategoryItem {
    id: string;
    icon?: string;
    kind?: 'type' | 'special';
    originalId?: string; // e.g. real UUID for collections
}

interface FilterSidebarProps {
    title: string;
    items: CategoryItem[];
    selectedId: string;
    onSelect: (item: CategoryItem) => void;
    actionButton?: React.ReactNode;
    onDropItem?: (targetId: string | null) => void; // null means "All Assets" (root)
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
    title,
    items,
    selectedId,
    onSelect,
    actionButton,
    onDropItem
}) => {

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, item: CategoryItem) => {
        e.preventDefault();
        e.stopPropagation();
        // Determine target ID: null for "All Assets", otherwise originalId
        const targetId = item.id === "전체 에셋" ? null : (item.originalId || item.id);
        if (onDropItem) {
            onDropItem(targetId);
        }
    };

    return (
        <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-[#111] h-full hidden lg:flex flex-col p-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6 px-2">{title}</h2>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {items.map((item, index) => {
                    const isDivider = (item as any).type === 'divider';
                    if (isDivider) return <div key={index} className="h-px bg-white/5 my-4 mx-2" />;

                    const isSelected = selectedId === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item)}
                            onDragOver={onDropItem ? handleDragOver : undefined}
                            onDrop={onDropItem ? (e) => handleDrop(e, item) : undefined}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 group relative
                                ${isSelected
                                    ? 'bg-blue-600/10 text-blue-400 font-semibold shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                ${isSelected ? 'bg-blue-500/20' : 'bg-[#1a1a1a] group-hover:bg-[#222]'}
                            `}>
                                <i className={`${item.icon || 'fa-solid fa-tag'} ${isSelected ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}></i>
                            </div>
                            <span className="truncate">{item.id}</span>

                            {/* Drag Highlight Indicator can be handled by CSS active state or customized later */}
                        </button>
                    );
                })}
            </div>

            {/* Optional Bottom Action */}
            {actionButton && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    {actionButton}
                </div>
            )}
        </aside>
    );
};

export default FilterSidebar;
