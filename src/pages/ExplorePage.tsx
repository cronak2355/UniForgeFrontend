import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchPublicGames, GameSummary } from '../services/gameService';
import { getCloudFrontUrl } from '../utils/imageUtils';
import { PublishGameModal } from '../components/games/PublishGameModal';

const ExplorePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [selectedCategory, setSelectedCategory] = useState("전체");

    // Data State
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedGame, setSelectedGame] = useState<any>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = (selectedGame || isPublishModalOpen) ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; }
    }, [selectedGame, isPublishModalOpen]);

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

    // Fetch Games
    useEffect(() => {
        loadGames();
    }, []);

    const loadGames = async () => {
        setLoading(true);
        try {
            const publicGames = await fetchPublicGames();

            // Map to UI format
            // TODO: Fetch User Names
            const uiGames = publicGames.map(g => ({
                id: g.gameId,
                title: g.title,
                description: g.description,
                author: "Unknown", // TODO: Fetch from authorId
                authorId: g.authorId,
                image: getCloudFrontUrl(g.thumbnailUrl) || "",
                likes: 0,
                players: "0",
                type: "기타", // Default genre
                createdAt: g.createdAt
            }));

            // Fetch authors (Simple implementation)
            const authorIds = [...new Set(uiGames.map(g => g.authorId))];
            const authorMap = new Map<string, string>();

            // We can load authors in parallel if userService is available
            // For now, let's try to import it dynamically or just leave as Unknown/ID
            try {
                const { userService } = await import('../services/userService');
                await Promise.all(authorIds.map(async (id) => {
                    try {
                        const u = await userService.getUserById(id);
                        if (u) authorMap.set(id, u.name);
                    } catch (e) { }
                }));
            } catch (e) { console.error("UserService import failed", e); }

            const finalGames = uiGames.map(g => ({
                ...g,
                author: authorMap.get(g.authorId) || "User-" + g.authorId.substring(0, 6)
            }));

            setGames(finalGames);

        } catch (e) {
            console.error("Failed to fetch public games", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const CATEGORIES = [
        { id: "전체", icon: "fa-solid fa-gamepad" },
        { id: "인기", icon: "fa-solid fa-fire" },
        { id: "신규", icon: "fa-solid fa-sparkles" },
        { type: "divider" },
        // ... (rest of categories, maybe simplify if we don't have genre data yet)
        { id: "액션", icon: "fa-solid fa-khanda" },
        { id: "RPG", icon: "fa-solid fa-shield-halved" },
        { id: "전략", icon: "fa-solid fa-chess" },
        { id: "아케이드", icon: "fa-solid fa-ghost" },
        { id: "시뮬레이션", icon: "fa-solid fa-city" },
        { id: "스포츠", icon: "fa-solid fa-futbol" },
        { id: "공포", icon: "fa-solid fa-skull" }
    ];

    const filteredGames = games.filter(game => {
        if (selectedCategory === "전체") return true;
        // if (selectedCategory === "인기") return game.likes >= 1000;
        if (selectedCategory === "신규") return true; // Just show all for now
        return game.type === selectedCategory || selectedCategory === "기타";
    });

    return (
        <div style={{
            backgroundColor: 'black',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            overflowX: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                borderBottom: '1px solid #1a1a1a',
                backgroundColor: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                    <div
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => navigate('/main')}
                    >
                        <img src="/logo.png" alt="Uniforge" style={{ height: '28px', marginRight: '10px' }} />
                        <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 400 }}>게임 플레이스</span>
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: '400px' }}>
                        <i className="fa-solid fa-search" style={{
                            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666'
                        }}></i>
                        <input
                            type="text"
                            placeholder="게임 검색..."
                            style={{
                                width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px',
                                padding: '10px 10px 10px 40px', color: 'white', fontSize: '0.95rem', outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                            onBlur={(e) => e.target.style.borderColor = '#333'}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Add Game Button */}
                    <button
                        onClick={() => setIsPublishModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i> 게임 등록
                    </button>

                    <button onClick={() => navigate('/main')} style={{
                        background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
                        padding: '8px 16px', borderRadius: '6px', fontSize: '0.95rem'
                    }}
                        onMouseEnter={e => e.currentTarget.style.color = 'white'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888'}
                    >
                        홈으로
                    </button>

                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        {/* Profile Dropdown Trigger */}
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            style={{
                                width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #333',
                                backgroundColor: '#1a1a1a', cursor: 'pointer', padding: 0, overflow: 'hidden'
                            }}
                        >
                            {user?.profileImage ? (
                                <img src={user.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                                    <i className="fa-solid fa-user"></i>
                                </div>
                            )}
                        </button>
                        {showDropdown && (
                            <div style={{
                                position: 'absolute', top: '45px', right: 0, backgroundColor: '#1a1a1a', border: '1px solid #333',
                                borderRadius: '8px', minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden'
                            }}>
                                <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.name || 'User'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{user?.email || 'guest@uniforge.com'}</div>
                                </div>
                                <button onClick={handleLogout} style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer' }}>로그아웃</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
                {/* Sidebar - Keep as is */}
                <aside style={{
                    width: '240px', padding: '2rem 1rem', borderRight: '1px solid #1a1a1a',
                    position: 'sticky', top: '73px', height: 'calc(100vh - 73px)', overflowY: 'auto'
                }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {CATEGORIES.map((cat, index) => (
                            cat.type === 'divider' ? (
                                <div key={index} style={{ height: '1px', backgroundColor: '#222', margin: '10px 0' }}></div>
                            ) : (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id!)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                                        backgroundColor: selectedCategory === cat.id ? '#1a1a1a' : 'transparent',
                                        border: '1px solid', borderColor: selectedCategory === cat.id ? '#333' : 'transparent',
                                        borderRadius: '8px', color: selectedCategory === cat.id ? 'white' : '#888',
                                        fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%'
                                    }}
                                    onMouseEnter={e => {
                                        if (selectedCategory !== cat.id) {
                                            e.currentTarget.style.backgroundColor = '#111';
                                            e.currentTarget.style.color = '#ccc';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (selectedCategory !== cat.id) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = '#888';
                                        }
                                    }}
                                >
                                    <i className={cat.icon} style={{ width: '20px', textAlign: 'center' }}></i>
                                    <span>{cat.id}</span>
                                </button>
                            )
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main style={{ flex: 1, padding: '2rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{selectedCategory} 게임</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="sort-btn" style={{ padding: '6px 12px', borderRadius: '4px', background: '#111', border: '1px solid #333', color: '#888', cursor: 'pointer' }}>인기순</button>
                            <button className="sort-btn" style={{ padding: '6px 12px', borderRadius: '4px', background: 'transparent', border: '1px solid transparent', color: '#666', cursor: 'pointer' }}>최신순</button>
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-600"></i>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '24px'
                        }}>
                            {filteredGames.length > 0 ? filteredGames.map((game, index) => (
                                <div
                                    key={index}
                                    style={{
                                        backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #222',
                                        overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', position: 'relative'
                                    }}
                                    onClick={() => setSelectedGame(game)}
                                    // ... Hover styles done via CSS or Inline events
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.borderColor = '#444';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.borderColor = '#222';
                                    }}
                                >
                                    {/* Thumbnail rendering logic */}
                                    <div style={{ height: '160px', overflow: 'hidden', position: 'relative', backgroundColor: '#111' }}>
                                        {game.image ? (
                                            <img
                                                src={game.image}
                                                alt={game.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    if (e.currentTarget.parentElement) {
                                                        const placeholder = document.createElement('div');
                                                        placeholder.style.width = '100%';
                                                        placeholder.style.height = '100%';
                                                        placeholder.style.display = 'flex';
                                                        placeholder.style.alignItems = 'center';
                                                        placeholder.style.justifyContent = 'center';
                                                        placeholder.style.color = '#444';
                                                        placeholder.innerHTML = '<i class="fa-solid fa-gamepad" style="font-size: 2rem;"></i>';
                                                        e.currentTarget.parentElement.appendChild(placeholder);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                                                <i className="fa-solid fa-gamepad" style={{ fontSize: '2rem' }}></i>
                                            </div>
                                        )}

                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '40px 16px 16px',
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                                        }}>
                                            <span style={{
                                                backgroundColor: 'rgba(37, 99, 235, 0.8)', color: 'white', padding: '2px 8px', borderRadius: '4px',
                                                fontSize: '0.7rem', fontWeight: 600, backdropFilter: 'blur(4px)', display: 'inline-block'
                                            }}>
                                                {game.type}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '16px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', margin: '0 0 8px 0' }}>{game.title}</h3>
                                        <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 16px 0' }}>By {game.author}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#666' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <i className="fa-solid fa-users"></i>
                                                <span>{game.players} 플레이</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
                                                <i className="fa-solid fa-heart"></i>
                                                <span>{game.likes}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-[#666] text-center col-span-full py-10">
                                    등록된 게임이 없습니다.
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Game Detail Modal */}
            {selectedGame && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '2rem'
                }} onClick={() => setSelectedGame(null)}>
                    <div style={{
                        backgroundColor: '#111', border: '1px solid #333', borderRadius: '16px', width: '100%', maxWidth: '1000px', height: '85vh',
                        display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>

                        <button onClick={() => setSelectedGame(null)} style={{
                            position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white',
                            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>

                        <div style={{ height: '300px', position: 'relative', backgroundColor: '#000' }}>
                            {selectedGame.image ? (
                                <img
                                    src={selectedGame.image}
                                    alt={selectedGame.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.parentElement) {
                                            const placeholder = document.createElement('div');
                                            placeholder.style.width = '100%';
                                            placeholder.style.height = '100%';
                                            placeholder.style.display = 'flex';
                                            placeholder.style.alignItems = 'center';
                                            placeholder.style.justifyContent = 'center';
                                            placeholder.style.color = '#444';
                                            placeholder.innerHTML = '<i class="fa-solid fa-gamepad" style="font-size: 4rem;"></i>';
                                            e.currentTarget.parentElement.appendChild(placeholder);
                                        }
                                    }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                                    <i className="fa-solid fa-gamepad" style={{ fontSize: '4rem' }}></i>
                                </div>
                            )}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '2rem', background: 'linear-gradient(to top, #111, transparent)' }}>
                                <span style={{ backgroundColor: '#2563eb', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', display: 'inline-block' }}>{selectedGame.type}</span>
                                <h2 style={{ fontSize: '3rem', fontWeight: 700, margin: '8px 0 4px' }}>{selectedGame.title}</h2>
                                <p style={{ color: '#ccc', fontSize: '1.1rem' }}>By {selectedGame.author} • {selectedGame.players} 플레이</p>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                                        <button style={{
                                            flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '16px', borderRadius: '8px',
                                            fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }} onClick={() => navigate(`/editor/${selectedGame.id}`)}>
                                            <i className="fa-solid fa-play"></i> 플레이
                                        </button>
                                        <button style={{ padding: '16px 24px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fa-solid fa-heart" style={{ color: '#ef4444' }}></i> {selectedGame.likes}
                                        </button>
                                    </div>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderLeft: '4px solid #2563eb', paddingLeft: '12px' }}>게임 설명</h3>
                                        <p style={{ lineHeight: '1.6', color: '#ccc', whiteSpace: 'pre-wrap' }}>{selectedGame.description || "설명이 없습니다."}</p>
                                    </div>
                                </div>
                                <div style={{ borderLeft: '1px solid #333', paddingLeft: '2rem' }}>
                                    {/* Ranking / Comments placeholders */}
                                    <p className="text-gray-500">댓글 기능 준비 중...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Modal */}
            <PublishGameModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                onPublish={(updatedGame) => {
                    loadGames(); // Refresh list
                    // maybe show success toast
                }}
            />
        </div>
    );
};

export default ExplorePage;
