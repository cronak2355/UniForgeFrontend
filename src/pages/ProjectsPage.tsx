
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createGame, fetchMyGames, updateGameInfo, deleteGame, type GameSummary } from '../services/gameService';
import TopBar from '../components/common/TopBar';
import { getCloudFrontUrl } from '../utils/imageUtils';

export default function ProjectsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myGames, setMyGames] = useState<GameSummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // Selection / Multi-Delete State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());

    // Single Rename State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [targetGame, setTargetGame] = useState<GameSummary | null>(null);
    const [newName, setNewName] = useState("");

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (user?.id) loadGames();
        else setLoading(false);
    }, [user?.id]);

    const loadGames = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const games = await fetchMyGames(user.id);
            setMyGames(Array.isArray(games) ? games : []);
        } catch (e) {
            console.error("Failed to load games", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGame = async () => {
        if (!user?.id) return;
        try {
            const newGame = await createGame(user.id, "Untitled Project", "New Project");
            navigate(`/editor/${newGame.gameId}`);
        } catch (e) {
            alert("프로젝트 생성 실패");
        }
    };

    // --- Multi-Select Logic ---
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedGameIds(new Set());
    };

    const toggleGameSelection = (gameId: string) => {
        const newSet = new Set(selectedGameIds);
        if (newSet.has(gameId)) newSet.delete(gameId);
        else newSet.add(gameId);
        setSelectedGameIds(newSet);
    };

    const handleBatchDelete = async () => {
        if (selectedGameIds.size === 0) return;
        if (!confirm(`선택한 ${selectedGameIds.size}개의 프로젝트를 삭제하시겠습니까?`)) return;

        try {
            await Promise.all(Array.from(selectedGameIds).map(id => deleteGame(id)));
            setMyGames(prev => prev.filter(g => !selectedGameIds.has(g.gameId)));
            setIsSelectionMode(false);
            setSelectedGameIds(new Set());
            // Adjust page if empty
            const remainingCount = myGames.length - selectedGameIds.size;
            const maxPage = Math.ceil(remainingCount / ITEMS_PER_PAGE) || 1;
            if (currentPage > maxPage) setCurrentPage(maxPage);
        } catch (e) {
            alert("일부 프로젝트 삭제 실패");
        }
    };

    // --- Single Item Logic ---
    const handleRenameClick = (game: GameSummary, e: React.MouseEvent) => {
        e.stopPropagation();
        setTargetGame(game);
        setNewName(game.title);
        setRenameModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = async (gameId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveMenuId(null);
        if (!confirm("정말 이 프로젝트를 삭제하시겠습니까? 안의 데이터는 모두 사라집니다.")) return;

        try {
            await deleteGame(gameId);
            setMyGames(prev => prev.filter(g => g.gameId !== gameId));
        } catch (e) {
            alert("삭제 실패");
        }
    };

    const submitRename = async () => {
        if (!targetGame) return;
        try {
            await updateGameInfo(targetGame.gameId, newName);
            setMyGames(prev => prev.map(g => g.gameId === targetGame.gameId ? { ...g, title: newName } : g));
            setRenameModalOpen(false);
            setTargetGame(null);
        } catch (e) {
            alert("이름 변경 실패");
        }
    };

    // --- Pagination Logic ---
    const totalPages = Math.ceil(myGames.length / ITEMS_PER_PAGE) || 1;
    const currentGames = myGames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-white flex flex-col">
            <TopBar title="Projects" showLogo={true} actionButtons={
                <div className="flex gap-2">
                    {isSelectionMode ? (
                        <>
                            <button
                                onClick={toggleSelectionMode}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                disabled={selectedGameIds.size === 0}
                                className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${selectedGameIds.size > 0
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-gray-600 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                <i className="fa-solid fa-trash mr-2"></i>
                                Delete ({selectedGameIds.size})
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={toggleSelectionMode}
                                className="px-4 py-2 bg-[#333] hover:bg-[#444] rounded-lg text-white text-sm font-medium transition-colors border border-[#444]"
                            >
                                <i className="fa-solid fa-check-square mr-2"></i> Select
                            </button>
                            <button
                                onClick={handleCreateGame}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-semibold transition-colors"
                            >
                                <i className="fa-solid fa-plus"></i> New Project
                            </button>
                        </>
                    )}
                </div>
            } />

            <div className="flex-1 p-8 max-w-[1600px] mx-auto w-full flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-500"></i>
                    </div>
                ) : myGames.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
                            {currentGames.map(game => (
                                <div
                                    key={game.gameId}
                                    onClick={() => isSelectionMode ? toggleGameSelection(game.gameId) : navigate(`/editor/${game.gameId}`)}
                                    className={`
                                        group relative bg-[#2a2a2a] rounded-lg border transition-all cursor-pointer overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl
                                        ${isSelectionMode && selectedGameIds.has(game.gameId)
                                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                                            : 'border-[#333] hover:border-blue-500'
                                        }
                                    `}
                                >
                                    {/* Selection Checkbox Overlay */}
                                    {isSelectionMode && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${selectedGameIds.has(game.gameId)
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'bg-black/50 border-gray-400 hover:border-white'
                                                }`}>
                                                {selectedGameIds.has(game.gameId) && <i className="fa-solid fa-check text-white text-xs"></i>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Thumbnail (16:9) */}
                                    <div className="aspect-video bg-[#111] relative border-b border-[#333]">
                                        {game.thumbnailUrl ? (
                                            <img src={getCloudFrontUrl(game.thumbnailUrl)} alt={game.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                <i className="fa-solid fa-image text-4xl"></i>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0 pr-2">
                                                <h3 className="text-sm font-bold text-gray-100 truncate mb-1" title={game.title}>{game.title}</h3>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {new Date(game.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>

                                            {/* Context Menu Trigger (Only in Normal Mode) */}
                                            {!isSelectionMode && (
                                                <div className="relative">
                                                    <button
                                                        className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenuId(activeMenuId === game.gameId ? null : game.gameId);
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-ellipsis-vertical"></i>
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {activeMenuId === game.gameId && (
                                                        <div className="absolute right-0 top-6 w-32 bg-[#333] border border-[#444] rounded shadow-xl z-50 py-1 flex flex-col text-xs">
                                                            <button
                                                                onClick={(e) => handleRenameClick(game, e)}
                                                                className="text-left px-3 py-2 hover:bg-blue-600 text-gray-200"
                                                            >
                                                                <i className="fa-solid fa-pen mr-2"></i> Rename
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteClick(game.gameId, e)}
                                                                className="text-left px-3 py-2 hover:bg-red-600 text-red-400 hover:text-white"
                                                            >
                                                                <i className="fa-solid fa-trash mr-2"></i> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-auto pb-8">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded bg-[#333] hover:bg-[#444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <i className="fa-solid fa-chevron-left"></i>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-8 h-8 rounded flex items-center justify-center font-medium transition-colors ${currentPage === page
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-[#333] hover:bg-[#444] text-gray-300'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded bg-[#333] hover:bg-[#444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <i className="fa-solid fa-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="inline-block p-6 rounded-full bg-[#2a2a2a] mb-4">
                            <i className="fa-solid fa-folder-open text-4xl text-gray-600"></i>
                        </div>
                        <h2 className="text-xl font-bold text-gray-300">No Projects Found</h2>
                        <p className="text-gray-500 mt-2 mb-6">Create your first project to get started.</p>
                        <button
                            onClick={handleCreateGame}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                        >
                            Create Project
                        </button>
                    </div>
                )}
            </div>

            {/* Rename Modal */}
            {renameModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={() => setRenameModalOpen(false)}>
                    <div className="bg-[#2a2a2a] w-80 rounded-lg p-5 border border-[#444] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Rename Project</h3>
                        <input
                            autoFocus
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && submitRename()}
                            className="w-full bg-[#1e1e1e] border border-[#444] rounded p-2 text-white mb-4 focus:border-blue-500 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setRenameModalOpen(false)}
                                className="px-3 py-1.5 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRename}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
