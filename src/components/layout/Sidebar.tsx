import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
    icon: string;
    label: string;
    path: string;
}

const NAV_ITEMS: NavItem[] = [
    { icon: 'fa-solid fa-house', label: '홈', path: '/main' },
    { icon: 'fa-solid fa-compass', label: '게임', path: '/explore' },
    { icon: 'fa-solid fa-store', label: '에셋', path: '/marketplace' },
    { icon: 'fa-solid fa-layer-group', label: '라이브러리', path: '/library/assets' },
];

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <aside className="fixed left-0 top-0 h-screen w-[72px] bg-[#0f0f0f] border-r border-white/5 flex flex-col items-center py-4 z-50">
            {/* Navigation Icons */}
            <nav className="flex-1 flex flex-col items-center gap-2 mt-4">
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`
                                w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
                                ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-500 hover:bg-white/10 hover:text-white'}
                            `}
                            title={item.label}
                        >
                            <i className={`${item.icon} text-lg`}></i>
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Section - Settings/User */}
            <div className="flex flex-col items-center gap-2 mb-2">
                <button
                    onClick={() => navigate('/create-asset')}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-500 hover:bg-white/10 hover:text-white transition-all"
                    title="에셋 만들기"
                >
                    <i className="fa-solid fa-plus text-lg"></i>
                </button>
            </div>
        </aside>
    );
};

export default memo(Sidebar);
