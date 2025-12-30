import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MarketplacePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState("전체");
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
        { id: "추천", icon: "fa-solid fa-fire" },
        { id: "급상승", icon: "fa-solid fa-chart-line" },
        { id: "신규", icon: "fa-solid fa-sparkles" },
        { type: "divider" },
        { kind: "genre", id: "액션", icon: "fa-solid fa-khanda" },
        { kind: "genre", id: "RPG", icon: "fa-solid fa-shield-halved" },
        { kind: "genre", id: "전략", icon: "fa-solid fa-chess" },
        { kind: "genre", id: "퍼즐", icon: "fa-solid fa-puzzle-piece" },
        { type: "divider" },
        { kind: "type", id: "3D 에셋", icon: "fa-solid fa-cube" },
        { kind: "type", id: "2D 스프라이트", icon: "fa-solid fa-image" },
        { kind: "type", id: "오디오", icon: "fa-solid fa-music" },
        { kind: "type", id: "VFX", icon: "fa-solid fa-wand-magic-sparkles" },
    ];

    const MARKET_ITEMS = [
        // 3D 에셋
        { title: "Neon City Pack", author: "CyberArt", price: "무료", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400", rating: 4.8, type: "3D 에셋", genre: "액션" },
        { title: "Low Poly Vehicles", author: "PolyWorks", price: "₩12,000", image: "https://images.unsplash.com/photo-1555620950-c8d030999557?auto=format&fit=crop&q=80&w=400", rating: 4.5, type: "3D 에셋", genre: "레이싱" },
        { title: "Medieval Castle Kit", author: "CastleBuilder", price: "₩25,000", image: "https://images.unsplash.com/photo-1599596446733-ee31cb9f257f?auto=format&fit=crop&q=80&w=400", rating: 4.7, type: "3D 에셋", genre: "RPG" },
        { title: "Modern Furniture", author: "Interiors", price: "₩8,000", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400", rating: 4.6, type: "3D 에셋", genre: "시뮬레이션" },
        { title: "Sci-Fi Weapons", author: "GunSmith", price: "₩15,000", image: "https://images.unsplash.com/photo-1624638760924-44ed5b07223e?auto=format&fit=crop&q=80&w=400", rating: 4.9, type: "3D 에셋", genre: "액션" },

        // 2D 스프라이트
        { title: "Fantasy Knight", author: "PixelForge", price: "₩15,000", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400", rating: 4.9, type: "2D 스프라이트", genre: "RPG" },
        { title: "Dungeon Tileset", author: "TileMaster", price: "무료", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400", rating: 4.4, type: "2D 스프라이트", genre: "RPG" },
        { title: "Retro Platformer", author: "RetroGamer", price: "₩10,000", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400", rating: 4.7, type: "2D 스프라이트", genre: "액션" },
        { title: "RPG Icons Pack", author: "IconFactory", price: "₩5,000", image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400", rating: 4.8, type: "2D 스프라이트", genre: "RPG" },
        { title: "Pixel Monsters", author: "MonsterMaker", price: "₩8,000", image: "https://images.unsplash.com/photo-1599643478518-17488fbbcd75?auto=format&fit=crop&q=80&w=400", rating: 4.6, type: "2D 스프라이트", genre: "RPG" },

        // 오디오
        { title: "Forest Ambience", author: "SoundScape", price: "₩10,000", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400", rating: 4.9, type: "오디오", genre: "시뮬레이션" },
        { title: "Epic Orchestral", author: "ComposerX", price: "₩30,000", image: "https://images.unsplash.com/photo-1507838153414-b4b713384ebd?auto=format&fit=crop&q=80&w=400", rating: 5.0, type: "오디오", genre: "RPG" },
        { title: "SFX Bundle", author: "AudioLab", price: "₩20,000", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=400", rating: 4.7, type: "오디오", genre: "액션" },
        { title: "Horror Sounds", author: "ScaryAudio", price: "₩12,000", image: "https://images.unsplash.com/photo-1514320291840-2e0a962daecb?auto=format&fit=crop&q=80&w=400", rating: 4.8, type: "오디오", genre: "공포" },
        { title: "Casual Loops", author: "HappyTunes", price: "무료", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400", rating: 4.5, type: "오디오", genre: "퍼즐" },

        // VFX
        { title: "Magic Spells FX", author: "VFXWizard", price: "₩18,000", image: "https://images.unsplash.com/photo-1504910793664-9051fb278a9c?auto=format&fit=crop&q=80&w=400", rating: 4.8, type: "VFX", genre: "RPG" },
        { title: "Explosion Pack", author: "BoomMaster", price: "₩15,000", image: "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?auto=format&fit=crop&q=80&w=400", rating: 4.7, type: "VFX", genre: "액션" },
        { title: "Weather System", author: "NatureFX", price: "₩22,000", image: "https://images.unsplash.com/photo-1515690241747-493238f4674a?auto=format&fit=crop&q=80&w=400", rating: 4.9, type: "VFX", genre: "시뮬레이션" },
        { title: "Sci-Fi Particles", author: "FutureFS", price: "₩14,000", image: "https://images.unsplash.com/photo-1481697943534-ea60b58e6532?auto=format&fit=crop&q=80&w=400", rating: 4.6, type: "VFX", genre: "전략" },
        { title: "Water Shaders", author: "LiquidArt", price: "₩10,000", image: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&q=80&w=400", rating: 4.8, type: "VFX", genre: "퍼즐" },

        // UI & Template
        { title: "Space Shooter Template", author: "GameDevPro", price: "₩49,900", image: "https://images.unsplash.com/photo-1614726365723-49cfae96ac6d?auto=format&fit=crop&q=80&w=400", rating: 4.7, type: "템플릿" },
        { title: "Ultimate RPG UI", author: "InterfaceMaster", price: "₩25,000", image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400", rating: 4.6, type: "UI" },
    ];
    const filteredItems = MARKET_ITEMS.filter(item => {
        // 1️⃣ 특수 카테고리
        if (selectedCategory === "추천") return true;
        if (selectedCategory === "전체") {
            // genre/type 필터는 계속 적용
        }
        if (selectedCategory === "급상승") {
            if (item.rating < 4.7) return false;
        }
        if (selectedCategory === "신규") {
            return true; // 나중에 createdAt으로 교체
        }

        // 2️⃣ 장르
        if (selectedGenre && item.genre !== selectedGenre) return false;

        // 3️⃣ 타입
        if (selectedType && item.type !== selectedType) return false;

        return true;
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
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => navigate('/main')}
                    >
                        <span className="gradient-text">Uniforge</span>
                        <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '10px', fontWeight: 400 }}>마켓플레이스</span>
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
                            placeholder="에셋, 게임, 크리에이터 검색..."
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
                    <button onClick={() => navigate('/library')} style={{
                        background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
                        padding: '8px 16px', borderRadius: '6px', fontSize: '0.95rem'
                    }}
                        onMouseEnter={e => e.currentTarget.style.color = 'white'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888'}
                    >
                        내 라이브러리
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
                        {CATEGORIES.map((cat, index) => {
                            if (cat.type === 'divider') {
                                return (
                                    <div
                                        key={index}
                                        style={{ height: '1px', backgroundColor: '#222', margin: '10px 0' }}
                                    />
                                );
                            }

                            // ✅ 여기!!! (cat을 쓸 수 있는 범위)
                            const isActive =
                                (!cat.kind && selectedCategory === cat.id) ||
                                (cat.kind === "genre" && selectedGenre === cat.id) ||
                                (cat.kind === "type" && selectedType === cat.id);

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        if (cat.kind === "genre") {
                                            setSelectedGenre(cat.id!);
                                            setSelectedCategory("전체");
                                        } else if (cat.kind === "type") {
                                            setSelectedType(cat.id!);
                                            setSelectedCategory("전체");
                                        } else {
                                            setSelectedCategory(cat.id!);
                                            setSelectedGenre(null);
                                            setSelectedType(null);
                                        }
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 16px',
                                        backgroundColor: isActive ? '#1a1a1a' : 'transparent',
                                        border: '1px solid',
                                        borderColor: isActive ? '#333' : 'transparent',
                                        borderRadius: '8px',
                                        color: isActive ? 'white' : '#888',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive) {
                                            e.currentTarget.style.backgroundColor = '#111';
                                            e.currentTarget.style.color = '#ccc';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = '#888';
                                        }
                                    }}
                                >
                                    <i className={cat.icon} style={{ width: '20px', textAlign: 'center' }} />
                                    <span>{cat.id}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main style={{ flex: 1, padding: '2rem' }}>

                    {/* Hero Banner */}
                    <div style={{
                        width: '100%',
                        height: '300px',
                        borderRadius: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        marginBottom: '3rem',
                        border: '1px solid #333'
                    }}>
                        <img
                            src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2000"
                            alt="Featured"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            padding: '3rem',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                            width: '100%'
                        }}>
                            <span style={{
                                backgroundColor: '#2563eb', color: 'white', padding: '4px 12px',
                                borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem',
                                display: 'inline-block'
                            }}>추천</span>
                            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>Cyberpunk Streets Vol.2</h2>
                            <p style={{ color: '#ccc', maxWidth: '600px', marginBottom: '1.5rem' }}>
                                200개 이상의 고퀄리티 에셋으로 몰입감 넘치는 디스토피아 도시를 만들어보세요. 모듈형 건물, 네온 사인, 다양한 소품이 포함되어 있습니다.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button style={{
                                    backgroundColor: 'white', color: 'black', border: 'none',
                                    padding: '12px 24px', borderRadius: '6px', fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    상세 보기
                                </button>
                                <button style={{
                                    backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                                    padding: '12px 24px', borderRadius: '6px', fontWeight: 600,
                                    backdropFilter: 'blur(5px)', cursor: 'pointer'
                                }}>
                                    + 찜하기
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{selectedCategory} 아이템</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="sort-btn" style={{ padding: '6px 12px', borderRadius: '4px', background: '#111', border: '1px solid #333', color: '#888', cursor: 'pointer' }}>인기순</button>
                            <button className="sort-btn" style={{ padding: '6px 12px', borderRadius: '4px', background: 'transparent', border: '1px solid transparent', color: '#666', cursor: 'pointer' }}>최신순</button>
                            <button className="sort-btn" style={{ padding: '6px 12px', borderRadius: '4px', background: 'transparent', border: '1px solid transparent', color: '#666', cursor: 'pointer' }}>가격순</button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px'
                    }}>
                        {filteredItems.map((item, index) => (
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
                                    <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <span style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px',
                                        fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(4px)'
                                    }}>
                                        {item.type}
                                    </span>
                                </div>
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', margin: 0 }}>{item.title}</h3>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 16px 0' }}>by {item.author}</p>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#fbbf24' }}>
                                            <i className="fa-solid fa-star"></i>
                                            <span>{item.rating}</span>
                                        </div>
                                        <div style={{ fontWeight: 600, color: item.price === 'Free' ? '#22c55e' : 'white' }}>
                                            {item.price}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </main>
            </div>
        </div>
    );
};

export default MarketplacePage;
