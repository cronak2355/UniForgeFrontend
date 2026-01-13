import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createGame } from '../services/gameService';
import TopBar from '../components/common/TopBar';

const MainPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

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
                    <button
                        onClick={handleCreateGame}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors text-sm"
                    >
                        <i className="fa-solid fa-plus"></i>
                        새 프로젝트
                    </button>
                }
            />

            <main className="flex-1 p-8 lg:p-12 max-w-[1400px] mx-auto w-full">
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
                            <button className="text-xs text-gray-500 hover:text-white transition-colors">
                                View All
                            </button>
                        </div>
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
