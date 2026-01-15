
import { useState, useEffect, useRef } from 'react';
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

    // Menu / Modal State
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
            // Option A: Navigate directly
            navigate(`/editor/${newGame.gameId}`);
            // Option B: Refresh list (if we want to stay)
            // loadGames();
        } catch (e) {
            alert("프로젝트 생성 실패");
        }
    };

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

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-white flex flex-col">
            <TopBar title="Projects" showLogo={true} actionButtons={
                <button
                    onClick={handleCreateGame}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-semibold transition-colors"
                >
                    <i className="fa-solid fa-plus"></i> New Project
                </button>
            } />

            <div className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-500"></i>
                    </div>
                ) : myGames.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {myGames.map(game => (
                            <div
                                key={game.gameId}
                                onClick={() => navigate(`/editor/${game.gameId}`)}
                                className="group relative bg-[#2a2a2a] rounded-lg border border-[#333] hover:border-blue-500 transition-all cursor-pointer overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1"
                            >
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

                                        {/* Context Menu Trigger */}
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
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
