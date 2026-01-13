
export interface CategoryItem {
    id: string;
    icon?: string;
    kind?: 'type' | 'genre' | 'special';
    type?: 'divider';
}

interface FilterSidebarProps {
    items: CategoryItem[];
    selectedId: string | null;
    onSelect: (item: CategoryItem) => void;
    title?: string;
    actionButton?: React.ReactNode; // e.g., "Create Collection"
}

const FilterSidebar = ({ items, selectedId, onSelect, title, actionButton }: FilterSidebarProps) => {
    return (
        <aside className="w-[240px] py-8 px-4 border-r border-[#1a1a1a] sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
            {title && (
                <div className="px-2 mb-4 text-[#666] text-xs font-semibold uppercase tracking-widest">
                    {title}
                </div>
            )}

            <nav className="flex flex-col gap-2">
                {items.map((item, index) => {
                    if (item.type === 'divider') {
                        return <div key={index} className="h-px bg-[#222] my-2.5" />;
                    }

                    const isActive = selectedId === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className={`
                                flex items-center gap-3 px-4 py-2.5 rounded-lg text-[0.95rem] text-left w-full transition-all duration-200
                                ${isActive
                                    ? 'bg-[#1a1a1a] border border-[#333] text-white'
                                    : 'bg-transparent border border-transparent text-[#888] hover:bg-[#111] hover:text-[#ccc]'}
                            `}
                        >
                            {item.icon && <i className={`${item.icon} w-5 text-center`}></i>}
                            <span>{item.id}</span>
                        </button>
                    );
                })}

                {actionButton}
            </nav>
        </aside>
    );
};

export default FilterSidebar;
