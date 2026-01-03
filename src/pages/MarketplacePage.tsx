import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { marketplaceService, Asset } from '../services/marketplaceService';

const MarketplacePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState("전체");

    // API Data State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    // Todo: define item type properly
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Fetch Assets
    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const data = await marketplaceService.getAssets();
                // Map backend data to UI format if needed
                const mappedData = data.map(asset => ({
                    ...asset,
                    // Default values for missing UI fields
                    image: asset.image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400",
                    rating: asset.rating || 0,
                    type: asset.type || "3D 에셋",
                    genre: asset.genre || "기타",
                    author: asset.author || `User ${asset.authorId}`
                }));
                setAssets(mappedData);
            } catch (error) {
                console.error("Failed to fetch assets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssets();
    }, []);
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

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (selectedItem) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        }
    }, [selectedItem]);

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

    // Use loaded assets instead of hardcoded items
    const MARKET_ITEMS = assets;
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
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => navigate('/main')}
                    >
                        <i className="fa-solid fa-cube" style={{ marginRight: '10px', color: '#3b82f6' }}></i>
                        <span className="gradient-text">Uniforge</span>
                        <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '10px', fontWeight: 400 }}>에셋 플레이스</span>
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
                    <button onClick={() => navigate('/create-asset')} style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <i className="fa-solid fa-plus"></i>
                        에셋 등록
                    </button>
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
                        {loading ? (
                            <div style={{ color: 'white', textAlign: 'center', gridColumn: '1/-1', padding: '2rem' }}>Loading assets...</div>
                        ) : filteredItems.length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', gridColumn: '1/-1', padding: '2rem' }}>
                                No assets found for this category.
                            </div>
                        ) : (
                            filteredItems.map((item, index) => (
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
                                    onClick={() => navigate(`/assets/${item.id}`)}
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
                                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', margin: 0 }}>{item.name}</h3>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 16px 0' }}>by {item.author}</p>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#fbbf24' }}>
                                                <i className="fa-solid fa-star"></i>
                                                <span>{item.rating}</span>
                                            </div>
                                            <div style={{ fontWeight: 600, color: item.price === 0 ? '#22c55e' : 'white' }}>
                                                {item.price === 0 ? 'Free' : `₩${item.price.toLocaleString()}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            )))}
                    </div>

                </main>
            </div >

            {/* Asset Detail Modal */}
            {
                selectedItem && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem'
                    }} onClick={() => setSelectedItem(null)}>
                        <div style={{
                            backgroundColor: '#111',
                            border: '1px solid #333',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            display: 'flex',
                            position: 'relative',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }} onClick={e => e.stopPropagation()}>

                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedItem(null)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#666',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    zIndex: 10
                                }}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                            {/* Left: Image */}
                            <div style={{ width: '50%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                    src={selectedItem.image}
                                    alt={selectedItem.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            {/* Right: Info */}
                            <div style={{ width: '50%', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: 'auto' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{
                                            backgroundColor: '#2563eb', color: 'white', padding: '4px 8px',
                                            borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {selectedItem.type}
                                        </span>
                                        <span style={{ color: '#666', fontSize: '0.9rem' }}>{selectedItem.genre}</span>
                                    </div>

                                    <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{selectedItem.title}</h2>
                                    <p style={{ color: '#888', marginBottom: '1.5rem' }}>by {selectedItem.author}</p>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', marginBottom: '1.5rem' }}>
                                        <i className="fa-solid fa-star"></i>
                                        <span style={{ fontWeight: 600 }}>{selectedItem.rating}</span>
                                        <span style={{ color: '#666' }}>(128 reviews)</span>
                                    </div>

                                    <p style={{ color: '#ccc', lineHeight: '1.6', marginBottom: '2rem' }}>
                                        이 에셋은 유니포지 마켓플레이스에서 엄선된 고품질 에셋입니다.
                                        프로젝트에 바로 적용하여 시간을 절약하고 퀄리티를 높여보세요.
                                        포함된 파일: FBX, OBJ, PNG 텍스처 등.
                                    </p>
                                </div>

                                <div style={{ borderTop: '1px solid #222', paddingTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <span style={{ color: '#888' }}>가격</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: selectedItem.price === '무료' ? '#22c55e' : 'white' }}>
                                            {selectedItem.price}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            alert(`${selectedItem.title}이(가) 라이브러리에 다운로드되었습니다.`);
                                        }}
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#2563eb',
                                            color: 'white',
                                            border: 'none',
                                            padding: '16px',
                                            borderRadius: '8px',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                                    >
                                        <i className="fa-solid fa-download"></i>
                                        라이브러리에 담기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MarketplacePage;
