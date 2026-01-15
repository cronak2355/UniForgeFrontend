import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createGame, fetchMyGames, type GameSummary } from '../services/gameService';
import TopBar from '../components/common/TopBar';
import { getCloudFrontUrl } from '../utils/imageUtils';

const MainPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myGames, setMyGames] = useState<GameSummary[]>([]);
    const [loadingGames, setLoadingGames] = useState(true);

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Long Press Handlers
    const handleMouseDown = (gameId: string) => {
        if (isSelectionMode) return;
        longPressTimer.current = setTimeout(() => {
            setIsSelectionMode(true);
            setSelectedGameIds(new Set([gameId]));
        }, 800); // 0.8s hold
    };

    const handleMouseUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const toggleSelection = (gameId: string) => {
        const newSet = new Set(selectedGameIds);
        if (newSet.has(gameId)) {
            newSet.delete(gameId);
            if (newSet.size === 0) setIsSelectionMode(false);
        } else {
            newSet.add(gameId);
        }
        setSelectedGameIds(newSet);
    };

    const handleCardClick = (gameId: string) => {
        if (isSelectionMode) {
            toggleSelection(gameId);
        } else {
            navigate(`/editor/${gameId}`);
        }
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`선택한 ${selectedGameIds.size}개의 프로젝트를 삭제하시겠습니까?`)) return;
        try {
            const { deleteGame } = await import('../services/gameService');
            await Promise.all(Array.from(selectedGameIds).map(id => deleteGame(id)));
            setMyGames(prev => prev.filter(g => !selectedGameIds.has(g.gameId)));
            setIsSelectionMode(false);
            setSelectedGameIds(new Set());
        } catch (e) {
            console.error(e);
            alert("삭제 실패");
        }
    };

    useEffect(() => {
        if (user?.id) {
            loadMyGames();
        } else {
            setLoadingGames(false);
        }
    }, [user?.id]);

    const loadMyGames = async () => {
        try {
            if (!user?.id) return;
            setLoadingGames(true);
            const games = await fetchMyGames(user.id);
            setMyGames(Array.isArray(games) ? games : []);
        } catch (error) {
            console.error("Failed to load games:", error);
        } finally {
            setLoadingGames(false);
        }
    };

    const handleCreateGame = async () => {
        try {
            const authorId = user?.id || "1";
            const newGame = await createGame(authorId, "Untitled Game", "New Project");
            navigate(`/editor/${newGame.gameId}`);
        } catch (e) {
            console.error(e);
            navigate('/editor');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col">
            <TopBar
                title="대시보드"
                showLogo={false}
                actionButtons={
                    isSelectionMode ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setIsSelectionMode(false); setSelectedGameIds(new Set()); }}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                            >
                                삭제 ({selectedGameIds.size})
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleCreateGame}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors text-sm"
                        >
                            <i className="fa-solid fa-plus"></i>
                            새 프로젝트
                        </button>
                    )
                }
            />

            <main className="flex-1 p-8 lg:p-12 max-w-[1400px] mx-auto w-full" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchEnd={handleMouseUp}>
                {/* Welcome Section */}
                <div className="mb-12">
                    <p className="text-sm text-gray-500 uppercase tracking-widest mb-2 font-medium">Welcome back</p>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                        {user?.name || 'User'}님, 안녕하세요
                    </h1>
                </div>

                {/* Quick Actions */}
                <div className="mb-16">
                    <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-6 font-semibold">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Create Game */}
                        <button
                            onClick={handleCreateGame}
                            className="group relative bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-left overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-1"
                        >
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-auto">
                                    <i className="fa-solid fa-plus text-xl text-white"></i>
                                </div>
                                <div>
                                    <h3 className="text-white text-lg font-bold mb-1">새 게임</h3>
                                    <p className="text-blue-100/80 text-sm">빈 프로젝트 시작</p>
                                </div>
                            </div>
                            <div className="absolute right-0 bottom-0 p-32 bg-blue-500/20 blur-3xl rounded-full translate-x-10 translate-y-10 group-hover:bg-blue-400/30 transition-colors"></div>
                        </button>

                        {/* Asset Editor */}
                        <button
                            onClick={() => navigate('/assets-editor')}
                            className="group relative bg-[#111] border border-[#222] p-6 rounded-2xl text-left overflow-hidden transition-all duration-300 hover:border-purple-500/50 hover:bg-[#161616] hover:-translate-y-1"
                        >
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-auto group-hover:bg-purple-500/20 transition-colors">
                                    <i className="fa-solid fa-shapes text-xl text-purple-400"></i>
                                </div>
                                <div>
                                    <h3 className="text-white text-lg font-bold mb-1">에셋 에디터</h3>
                                    <p className="text-gray-500 text-sm group-hover:text-gray-400">커스텀 에셋 제작</p>
                                </div>
                            </div>
                        </button>

                        {/* Explore */}
                        <button
                            onClick={() => navigate('/explore')}
                            className="group relative bg-[#111] border border-[#222] p-6 rounded-2xl text-left overflow-hidden transition-all duration-300 hover:border-emerald-500/50 hover:bg-[#161616] hover:-translate-y-1"
                        >
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-auto group-hover:bg-emerald-500/20 transition-colors">
                                    <i className="fa-solid fa-compass text-xl text-emerald-400"></i>
                                </div>
                                <div>
                                    <h3 className="text-white text-lg font-bold mb-1">탐색</h3>
                                    <p className="text-gray-500 text-sm group-hover:text-gray-400">커뮤니티 작품 둘러보기</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Projects Section */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xs text-gray-500 uppercase tracking-widest font-semibold">My Projects</h2>
                            <button
                                onClick={() => navigate('/projects')}
                                className="text-xs text-gray-500 hover:text-white transition-colors"
                            >
                                View All
                            </button>
                        </div>

                        {loadingGames ? (
                            <div className="bg-[#111] border border-[#222] rounded-2xl p-10 text-center flex items-center justify-center min-h-[240px]">
                                <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-600"></i>
                            </div>
                        ) : myGames.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {myGames.slice(0, 3).map((game) => (
                                    <div
                                        key={game.gameId}
                                        onClick={() => handleCardClick(game.gameId)}
                                        onMouseDown={() => handleMouseDown(game.gameId)}
                                        onTouchStart={() => handleMouseDown(game.gameId)}
                                        className={`
                                            bg-[#111] border rounded-xl p-4 flex items-center gap-4 transition-all cursor-pointer group select-none relative
                                            ${isSelectionMode && selectedGameIds.has(game.gameId) ? 'border-blue-500 bg-blue-900/20' : 'border-[#222] hover:bg-[#1a1a1a] hover:border-[#333]'}
                                        `}
                                    >
                                        {isSelectionMode && (
                                            <div className="absolute top-4 right-4 z-10">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedGameIds.has(game.gameId) ? 'border-blue-500 bg-blue-500' : 'border-gray-500 bg-transparent'}`}>
                                                    {selectedGameIds.has(game.gameId) && <i className="fa-solid fa-check text-white text-xs"></i>}
                                                </div>
                                            </div>
                                        )}
                                        <div className="w-16 h-16 bg-[#222] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {game.thumbnailUrl ? (
                                                <img src={getCloudFrontUrl(game.thumbnailUrl)} alt={game.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <i className="fa-solid fa-gamepad text-gray-600 text-xl"></i>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium mb-1 truncate group-hover:text-blue-400 transition-colors">{game.title}</h3>
                                            <p className="text-gray-500 text-sm truncate">{game.description || 'No description'}</p>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {new Date(game.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                                {myGames.length > 3 && (
                                    <button className="w-full py-3 text-sm text-gray-500 hover:text-white bg-[#111] border border-[#222] rounded-xl hover:bg-[#1a1a1a] transition-colors">
                                        View All ({myGames.length} projects)
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[#111] border border-[#222] rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[240px]">
                                <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-6">
                                    <i className="fa-solid fa-folder-open text-2xl text-gray-700"></i>
                                </div>
                                <h3 className="text-white font-medium mb-2">프로젝트가 없습니다</h3>
                                <p className="text-gray-500 text-sm mb-6">새로운 아이디어를 실현해보세요</p>
                                <button
                                    onClick={handleCreateGame}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#222] hover:bg-[#333] text-white text-sm font-medium rounded-lg transition-colors border border-[#333]"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                    프로젝트 생성
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Activity Section */}
                    <div>
                        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-6 font-semibold">Recent Activity</h2>
                        <div className="bg-[#111] border border-[#222] rounded-2xl p-8 min-h-[240px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-gray-600">
                                <i className="fa-regular fa-clock text-2xl mb-2 opacity-50"></i>
                                <p className="text-sm">최근 활동 내역이 없습니다</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MainPage;
