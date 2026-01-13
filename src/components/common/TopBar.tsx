import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface TopBarProps {
    title: string;
    icon?: string;
    onSearch?: (term: string) => void;
    placeholder?: string;
    searchValue?: string;
    actionButtons?: React.ReactNode;
    showLogo?: boolean;
    showTabs?: React.ReactNode;
}

const TopBar = ({
    title,
    icon,
    onSearch,
    placeholder = "Search...",
    searchValue = "",
    actionButtons,
    showLogo = false,
    showTabs
}: TopBarProps) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
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
        <header className="sticky top-0 z-[100] flex items-center justify-between px-8 py-4 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#1a1a1a]">
            <div className="flex items-center gap-12">
                {/* Logo or Title Area */}
                <div
                    className="flex items-center cursor-pointer group"
                    onClick={() => navigate('/main')}
                >
                    {showLogo && (
                        <img src="/logo.png" alt="Uniforge" className="h-7 mr-2.5" />
                    )}
                    {icon && <i className={`${icon} mr-2.5 text-[#666] group-hover:text-white transition-colors`}></i>}
                    {!showLogo && <span className="text-sm text-[#666] font-normal group-hover:text-white transition-colors">{title}</span>}
                    {showLogo && <span className="text-sm text-[#666] font-normal group-hover:text-white transition-colors">{title}</span>}
                </div>

                {/* Tabs (Optional) */}
                {showTabs && (
                    <div className="flex gap-2">
                        {showTabs}
                    </div>
                )}

                {/* Search Bar */}
                {onSearch && (
                    <div className="relative w-[400px]">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#666]"></i>
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={searchValue}
                            onChange={(e) => onSearch(e.target.value)}
                            className="w-full bg-[#111] border border-[#333] rounded-lg py-2.5 pl-10 pr-2.5 text-white text-[0.95rem] outline-none focus:border-blue-600 transition-colors"
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Custom Action Buttons */}
                {actionButtons}

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-9 h-9 rounded-full border border-[#333] bg-[#1a1a1a] cursor-pointer overflow-hidden hover:border-blue-500/50 transition-colors"
                    >
                        {user?.profileImage ? (
                            <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#666]">
                                <i className="fa-solid fa-user"></i>
                            </div>
                        )}
                    </button>

                    {showDropdown && (
                        <div className="absolute top-12 right-0 bg-[#1a1a1a] border border-[#333] rounded-lg min-w-[200px] shadow-2xl overflow-hidden z-[1000]">
                            <div className="p-4 border-b border-[#333]">
                                <div className="text-sm font-semibold text-white">{user?.name || 'User'}</div>
                                <div className="text-xs text-[#888]">{user?.email || 'guest@example.com'}</div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-3 bg-transparent border-none text-red-500 text-left hover:bg-white/5 transition-colors cursor-pointer text-sm"
                            >
                                로그아웃
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;
