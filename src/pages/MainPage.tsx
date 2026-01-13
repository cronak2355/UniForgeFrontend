import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../services/gameService';

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
        <div className="min-h-screen p-6 lg:p-10">
            {/* Welcome Section */}
            <div className="mb-10">
                <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Welcome back</p>
                <h1 className="text-2xl lg:text-3xl font-semibold text-white">
                    {user?.name || 'User'}
                </h1>
            </div>

            {/* Quick Actions */}
            <div className="mb-12">
                <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Create Game */}
                    <button
                        onClick={handleCreateGame}
                        className="group relative bg-gradient-to-br from-blue-600/90 to-blue-700/90 p-5 rounded-xl text-left overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/20 hover:scale-[1.02]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                                <i className="fa-solid fa-plus text-lg text-white"></i>
                            </div>
                            <h3 className="text-white font-medium mb-1">새 게임</h3>
                            <p className="text-blue-100/70 text-sm">빈 프로젝트 시작</p>
                        </div>
                        <i className="fa-solid fa-arrow-right absolute bottom-5 right-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all duration-300"></i>
                    </button>

                    {/* Asset Editor */}
                    <button
                        onClick={() => navigate('/assets-editor')}
                        className="group relative bg-[#111214] border border-white/5 p-5 rounded-xl text-left overflow-hidden transition-all duration-300 hover:border-purple-500/30 hover:bg-[#141618] hover:scale-[1.02]"
                    >
                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors duration-300">
                            <i className="fa-solid fa-shapes text-lg text-purple-400"></i>
                        </div>
                        <h3 className="text-white font-medium mb-1">에셋 에디터</h3>
                        <p className="text-gray-500 text-sm">커스텀 에셋 제작</p>
                        <i className="fa-solid fa-arrow-right absolute bottom-5 right-5 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300"></i>
                    </button>

                    {/* Explore */}
                    <button
                        onClick={() => navigate('/explore')}
                        className="group relative bg-[#111214] border border-white/5 p-5 rounded-xl text-left overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:bg-[#141618] hover:scale-[1.02]"
                    >
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors duration-300">
                            <i className="fa-solid fa-compass text-lg text-emerald-400"></i>
                        </div>
                        <h3 className="text-white font-medium mb-1">탐색</h3>
                        <p className="text-gray-500 text-sm">커뮤니티 작품 둘러보기</p>
                        <i className="fa-solid fa-arrow-right absolute bottom-5 right-5 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-300"></i>
                    </button>
                </div>
            </div>

            {/* Projects Section */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs text-gray-500 uppercase tracking-widest">My Projects</h2>
                    <button className="text-xs text-gray-500 hover:text-white transition-colors">
                        View All
                    </button>
                </div>
                <div className="bg-[#111214] border border-white/5 rounded-xl p-8 text-center">
                    <div className="w-12 h-12 bg-gray-800/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-folder text-xl text-gray-600"></i>
                    </div>
                    <p className="text-gray-400 text-sm mb-1">프로젝트가 없습니다</p>
                    <p className="text-gray-600 text-xs mb-5">새로운 프로젝트를 만들어보세요</p>
                    <button
                        onClick={handleCreateGame}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm rounded-lg transition-colors"
                    >
                        <i className="fa-solid fa-plus text-xs"></i>
                        새 프로젝트
                    </button>
                </div>
            </div>

            {/* Activity Section */}
            <div>
                <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Recent Activity</h2>
                <div className="bg-[#111214] border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 text-gray-500">
                        <i className="fa-regular fa-clock text-sm"></i>
                        <p className="text-sm">활동 내역이 없습니다</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainPage;
