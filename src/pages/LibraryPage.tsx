import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyGames } from '../services/gameService';
import TopBar from '../components/common/TopBar';
import AssetCard from '../components/common/AssetCard';
import FilterSidebar, { CategoryItem } from '../components/common/FilterSidebar';

// --- Types ---
interface UILibraryItem {
    id: string;
    libraryItemId?: string;
    title: string;
    type: 'game' | 'asset';
    thumbnail: string;
    author: string;
    purchaseDate: string;
    collectionId?: string;
    assetType?: string;
    metadata?: any;
    description?: string;
}

interface Collection {
    id: string;
    name: string;
    icon?: string;
}

const INITIAL_COLLECTIONS: Collection[] = [
    { id: 'c1', name: 'SF / 미래', icon: 'fa-rocket' },
    { id: 'c2', name: '공포 / 호러', icon: 'fa-ghost' },
];

interface Props {
    onClose?: () => void;
    onSelect?: (item: UILibraryItem) => void;
    isModal?: boolean;
    hideGamesTab?: boolean;
}

const DEFAULT_ASSET_THUMBNAIL = 'https://placehold.co/400x300/1a1a2e/a855f7?text=Asset';
const DEFAULT_GAME_THUMBNAIL = 'https://placehold.co/400x300/1a1a2e/3b82f6?text=Game';

