import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../services/gameService';
import { useState, useEffect } from 'react';

const TITLE_WORDS = ['나만의', '간단히', '혼자서', '가볍게'];

const MainPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [titleWord, setTitleWord] = useState('나만의');

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % TITLE_WORDS.length;
            setTitleWord(TITLE_WORDS[index]);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const handleCreateGame = async () => {
        try {
            const authorId = user?.id || "1";
            const newGame = await createGame(authorId, "Untitled Game", "New Project");
            navigate(`/editor/${newGame.gameId}`);
        } catch (e) {
            console.error(e);
            // 백엔드 연결 실패 시 에디터로 바로 이동
            navigate('/editor');
        }
    };

    return (
        <div className="min-h-screen p-8">
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    안녕하세요, <span className="text-blue-500">{user?.name || 'User'}</span>님 👋
                </h1>
                <p className="text-gray-500">무엇을 만들어볼까요?</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {/* Create Game */}
                <button
                    onClick={handleCreateGame}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-left hover:from-blue-500 hover:to-blue-600 transition-all group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <i className="fa-solid fa-gamepad text-2xl text-white"></i>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">새 게임 만들기</h3>
                            <p className="text-blue-200 text-sm">빈 캔버스에서 시작</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm group-hover:text-white transition-colors">
                        <span>에디터 열기</span>
                        <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </div>
                </button>

                {/* Asset Editor */}
                <button
                    onClick={() => navigate('/assets-editor')}
                    className="bg-[#131517] border border-white/10 p-6 rounded-2xl text-left hover:border-white/20 hover:bg-[#1a1d21] transition-all group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                            <i className="fa-solid fa-puzzle-piece text-2xl text-purple-400"></i>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">에셋 에디터</h3>
                            <p className="text-gray-500 text-sm">나만의 에셋 제작</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm group-hover:text-white transition-colors">
                        <span>에디터 열기</span>
                        <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </div>
                </button>

                {/* Browse Games */}
                <button
                    onClick={() => navigate('/explore')}
                    className="bg-[#131517] border border-white/10 p-6 rounded-2xl text-left hover:border-white/20 hover:bg-[#1a1d21] transition-all group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                            <i className="fa-solid fa-compass text-2xl text-green-400"></i>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">게임 탐색</h3>
                            <p className="text-gray-500 text-sm">다른 작품 구경하기</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm group-hover:text-white transition-colors">
                        <span>둘러보기</span>
                        <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </div>
                </button>
            </div>

            {/* My Projects */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <i className="fa-solid fa-folder text-blue-500"></i>
                        내 프로젝트
                    </h2>
                </div>
                <div className="bg-[#131517] border border-dashed border-white/10 rounded-2xl p-10 text-center">
                    <i className="fa-solid fa-folder-open text-4xl text-gray-600 mb-4"></i>
                    <h3 className="text-gray-400 font-medium mb-2">아직 프로젝트가 없습니다</h3>
                    <p className="text-gray-600 text-sm mb-4">첫 번째 게임을 만들어보세요!</p>
                    <button
                        onClick={handleCreateGame}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
                    >
                        <i className="fa-solid fa-plus mr-2"></i>
                        새 프로젝트
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-clock text-gray-500"></i>
                    최근 활동
                </h2>
                <div className="bg-[#131517] border border-white/5 rounded-2xl p-6 text-center">
                    <p className="text-gray-500 text-sm">최근 활동이 없습니다</p>
                </div>
            </div>
        </div>
    );
};

export default MainPage;
