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
                const { userService } = await import('../services/userService');

                // 1. Fetch Collections
                const fetchedCollections = await libraryService.getCollections();
                setCollections(fetchedCollections.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    icon: c.icon || 'fa-folder'
                })));

                // 2. Fetch Games & Assets (Raw Data)
                const [games, libraryItems] = await Promise.all([
                    fetchMyGames(user.id),
                    libraryService.getLibrary()
                ]);

                // 3. Process Assets
                const assetItems = libraryItems.filter(item => item.itemType === 'ASSET');
                let assetDetails: any[] = [];
                if (assetItems.length > 0) {
                    assetDetails = await Promise.all(
                        assetItems.map(item => marketplaceService.getAssetById(item.refId).catch(() => null))
                    );
                }

                // 4. Collect Author IDs to fetch names
                const authorIds = new Set<string>();
                games.forEach(g => authorIds.add(g.authorId));
                assetDetails.forEach(d => { if (d) authorIds.add(d.authorId); });

                // 5. Fetch User Names
                const userMap = await userService.getUsersByIds(Array.from(authorIds));

                // Optimistic override for current user
                if (user && user.id) {
                    userMap.set(user.id, { id: user.id, name: user.name, email: user.email, profileImage: user.profileImage } as any);
                }

                // 6. Map to UI
                setMyGames(games.map(game => {
                    const authorName = userMap.get(game.authorId)?.name || "Unknown User";
                    return {
                        id: game.gameId,
                        title: game.title,
                        type: 'game',
                        thumbnail: game.thumbnailUrl ?? DEFAULT_GAME_THUMBNAIL,
                        author: authorName,
                        purchaseDate: game.createdAt.split('T')[0],
                    };
                }));

                if (assetItems.length > 0) {
                    const mappedAssets = assetDetails
                        .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
                        .map(detail => {
                            const libItem = libraryItems.find(li => li.refId === detail.id);
                            const authorName = userMap.get(detail.authorId)?.name || detail.author || "Unknown User";
                            return {
                                id: detail.id,
                                libraryItemId: libItem?.id,
                                title: detail.name,
                                type: 'asset' as const,
                                assetType: detail.genre || 'Unknown',
                                thumbnail: detail.imageUrl || detail.image || DEFAULT_ASSET_THUMBNAIL,
                                author: authorName,
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

    // Prepare Sidebar Items based on Active Tab
    const sidebarItems: CategoryItem[] = activeTab === 'assets'
        ? [
            { id: "전체 에셋", kind: 'special', icon: 'fa-solid fa-layer-group' },
            ...collections.map(c => ({ id: c.name, icon: c.icon || 'fa-folder', kind: 'special', originalId: c.id } as any))
        ]
        : [
            { id: "전체 게임", kind: 'special', icon: 'fa-solid fa-gamepad' },
        ];

    const selectedSidebarId = activeTab === 'assets'
        ? (selectedCollectionId ? collections.find(c => c.id === selectedCollectionId)?.name || "전체 에셋" : "전체 에셋")
        : "전체 게임";

    // --- DnD Handlers ---
    const [draggedItem, setDraggedItem] = useState<UILibraryItem | null>(null);

    const onAssetDragStart = (e: React.DragEvent, item: UILibraryItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Set transparent image as drag image if desired
    };

    const onSidebarDrop = async (targetCollectionId: string | null) => {
        if (!draggedItem || !draggedItem.libraryItemId) return;
        if (draggedItem.collectionId === (targetCollectionId || undefined)) return; // No change

        try {
            const { libraryService } = await import('../services/libraryService');

            // Optimistic update
            const previousAssets = [...myAssets];
            setMyAssets(prev => prev.map(a =>
                a.id === draggedItem.id
                    ? { ...a, collectionId: targetCollectionId || undefined }
                    : a
            ));

            await libraryService.moveItemToCollection(draggedItem.libraryItemId, targetCollectionId);

            // Success
            setDraggedItem(null);
        } catch (e) {
            console.error(e);
            alert("이동 실패");
            // In a real app, we would rollback state here
        }
    };


    return (
        <div className={`flex flex-col ${isModal ? 'h-full bg-[#0a0a0a]' : 'min-h-screen bg-black'} text-white relative overflow-hidden`}>
            {/* Background effects only if not modal */}
            {!isModal && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
                </div>
            )}

            {/* Top Bar */}
            <TopBar
                title={isModal ? "라이브러리" : "내 라이브러리"}
                showLogo={!isModal && !onClose}
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                showTabs={
                    <div className="flex items-center gap-1 bg-[#1a1a1a]/50 p-1 rounded-xl border border-white/5 ml-6">
                        {!hideGamesTab && (
                            <button
                                onClick={() => { setActiveTab('games'); setSelectedCollectionId(null); }}
                                className={`
                                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                                    ${activeTab === 'games'
                                        ? 'bg-[#2a2a2a] text-white shadow-sm ring-1 ring-white/10'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                                `}
                            >
                                <i className={`fa-solid fa-gamepad ${activeTab === 'games' ? 'text-purple-400' : ''}`}></i>
                                나의 게임
                            </button>
                        )}
                        <button
                            onClick={() => { setActiveTab('assets'); setSelectedCollectionId(null); }}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                                ${activeTab === 'assets'
                                    ? 'bg-[#2a2a2a] text-white shadow-sm ring-1 ring-white/10'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                            `}
                        >
                            <i className={`fa-solid fa-cube ${activeTab === 'assets' ? 'text-blue-400' : ''}`}></i>
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

            <div className="flex flex-1 max-w-[1920px] w-full mx-auto relative z-10 h-full overflow-hidden">
                {/* Sidebar - Drop Target */}
                <FilterSidebar
                    title={activeTab === 'assets' ? "Collections" : "Library"}
                    items={sidebarItems}
                    selectedId={selectedSidebarId}
                    onSelect={(item: any) => {
                        if (activeTab === 'games') return;
                        if (item.id === "전체 에셋") setSelectedCollectionId(null);
                        else setSelectedCollectionId(item.originalId);
                    }}
                    onDropItem={activeTab === 'assets' ? onSidebarDrop : undefined}
                    actionButton={activeTab === 'assets' ? (
                        <button
                            onClick={() => setShowCreateCollectionModal(true)}
                            className="mt-4 flex items-center justify-center gap-2 w-full py-3 border border-dashed border-[#333] rounded-xl text-gray-500 hover:text-white hover:border-gray-500 hover:bg-white/5 transition-all group"
                        >
                            <i className="fa-solid fa-plus group-hover:rotate-90 transition-transform duration-200"></i>
                            <span>새 컬렉션</span>
                        </button>
                    ) : undefined}
                />

                {/* Main Content */}
                <main className="flex-1 p-8 overflow-y-auto">
                    {/* Toolbar */}
                    <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">
                                {activeTab === 'games' ? 'My Games' : (selectedSidebarId === "전체 에셋" ? "All Assets" : selectedSidebarId)}
                            </h2>
                            <p className="text-gray-500 text-sm">
                                총 <span className="text-white font-medium">{filteredItems.length}</span>개의 항목
                            </p>
                        </div>

                        {activeTab === 'assets' && !isModal && (
                            <button
                                onClick={() => navigate('/create-asset')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-blue-900/30"
                            >
                                <i className="fa-solid fa-cloud-arrow-up"></i>
                                에셋 업로드
                            </button>
                        )}
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="py-40 text-center text-gray-500 flex flex-col items-center">
                            <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-6 text-blue-500"></i>
                            <p className="animate-pulse">라이브러리 불러오는 중...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-40 text-center text-gray-600 flex flex-col items-center justify-center border border-dashed border-[#222] rounded-3xl bg-white/5 mx-auto max-w-2xl">
                            <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-6 text-3xl">
                                <i className="fa-solid fa-ghost opacity-40"></i>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-300 mb-2">항목이 없습니다</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mb-8">
                                {searchTerm ? '검색 결과가 없습니다.' : (activeTab === 'games' ? '아직 만든 게임이 없습니다. 새로운 프로젝트를 시작해보세요!' : '라이브러리에 에셋이 없습니다. 마켓플레이스를 둘러보세요!')}
                            </p>
                            {!searchTerm && (
                                <button
                                    onClick={() => navigate(activeTab === 'games' ? '/' : '/explore')}
                                    className="px-6 py-3 bg-[#222] hover:bg-[#333] text-white rounded-xl transition-colors font-medium"
                                >
                                    {activeTab === 'games' ? '새 프로젝트 만들기' : '마켓플레이스로 이동'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 pb-20">
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
                                    draggable={activeTab === 'assets'} // Only items in Assets tab are draggable
                                    onDragStart={(e) => onAssetDragStart(e, item)}
                                    onClick={() => {
                                        if (isModal && onSelect) onSelect(item);
                                    }}
                                    overlayActions={
                                        <>
                                            <button
                                                className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors shadow-xl"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isModal && onSelect) onSelect(item);
                                                }}
                                            >
                                                {isModal ? 'Select' : (item.type === 'game' ? 'Play' : 'Download')}
                                            </button>

                                            {item.type === 'asset' && !isModal && (
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setMovingItem(item); }}
                                                        className="w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-black/90 backdrop-blur-sm rounded-full text-white transition-colors border border-white/10"
                                                        title="컬렉션 이동"
                                                    >
                                                        <i className="fa-solid fa-folder"></i>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/assets-editor?assetId=${item.id}`);
                                                        }}
                                                        className="w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-black/90 backdrop-blur-sm rounded-full text-white transition-colors border border-white/10"
                                                        title="에셋 편집"
                                                    >
                                                        <i className="fa-solid fa-pen"></i>
                                                    </button>
                                                </div>
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
                <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowCreateCollectionModal(false)}>
                    <div className="bg-[#151515] border border-[#333] p-8 rounded-2xl w-[420px] shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-500">
                                <i className="fa-solid fa-folder-plus"></i>
                            </div>
                            새 컬렉션 만들기
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">컬렉션 이름</label>
                                <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={e => setNewCollectionName(e.target.value)}
                                    placeholder="예: SF 배경 모음"
                                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3.5 text-white focus:border-blue-500 outline-none transition-colors"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowCreateCollectionModal(false)} className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium">취소</button>
                            <button onClick={handleCreateCollection} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-900/20">생성하기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Item Modal */}
            {movingItem && (
                <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setMovingItem(null)}>
                    <div className="bg-[#151515] border border-[#333] p-6 rounded-2xl w-[420px] shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="mb-6">
                            <h3 className="text-xl font-bold mb-1">컬렉션으로 이동</h3>
                            <p className="text-gray-500 text-sm truncate">
                                <span className="text-white font-medium">{movingItem.title}</span>을(를) 선택하세요
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
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
                                className={`text-left px-4 py-4 rounded-xl border transition-all flex items-center group
                                    ${!movingItem.collectionId
                                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                        : 'border-[#222] hover:bg-[#222] hover:border-[#333] text-gray-300'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 
                                    ${!movingItem.collectionId ? 'bg-blue-500 text-white' : 'bg-[#333] text-gray-500 group-hover:bg-[#444] group-hover:text-white'}`}>
                                    <i className="fa-solid fa-layer-group"></i>
                                </div>
                                <span className="font-medium">[기본] 전체 에셋</span>
                                {!movingItem.collectionId && <i className="fa-solid fa-check ml-auto"></i>}
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
                                    className={`text-left px-4 py-4 rounded-xl border transition-all flex items-center group
                                        ${movingItem.collectionId === col.id
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'border-[#222] hover:bg-[#222] hover:border-[#333] text-gray-300'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 
                                        ${movingItem.collectionId === col.id ? 'bg-blue-500 text-white' : 'bg-[#333] text-gray-500 group-hover:bg-[#444] group-hover:text-white'}`}>
                                        <i className={`fa-solid ${col.icon}`}></i>
                                    </div>
                                    <span className="font-medium">{col.name}</span>
                                    {movingItem.collectionId === col.id && <i className="fa-solid fa-check ml-auto"></i>}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end pt-6 mt-2 border-t border-[#222]">
                            <button onClick={() => setMovingItem(null)} className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors">닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