export default function LibraryPage({ onClose, onSelect, isModal = false, hideGamesTab = false }: Props) {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data State
    const [activeTab, setActiveTab] = useState<'games' | 'assets'>(hideGamesTab ? 'assets' : 'games');
    const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Items State
    const [myGames, setMyGames] = useState<UILibraryItem[]>([]);
    const [myAssets, setMyAssets] = useState<UILibraryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [movingItem, setMovingItem] = useState<UILibraryItem | null>(null);
    const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');

    // --- Effects ---
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // Dynamic imports
                const { libraryService } = await import('../services/libraryService');
                const { marketplaceService } = await import('../services/marketplaceService');

                // 1. Fetch Collections
                const fetchedCollections = await libraryService.getCollections();
                setCollections(fetchedCollections.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    icon: c.icon || 'fa-folder'
                })));

                // 2. Fetch Games
                const games = await fetchMyGames(user.id);
                setMyGames(games.map(game => ({
                    id: game.gameId,
                    title: game.title,
                    type: 'game',
                    thumbnail: game.thumbnailUrl ?? DEFAULT_GAME_THUMBNAIL,
                    author: `User ${game.authorId}`,
                    purchaseDate: game.createdAt.split('T')[0],
                })));

                // 3. Fetch Assets
                const libraryItems = await libraryService.getLibrary();
                const assetItems = libraryItems.filter(item => item.itemType === 'ASSET');

                if (assetItems.length > 0) {
                    const assetDetails = await Promise.all(
                        assetItems.map(item => marketplaceService.getAssetById(item.refId).catch(() => null))
                    );

                    const mappedAssets = assetDetails
                        .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
                        .map(detail => {
                            const libItem = libraryItems.find(li => li.refId === detail.id);
                            return {
                                id: detail.id,
                                libraryItemId: libItem?.id,
                                title: detail.name,
                                type: 'asset' as const,
                                assetType: detail.genre || 'Unknown',
                                thumbnail: detail.imageUrl || detail.image || DEFAULT_ASSET_THUMBNAIL,
                                author: detail.author || `User ${detail.authorId}`,
                                purchaseDate: new Date(detail.createdAt).toLocaleDateString(),
                                collectionId: libItem?.collectionId || undefined
                            };
                        });
                    setMyAssets(mappedAssets);
                } else {
                    setMyAssets([]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    // --- Helpers ---
    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;
        try {
            const { libraryService } = await import('../services/libraryService');
            const newCol = await libraryService.createCollection(newCollectionName.trim());
            setCollections([...collections, { id: newCol.id, name: newCol.name, icon: 'fa-folder' }]);
            setShowCreateCollectionModal(false);
            setNewCollectionName('');
        } catch (error) {
            console.error(error);
            alert('컬렉션 생성 실패');
        }
    };

    const getFilteredItems = () => {
        let items = activeTab === 'games' ? myGames : myAssets;

        if (searchTerm) {
            items = items.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (activeTab === 'assets' && selectedCollectionId) {
            items = items.filter(item => item.collectionId === selectedCollectionId);
        }

        return items;
    };

    const filteredItems = getFilteredItems();

    return (
        <div className={`flex flex-col ${isModal ? 'h-full bg-[#0a0a0a]' : 'min-h-screen bg-black'} text-white relative overflow-hidden`}>
            {/* Background effects only if not modal? Keeping it simple for optimized version */}
            {!isModal && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#111827_0%,#000000_100%)]" />
                </div>
            )}

            {/* Top Bar */}
            <TopBar
                title={isModal ? "라이브러리" : "내 라이브러리"}
                showLogo={!isModal && !onClose}
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                showTabs={
                    <div className="flex bg-[#1a1a1a] rounded-lg p-1 ml-4 border border-[#333]">
                        {!hideGamesTab && (
                            <button
                                onClick={() => { setActiveTab('games'); setSelectedCollectionId(null); }}
                                className={`px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === 'games' ? 'bg-[#333] text-white shadow-sm' : 'text-[#888] hover:text-white'}`}
                            >
                                <i className="fa-solid fa-gamepad mr-2"></i>
                                나의 게임
                            </button>
                        )}
                        <button
                            onClick={() => { setActiveTab('assets'); setSelectedCollectionId(null); }}
                            className={`px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === 'assets' ? 'bg-[#333] text-white shadow-sm' : 'text-[#888] hover:text-white'}`}
                        >
                            <i className="fa-solid fa-cube mr-2"></i>
                            나의 에셋
                        </button>
                    </div>
                }
                actionButtons={
                    <div className="flex gap-2">
                        {onClose && (
                            <button onClick={onClose} className="px-4 py-2 border border-[#333] rounded-lg hover:bg-[#222] transition-colors">
                                닫기
                            </button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-1 max-w-[1600px] w-full mx-auto relative z-10 h-full overflow-hidden">
                {/* Sidebar only for Assets tab */}
                {activeTab === 'assets' && (
                    <FilterSidebar
                        title="Collections"
                        items={[
                            { id: "전체 에셋", kind: 'special', icon: 'fa-solid fa-layer-group' },
                            ...collections.map(c => ({ id: c.name, icon: c.icon, kind: 'special', originalId: c.id } as any))
                        ]}
                        selectedId={selectedCollectionId ? collections.find(c => c.id === selectedCollectionId)?.name || "전체 에셋" : "전체 에셋"}
                        onSelect={(item: any) => {
                            if (item.id === "전체 에셋") setSelectedCollectionId(null);
                            else setSelectedCollectionId(item.originalId);
                        }}
                        actionButton={
                            <button
                                onClick={() => setShowCreateCollectionModal(true)}
                                className="mt-4 flex items-center justify-center gap-2 w-full py-2 border border-dashed border-[#444] rounded-lg text-[#666] hover:text-white hover:border-[#666] transition-colors"
                            >
                                <i className="fa-solid fa-plus"></i>
                                <span>새 컬렉션</span>
                            </button>
                        }
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 p-8 overflow-y-auto">
                    {/* Toolbar */}
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[#666]">총 {filteredItems.length}개 항목</span>
                        {activeTab === 'assets' && !isModal && (
                            <button
                                onClick={() => navigate('/create-asset')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <i className="fa-solid fa-plus"></i>
                                새 에셋 업로드
                            </button>
                        )}
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="py-20 text-center text-[#666]">
                            <i className="fa-solid fa-spinner fa-spin text-3xl mb-4 text-blue-500"></i>
                            <p>Loading...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-20 text-center text-[#444]">
                            <i className="fa-solid fa-ghost text-4xl mb-4 opacity-50"></i>
                            <p>항목이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                            {filteredItems.map(item => (
                                <AssetCard
                                    key={item.id}
                                    id={item.id}
                                    title={item.title}
                                    author={item.author}
                                    image={item.thumbnail}
                                    type={item.assetType}
                                    purchaseDate={item.purchaseDate}
                                    isGame={item.type === 'game'}
                                    onClick={() => {
                                        if (isModal && onSelect) onSelect(item);
                                    }}
                                    overlayActions={
                                        <>
                                            <button
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isModal && onSelect) onSelect(item);
                                                }}
                                            >
                                                {isModal ? '선택' : (item.type === 'game' ? '플레이' : '다운로드')}
                                            </button>
                                            {item.type === 'asset' && !isModal && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setMovingItem(item); }}
                                                    className="w-10 h-10 flex items-center justify-center border border-white/20 rounded-lg hover:bg-white/10 text-white transition-colors"
                                                    title="컬렉션 이동"
                                                >
                                                    <i className="fa-solid fa-folder"></i>
                                                </button>
                                            )}
                                        </>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Create Collection Modal */}
            {showCreateCollectionModal && (
                <div className="fixed inset-0 z-[1100] bg-black/70 flex items-center justify-center" onClick={() => setShowCreateCollectionModal(false)}>
                    <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-xl w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <i className="fa-solid fa-folder-plus text-blue-500"></i>
                            새 컬렉션 만들기
                        </h3>
                        <input
                            type="text"
                            value={newCollectionName}
                            onChange={e => setNewCollectionName(e.target.value)}
                            placeholder="컬렉션 이름 (예: SF/미래)"
                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white mb-6 focus:border-blue-500 outline-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowCreateCollectionModal(false)} className="px-4 py-2 text-[#888] hover:text-white transition-colors">취소</button>
                            <button onClick={handleCreateCollection} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">생성</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Item Modal */}
            {movingItem && (
                <div className="fixed inset-0 z-[1100] bg-black/70 flex items-center justify-center p-4" onClick={() => setMovingItem(null)}>
                    <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-xl w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2">컬렉션으로 이동</h3>
                        <p className="text-[#888] text-sm mb-6">'{movingItem.title}'을(를) 어디로 이동할까요?</p>

                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mb-6">
                            <button
                                onClick={async () => {
                                    try {
                                        const { libraryService } = await import('../services/libraryService');
                                        if (movingItem.libraryItemId) {
                                            await libraryService.moveItemToCollection(movingItem.libraryItemId, null);
                                            setMyAssets(prev => prev.map(a => a.id === movingItem.id ? { ...a, collectionId: undefined } : a));
                                            setMovingItem(null);
                                        }
                                    } catch (e) { alert("이동 실패"); }
                                }}
                                className={`text-left px-4 py-3 rounded-lg border transition-all ${!movingItem.collectionId ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-[#333] hover:bg-[#222]'}`}
                            >
                                <i className="fa-solid fa-layer-group mr-3"></i>
                                [기본] 전체 에셋
                            </button>
                            {collections.map(col => (
                                <button
                                    key={col.id}
                                    onClick={async () => {
                                        try {
                                            const { libraryService } = await import('../services/libraryService');
                                            if (movingItem.libraryItemId) {
                                                await libraryService.moveItemToCollection(movingItem.libraryItemId, col.id);
                                                setMyAssets(prev => prev.map(a => a.id === movingItem.id ? { ...a, collectionId: col.id } : a));
                                                setMovingItem(null);
                                            }
                                        } catch (e) { alert("이동 실패"); }
                                    }}
                                    className={`text-left px-4 py-3 rounded-lg border transition-all ${movingItem.collectionId === col.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-[#333] hover:bg-[#222]'}`}
                                >
                                    <i className={`fa-solid ${col.icon} mr-3`}></i>
                                    {col.name}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setMovingItem(null)} className="px-4 py-2 text-[#888] hover:text-white transition-colors">닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
