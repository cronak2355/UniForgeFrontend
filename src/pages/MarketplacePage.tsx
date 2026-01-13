import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { marketplaceService, Asset } from '../services/marketplaceService';
import TopBar from '../components/common/TopBar';
import AssetCard from '../components/common/AssetCard';
import FilterSidebar, { CategoryItem } from '../components/common/FilterSidebar';

const MarketplacePage = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    // UI State
    const [selectedCategory, setSelectedCategory] = useState("전체");

    // API Data State
    const [sortOrder, setSortOrder] = useState('latest');
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<Asset | null>(null);

    // Filter State
    const [selectedFilterId, setSelectedFilterId] = useState<string>("전체");

    // --- Data Fetching ---
    useEffect(() => {
        const fetchAssets = async () => {
            setLoading(true);
            try {
                // Fetch assets with current sort order
                const data = await marketplaceService.getAssets(undefined, sortOrder);

                // Get unique author IDs to fetch names
                const authorIds = [...new Set(data.map(asset => asset.authorId))];

                // Fetch user info for all authors parallely
                const userInfoMap = new Map<string, string>();
                await Promise.all(
                    authorIds.map(async (authorId) => {
                        try {
                            const { userService } = await import('../services/userService');
                            const user = await userService.getUserById(authorId);
                            if (user?.name) {
                                userInfoMap.set(authorId, user.name);
                            }
                        } catch (e) {
                            console.warn(`Failed to fetch user ${authorId}`);
                        }
                    })
                );

                // Map backend data to UI format
                const mappedData = data.map(asset => ({
                    ...asset,
                    image: asset.image || asset.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400",
                    rating: asset.rating || 0,
                    type: asset.assetType || "오브젝트",
                    genre: asset.genre || "기타",
                    author: asset.author || userInfoMap.get(asset.authorId) || "익명",
                    createdAt: asset.createdAt || new Date().toISOString(),
                    description: asset.description || ""
                }));
                setAssets(mappedData);
            } catch (error) {
                console.error("Failed to fetch assets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssets();
    }, [sortOrder]);

    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = selectedItem ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; }
    }, [selectedItem]);

    // --- Filtering Logic ---
    const CATEGORIES: CategoryItem[] = [
        { id: "추천", icon: "fa-solid fa-fire", kind: 'special' },
        { id: "신규", icon: "fa-solid fa-sparkles", kind: 'special' },
        { id: "divider-1", type: "divider" },
        { id: "캐릭터", kind: "type", icon: "fa-solid fa-person" },
        { id: "배경/타일", kind: "type", icon: "fa-solid fa-map" },
        { id: "무기/장비", kind: "type", icon: "fa-solid fa-khanda" },
        { id: "오브젝트", kind: "type", icon: "fa-solid fa-cube" },
        { id: "VFX", kind: "type", icon: "fa-solid fa-wand-magic-sparkles" },
        { id: "UI", kind: "type", icon: "fa-solid fa-desktop" },
        { id: "사운드", kind: "type", icon: "fa-solid fa-music" },
        { id: "기타", kind: "type", icon: "fa-solid fa-box-open" },
    ];

    const filteredItems = useMemo(() => {
        return assets.filter(item => {
            // 1. Special Categories
            if (selectedCategory === "전체") return true;
            if (selectedCategory === "추천") return true;
            if (selectedCategory === "급상승") {
                if ((item.rating || 0) < 4.7) return false;
            }
            if (selectedCategory === "신규") return true;

            // 2. Type/Genre Mapping
            if (['캐릭터', '배경/타일', '무기/장비', '오브젝트', 'VFX', 'UI', '사운드', '기타'].includes(selectedCategory)) {
                if (item.type !== selectedCategory && item.genre !== selectedCategory) return false;
            }

            return true;
        });
    }, [assets, selectedCategory]);

    const handleCategorySelect = (item: CategoryItem) => {
        setSelectedFilterId(item.id);
        setSelectedCategory(item.id);
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white relative">
            {/* Header */}
            <TopBar
                title="에셋 플레이스"
                showLogo={true}
                onSearch={(term) => console.log("Search:", term)}
                placeholder="에셋, 게임, 크리에이터 검색..."
                actionButtons={
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/create-asset')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-white font-semibold transition-all shadow-lg hover:shadow-blue-600/20"
                        >
                            <i className="fa-solid fa-plus"></i>
                            에셋 등록
                        </button>
                        <button
                            onClick={() => navigate('/library')}
                            className="px-4 py-2 bg-transparent text-[#888] hover:text-white transition-colors"
                        >
                            내 라이브러리
                        </button>
                    </div>
                }
            />

            <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
                {/* Sidebar */}
                <FilterSidebar
                    items={[{ id: "전체", kind: 'special', icon: 'fa-solid fa-layer-group' }, ...CATEGORIES]}
                    selectedId={selectedFilterId}
                    onSelect={handleCategorySelect}
                />

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {/* Toolbar */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold">{selectedCategory} 아이템</h2>
                        <div className="flex gap-2">
                            {[
                                { id: 'popular', label: '인기순' },
                                { id: 'latest', label: '최신순' },
                                { id: 'price_asc', label: '가격 낮은순' },
                                { id: 'price_desc', label: '가격 높은순' },
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSortOrder(filter.id)}
                                    className={`
                                        px-3 py-1.5 rounded text-sm transition-colors border
                                        ${sortOrder === filter.id
                                            ? 'bg-[#333] border-[#555] text-white'
                                            : 'bg-transparent border-transparent text-[#666] hover:bg-[#111]'}
                                    `}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="col-span-full py-20 text-center text-[#666]">
                            <i className="fa-solid fa-spinner fa-spin text-3xl mb-4 text-blue-500"></i>
                            <p>Loading assets...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-[#666]">
                            <p>No assets found for this category.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                            {filteredItems.map((item) => (
                                <AssetCard
                                    key={item.id}
                                    id={item.id}
                                    title={item.name}
                                    author={item.author}
                                    image={item.image}
                                    type={item.type}
                                    rating={item.rating}
                                    price={item.price}
                                    onClick={() => setSelectedItem(item)}
                                    overlayActions={null}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Asset Detail Modal */}
            {selectedItem && (
                <div
                    className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-8 backdrop-blur-sm"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex shadow-2xl relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors text-2xl z-10"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>

                        {/* Left: Image */}
                        <div className="w-1/2 bg-black flex items-center justify-center p-8 border-r border-[#222]">
                            <img
                                src={selectedItem.image}
                                alt={selectedItem.name}
                                className="max-w-full max-h-[60vh] object-contain shadow-lg"
                            />
                        </div>

                        {/* Right: Info */}
                        <div className="w-1/2 p-8 flex flex-col">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                                        {selectedItem.type}
                                    </span>
                                    <span className="text-[#666] text-sm">{selectedItem.genre}</span>
                                </div>

                                <h2 className="text-3xl font-bold mb-2">{selectedItem.name}</h2>
                                <p className="text-[#888] mb-6">by {selectedItem.author}</p>

                                <div className="flex items-center gap-2 text-amber-400 mb-6 bg-amber-400/10 px-3 py-2 rounded-lg w-fit">
                                    <i className="fa-solid fa-star"></i>
                                    <span className="font-semibold">{selectedItem.rating || 0}</span>
                                    <span className="text-[#666] ml-2 text-sm">(128 reviews)</span>
                                </div>

                                <p className="text-[#ccc] leading-relaxed mb-8 border-t border-[#222] pt-6">
                                    {selectedItem.description || "이 에셋은 유니포지 마켓플레이스에서 엄선된 고품질 에셋입니다. 프로젝트에 바로 적용하여 시간을 절약하고 퀄리티를 높여보세요."}
                                </p>
                            </div>

                            <div className="border-t border-[#222] pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[#888]">가격</span>
                                    <span className={`text-2xl font-bold ${selectedItem.price === 0 ? 'text-green-500' : 'text-white'}`}>
                                        {selectedItem.price === 0 ? 'Free' : `₩${selectedItem.price.toLocaleString()}`}
                                    </span>
                                </div>

                                <button
                                    onClick={() => alert(`${selectedItem.name}이(가) 라이브러리에 다운로드되었습니다.`)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <i className="fa-solid fa-download"></i>
                                    라이브러리에 담기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketplacePage;
