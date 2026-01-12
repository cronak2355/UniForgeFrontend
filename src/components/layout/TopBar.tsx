import { memo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const TopBar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="h-16 bg-[#0f0f0f] border-b border-white/5 flex items-center justify-between px-6">
            {/* Search */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                    <input
                        type="text"
                        placeholder="검색..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </div>

            {/* User */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-10 h-10 rounded-full bg-[#1a1a1a] border-2 border-white/10 hover:border-white/30 transition-colors flex items-center justify-center overflow-hidden"
                >
                    {user?.profileImage ? (
                        <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <i className="fa-solid fa-user text-gray-500"></i>
                    )}
                </button>

                {showDropdown && (
                    <div className="absolute right-0 top-12 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                        {/* User Info */}
                        <div className="p-4 border-b border-white/10">
                            <div className="font-medium text-white text-sm">{user?.name || 'User'}</div>
                            <div className="text-gray-500 text-xs mt-1">{user?.email}</div>
                        </div>

                        {/* Menu Items */}
                        <button
                            onClick={() => { setShowDropdown(false); navigate('/library'); }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-3"
                        >
                            <i className="fa-solid fa-book text-gray-500"></i>
                            라이브러리
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 transition-colors flex items-center gap-3"
                        >
                            <i className="fa-solid fa-sign-out-alt text-red-400"></i>
                            로그아웃
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default memo(TopBar);
