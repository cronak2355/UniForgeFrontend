import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ExplorePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [selectedCategory, setSelectedCategory] = useState("전체");

    // Game Modal State
    const [selectedGame, setSelectedGame] = useState<any>(null);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (selectedGame) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        }
    }, [selectedGame]);


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

    const CATEGORIES = [
        { id: "전체", icon: "fa-solid fa-gamepad" },
        { id: "인기", icon: "fa-solid fa-fire" },
        { id: "신규", icon: "fa-solid fa-sparkles" },
        { type: "divider" },
        { id: "액션", icon: "fa-solid fa-khanda" },
        { id: "RPG", icon: "fa-solid fa-shield-halved" },
        { id: "전략", icon: "fa-solid fa-chess" },
        { id: "아케이드", icon: "fa-solid fa-ghost" },
        { id: "시뮬레이션", icon: "fa-solid fa-city" },
        { id: "스포츠", icon: "fa-solid fa-futbol" },
        { id: "공포", icon: "fa-solid fa-skull" }
    ];

    const GAMES = [
        // 액션 (Action)
        { title: "Neon Racer 2077", author: "CyberDev", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400", likes: 1250, players: "5.2k", type: "액션" },
        { title: "Pixel Dungeon", author: "RetroKing", image: "https://images.unsplash.com/photo-1614726365723-49cfae96ac6d?auto=format&fit=crop&q=80&w=400", likes: 1540, players: "3.5k", type: "액션" },
        { title: "Shadow Ninja", author: "DarkBlade", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400", likes: 670, players: "800+", type: "액션" },
        { title: "Cyber Slasher", author: "FutureSoft", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400", likes: 920, players: "1.2k", type: "액션" },
        { title: "Gun Master", author: "ShooterPro", image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=400", likes: 450, players: "300+", type: "액션" },

        // RPG
        { title: "Mystic Forest RPG", author: "FantasyWorks", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400", likes: 890, players: "1.2k", type: "RPG" },
        { title: "Dragon Slayer", author: "MythicGames", image: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&q=80&w=400", likes: 2100, players: "5k+", type: "RPG" },
        { title: "Elden Quest", author: "SoulStudio", image: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&q=80&w=400", likes: 3200, players: "10k+", type: "RPG" },
        { title: "Pixel Tales", author: "BitStory", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400", likes: 540, players: "900+", type: "RPG" },
        { title: "Kingdom Hearts VR", author: "DisneyFan", image: "https://images.unsplash.com/photo-1627856013091-fdf74c725545?auto=format&fit=crop&q=80&w=400", likes: 1800, players: "3k+", type: "RPG" },

        // 전략 (Strategy)
        { title: "Space Commander", author: "StarLab", image: "https://images.unsplash.com/photo-1534237710431-e2fc698436d0?auto=format&fit=crop&q=80&w=400", likes: 2100, players: "10k+", type: "전략" },
        { title: "Tower Defense X", author: "StrategyPro", image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=400", likes: 1200, players: "4.5k", type: "전략" },
        { title: "Empire Builder", author: "CivMasters", image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=400", likes: 850, players: "2k+", type: "전략" },
        { title: "Chess Master 3000", author: "BoardKing", image: "https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&q=80&w=400", likes: 300, players: "100+", type: "전략" },
        { title: "Galaxy Wars", author: "SpaceDev", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=400", likes: 1500, players: "6k+", type: "전략" },

        // 아케이드 (Arcade)
        { title: "Block Breaker", author: "RetroFun", image: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&q=80&w=400", likes: 600, players: "1.5k", type: "아케이드" },
        { title: "Pac-Man 3D", author: "NamcoFan", image: "https://images.unsplash.com/photo-1505356822725-08ad25f3ffe4?auto=format&fit=crop&q=80&w=400", likes: 900, players: "2k+", type: "아케이드" },
        { title: "Pinball Wizard", author: "BallMaster", image: "https://images.unsplash.com/photo-1585507765055-e7cb2f283d02?auto=format&fit=crop&q=80&w=400", likes: 400, players: "500+", type: "아케이드" },
        { title: "Tetris Ultimate", author: "BlockLover", image: "https://images.unsplash.com/photo-1605347086577-706b21474ed7?auto=format&fit=crop&q=80&w=400", likes: 1100, players: "3k+", type: "아케이드" },
        { title: "Space Invaders Reborn", author: "Shooter88", image: "https://images.unsplash.com/photo-1563207153-f403bf289096?auto=format&fit=crop&q=80&w=400", likes: 750, players: "1k+", type: "아케이드" },

        // 시뮬레이션 (Simulation)
        { title: "City Skylines Mobile", author: "SimCityFan", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=400", likes: 1300, players: "4k", type: "시뮬레이션" },
        { title: "Farming Simulator 2025", author: "FarmLife", image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=400", likes: 800, players: "2.5k", type: "시뮬레이션" },
        { title: "Flight Sim Pro", author: "PilotDev", image: "https://images.unsplash.com/photo-1436891624295-923ea2263398?auto=format&fit=crop&q=80&w=400", likes: 1500, players: "3k+", type: "시뮬레이션" },
        { title: "Chef Life", author: "CookingMama", image: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&q=80&w=400", likes: 600, players: "1k+", type: "시뮬레이션" },
        { title: "Block Builder", author: "VoxelMaster", image: "https://images.unsplash.com/photo-1574169208507-84376194878a?auto=format&fit=crop&q=80&w=400", likes: 4500, players: "22k+", type: "시뮬레이션" },

        // 스포츠 (Sports)
        { title: "Street Soccer", author: "GoalKicker", image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=400", likes: 700, players: "1.8k", type: "스포츠" },
        { title: "NBA Jam", author: "DunkMaster", image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=400", likes: 1200, players: "3k+", type: "스포츠" },
        { title: "Golf It", author: "HoleInOne", image: "https://images.unsplash.com/photo-1535131749050-aac1f17e0c0d?auto=format&fit=crop&q=80&w=400", likes: 400, players: "800+", type: "스포츠" },
        { title: "Tennis World", author: "AceServer", image: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=400", likes: 550, players: "1k+", type: "스포츠" },
        { title: "Skate Park 3D", author: "SkaterBoy", image: "https://images.unsplash.com/photo-1520045864985-a00583299d63?auto=format&fit=crop&q=80&w=400", likes: 900, players: "2.2k", type: "스포츠" },

        // 공포 (Horror)
        { title: "Zombie Survival", author: "UndeadGames", image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=400", likes: 980, players: "2.1k", type: "공포" },
        { title: "Silent Hill PT", author: "HorrorFan", image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=400", likes: 1500, players: "5k+", type: "공포" },
        { title: "Dark Woods", author: "CreepySoft", image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=400", likes: 600, players: "1.2k", type: "공포" },
        { title: "Ghost Hunter", author: "SpiritSeeker", image: "https://images.unsplash.com/photo-1505672675380-4d2d9529488f?auto=format&fit=crop&q=80&w=400", likes: 450, players: "800+", type: "공포" },
        { title: "Haunted House", author: "ScareMaster", image: "https://images.unsplash.com/photo-1513205792079-a787332f1430?auto=format&fit=crop&q=80&w=400", likes: 780, players: "1.5k", type: "공포" },
    ];

    const filteredGames = GAMES.filter(game => {
        if (selectedCategory === "전체") return true;
        if (selectedCategory === "인기") return game.likes >= 1000; // 기준은 임의
        if (selectedCategory === "신규") return true; // 나중에 createdAt 있으면 교체

        return game.type === selectedCategory;
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
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => navigate('/main')}
                    >
                        <i className="fa-solid fa-cube" style={{ marginRight: '10px', color: '#3b82f6' }}></i>
                        <span className="gradient-text">Uniforge</span>
                        <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '10px', fontWeight: 400 }}>게임 플레이스</span>
                    </div>

                    {/* Search Bar */}
                    <div style={{
                        position: 'relative',
                        width: '400px'
                    }}>
                        <i className="fa-solid fa-search" style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#666'
                        }}></i>
                        <input
                            type="text"
                            placeholder="게임 검색..."
                            style={{
                                width: '100%',
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                padding: '10px 10px 10px 40px',
                                color: 'white',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                            onBlur={(e) => e.target.style.borderColor = '#333'}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: '1px solid #333',
                                backgroundColor: '#1a1a1a',
                                cursor: 'pointer',
                                padding: 0,
                                overflow: 'hidden'
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
                                position: 'absolute',
                                top: '45px',
                                right: 0,
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                minWidth: '200px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                zIndex: 1000,
                                overflow: 'hidden'
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
                {/* Sidebar */}
                <aside style={{
                    width: '240px',
                    padding: '2rem 1rem',
                    borderRight: '1px solid #1a1a1a',
                    position: 'sticky',
                    top: '73px',
                    height: 'calc(100vh - 73px)',
                    overflowY: 'auto'
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
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 16px',
                                        backgroundColor: selectedCategory === cat.id ? '#1a1a1a' : 'transparent',
                                        border: '1px solid',
                                        borderColor: selectedCategory === cat.id ? '#333' : 'transparent',
                                        borderRadius: '8px',
                                        color: selectedCategory === cat.id ? 'white' : '#888',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s',
                                        width: '100%'
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

                    {/* Featured Game Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{selectedCategory} 게임</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="sort-btn" style={{ padding: '6px 12px', borderRadius: '4px', background: '#111', border: '1px solid #333', color: '#888', cursor: 'pointer' }}>인기순</button>
                            <button className="sort-btn" style={{ padding: '6px 12px', borderRadius: '4px', background: 'transparent', border: '1px solid transparent', color: '#666', cursor: 'pointer' }}>최신순</button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px'
                    }}>
                        {filteredGames.map((game, index) => (
                            <div
                                key={index}
                                style={{
                                    backgroundColor: '#0a0a0a',
                                    borderRadius: '12px',
                                    border: '1px solid #222',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, border-color 0.2s',
                                    position: 'relative'
                                }}
                                onClick={() => setSelectedGame(game)}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.borderColor = '#444';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = '#222';
                                }}
                            >
                                <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                                    <img src={game.image} alt={game.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        width: '100%',
                                        padding: '40px 16px 16px',
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                                    }}>
                                        <span style={{
                                            backgroundColor: 'rgba(37, 99, 235, 0.8)', padding: '2px 8px', borderRadius: '4px',
                                            fontSize: '0.7rem', fontWeight: 600, backdropFilter: 'blur(4px)', display: 'inline-block'
                                        }}>
                                            {game.type}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', margin: 0 }}>{game.title}</h3>
                                    </div>
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
                        ))}
                    </div>

                </main>
            </div>
            {/* Game Detail Modal */}
            {selectedGame && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }} onClick={() => setSelectedGame(null)}>
                    <div style={{
                        backgroundColor: '#111',
                        border: '1px solid #333',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '1000px',
                        height: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedGame(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(0,0,0,0.5)',
                                border: 'none',
                                color: 'white',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                zIndex: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>

                        {/* Top: Header Section (Image & Basic Info) */}
                        <div style={{ height: '300px', position: 'relative' }}>
                            <img
                                src={selectedGame.image}
                                alt={selectedGame.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }}
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                width: '100%',
                                padding: '2rem',
                                background: 'linear-gradient(to top, #111, transparent)'
                            }}>
                                <span style={{
                                    backgroundColor: '#2563eb', color: 'white', padding: '4px 8px',
                                    borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', display: 'inline-block'
                                }}>
                                    {selectedGame.type}
                                </span>
                                <h2 style={{ fontSize: '3rem', fontWeight: 700, margin: '8px 0 4px' }}>{selectedGame.title}</h2>
                                <p style={{ color: '#ccc', fontSize: '1.1rem' }}>By {selectedGame.author} • {selectedGame.players} 플레이</p>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

                                {/* Left Column: Action & Ranking */}
                                <div>
                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                                        <button style={{
                                            flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none',
                                            padding: '16px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }} onClick={() => alert('게임 플레이 시작!')}>
                                            <i className="fa-solid fa-play"></i> 플레이
                                        </button>
                                        <button style={{
                                            padding: '16px 24px', backgroundColor: '#333', color: 'white', border: 'none',
                                            borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                        }} onClick={() => alert('좋아요!')}>
                                            <i className="fa-solid fa-heart" style={{ color: '#ef4444' }}></i> {selectedGame.likes}
                                        </button>
                                        <button style={{
                                            padding: '16px 24px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #444',
                                            borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                        }} onClick={() => alert('다운로드 완료!')}>
                                            <i className="fa-solid fa-download"></i>
                                        </button>
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderLeft: '4px solid #2563eb', paddingLeft: '12px' }}>게임 설명</h3>
                                        <p style={{ lineHeight: '1.6', color: '#ccc' }}>
                                            이 게임은 유니포지 엔진으로 제작된 고퀄리티 {selectedGame.type} 게임입니다.
                                            몰입감 넘치는 스토리와 화려한 그래픽을 경험해보세요.
                                            전 세계 플레이어들과 경쟁하고 순위를 올려보세요!
                                        </p>
                                    </div>

                                    {/* Ranking Section */}
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderLeft: '4px solid #fbbf24', paddingLeft: '12px' }}>실시간 랭킹</h3>
                                        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                                            {[
                                                { rank: 1, name: "Faker", score: 999999 },
                                                { rank: 2, name: "Chovy", score: 888442 },
                                                { rank: 3, name: "ShowMaker", score: 772100 },
                                                { rank: 4, name: "Zeus", score: 654321 },
                                                { rank: 5, name: "Keria", score: 543210 },
                                            ].map((user, idx) => (
                                                <div key={idx} style={{
                                                    display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                                                    borderBottom: idx !== 4 ? '1px solid #333' : 'none',
                                                    backgroundColor: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'transparent'
                                                }}>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                        <span style={{
                                                            fontWeight: 700, width: '24px',
                                                            color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#666'
                                                        }}>{user.rank}</span>
                                                        <span style={{ color: 'white' }}>{user.name}</span>
                                                    </div>
                                                    <span style={{ fontFamily: 'monospace', color: '#aaa' }}>{user.score.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Comments */}
                                <div style={{ borderLeft: '1px solid #333', paddingLeft: '2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>댓글 (128)</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {[
                                            { user: "User123", text: "정말 재미있는 게임이네요!", time: "2분 전" },
                                            { user: "GameMaster", text: "그래픽이 훌륭합니다.", time: "15분 전" },
                                            { user: "Tester", text: "난이도가 좀 높아요 ㅠㅠ", time: "1시간 전" },
                                            { user: "ProGamer", text: "랭킹 1위 도전합니다.", time: "3시간 전" },
                                            { user: "DevFan", text: "업데이트 기다리고 있어요!", time: "하루 전" },
                                        ].map((comment, idx) => (
                                            <div key={idx} style={{ paddingBottom: '1rem', borderBottom: '1px solid #222' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{comment.user}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{comment.time}</span>
                                                </div>
                                                <p style={{ fontSize: '0.9rem', color: '#ccc', margin: 0 }}>{comment.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '1rem' }}>
                                        <input
                                            type="text"
                                            placeholder="댓글을 입력하세요..."
                                            style={{
                                                width: '100%', padding: '10px', backgroundColor: '#222', border: '1px solid #333',
                                                borderRadius: '6px', color: 'white', outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExplorePage;
