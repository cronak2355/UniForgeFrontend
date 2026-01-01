import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// --- Types ---
interface LibraryItem {
    id: string;
    title: string;
    type: 'game' | 'asset';
    thumbnail: string;
    author: string;
    purchaseDate: string;
    collectionId?: string;
    assetType?: string;
}

interface Collection {
    id: string;
    name: string;
    icon?: string;
}

// --- Mock Data ---
const MOCK_GAMES: LibraryItem[] = [
    { id: 'g1', title: 'Neon Racer 2077', type: 'game', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', author: 'CyberDev', purchaseDate: '2023.12.01' },
    { id: 'g2', title: 'Cosmic Voyager', type: 'game', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80', author: 'StarStudio', purchaseDate: '2023.12.15' },
    { id: 'g3', title: 'Medieval Legends', type: 'game', thumbnail: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400&q=80', author: 'KnightSoft', purchaseDate: '2024.01.10' },
];

const MOCK_ASSETS: LibraryItem[] = [
    { id: 'a1', title: 'Sci-Fi Weapon Pack', type: 'asset', assetType: '3D Model', thumbnail: 'https://images.unsplash.com/photo-1612404730960-5c71579fca2c?w=400&q=80', author: 'AssetMaster', purchaseDate: '2023.11.20', collectionId: 'c1' },
    { id: 'a2', title: 'Horror Sound Effects', type: 'asset', assetType: 'Sound', thumbnail: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=400&q=80', author: 'AudioLab', purchaseDate: '2023.12.05', collectionId: 'c2' },
    { id: 'a3', title: 'Urban Texture Set', type: 'asset', assetType: 'Texture', thumbnail: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&q=80', author: 'TexturePro', purchaseDate: '2024.01.02' },
    { id: 'a4', title: 'Cyberpunk Character', type: 'asset', assetType: '3D Model', thumbnail: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?w=400&q=80', author: 'NeonArt', purchaseDate: '2024.01.15', collectionId: 'c1' },
    { id: 'a5', title: 'Dark Ambient Music', type: 'asset', assetType: 'Sound', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', author: 'GhostTrax', purchaseDate: '2024.01.20', collectionId: 'c2' },
];

const INITIAL_COLLECTIONS: Collection[] = [
    { id: 'c1', name: 'SF / 미래', icon: 'fa-rocket' },
    { id: 'c2', name: '공포 / 호러', icon: 'fa-ghost' },
];

export default function LibraryPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // UI State
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Data State
    const [activeTab, setActiveTab] = useState<'games' | 'assets'>('games');
    const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Effects ---
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

    // --- Actions ---
    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleCreateCollection = () => {
        const name = prompt("새로운 컬렉션(폴더) 이름을 입력하세요:");
        if (name) {
            const newCollection: Collection = {
                id: `c${Date.now()}`,
                name,
                icon: 'fa-folder'
            };
            setCollections([...collections, newCollection]);
        }
    };

    // --- Filter Logic ---
    const getFilteredItems = () => {
        let items = activeTab === 'games' ? MOCK_GAMES : MOCK_ASSETS;

        if (searchTerm) {
            items = items.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (activeTab === 'assets' && selectedCollectionId) {
            items = items.filter(item => item.collectionId === selectedCollectionId);
        }

        return items;
    };

    const filteredItems = getFilteredItems();


    return (
        <div style={{
            backgroundColor: '#000000', // Fallback
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            overflowX: 'hidden',
            position: 'relative' // For absolute pos children
        }}>
            {/* --- Geometric Background Elements --- */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {/* 1. Deep Gradient Base */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at 50% -20%, #111827 0%, #000000 100%)'
                }}></div>

                {/* 2. Grid Pattern */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: 0.5
                }}></div>

                {/* 3. Glowing Andbs (Abstract Shapes) */}
                <div style={{
                    position: 'absolute', top: '10%', left: '20%',
                    width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    animation: 'float 20s infinite ease-in-out'
                }}></div>
                <div style={{
                    position: 'absolute', bottom: '10%', right: '10%',
                    width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'float 25s infinite ease-in-out reverse'
                }}></div>

                {/* 4. Tech Lines (Decorative) */}
                <div style={{
                    position: 'absolute', top: '150px', right: '0',
                    width: '300px', height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.3), transparent)'
                }}></div>
                <div style={{
                    position: 'absolute', top: '0', left: '15%',
                    width: '1px', height: '400px',
                    background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.1), transparent)'
                }}></div>
            </div>

            {/* --- Content Wrapper --- */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* --- Header (Consistent Style) --- */}
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
                            <i className="fa-solid fa-cube" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                            <span className="gradient-text">Uniforge</span>
                            <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '10px', fontWeight: 400 }}>라이브러리</span>
                        </div>

                        {/* Navigation Tabs (Integrated in Header) */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                            <button
                                onClick={() => { setActiveTab('games'); setSelectedCollectionId(null); }}
                                style={{
                                    padding: '8px 16px',
                                    background: activeTab === 'games' ? '#1a1a1a' : 'transparent',
                                    border: '1px solid',
                                    borderColor: activeTab === 'games' ? '#333' : 'transparent',
                                    borderRadius: '8px',
                                    color: activeTab === 'games' ? 'white' : '#888',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className="fa-solid fa-gamepad" style={{ marginRight: '8px' }}></i>
                                나의 게임
                            </button>
                            <button
                                onClick={() => { setActiveTab('assets'); setSelectedCollectionId(null); }}
                                style={{
                                    padding: '8px 16px',
                                    background: activeTab === 'assets' ? '#1a1a1a' : 'transparent',
                                    border: '1px solid',
                                    borderColor: activeTab === 'assets' ? '#333' : 'transparent',
                                    borderRadius: '8px',
                                    color: activeTab === 'assets' ? 'white' : '#888',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className="fa-solid fa-cube" style={{ marginRight: '8px' }}></i>
                                나의 에셋
                            </button>
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

                        {/* User Profile Dropdown */}
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

                {/* --- Main Content Area --- */}
                <div style={{ display: 'flex', flex: 1, maxWidth: '1600px', width: '100%', margin: '0 auto' }}>

                    {/* --- Sidebar (Only for Assets) --- */}
                    {activeTab === 'assets' && (
                        <aside style={{
                            width: '240px',
                            padding: '2rem 1rem',
                            borderRight: '1px solid #1a1a1a',
                            position: 'sticky',
                            top: '73px',
                            height: 'calc(100vh - 73px)',
                            overflowY: 'auto'
                        }}>
                            <div style={{ padding: '0 8px 16px', color: '#666', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Collections
                            </div>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setSelectedCollectionId(null)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                                        backgroundColor: selectedCollectionId === null ? '#1a1a1a' : 'transparent',
                                        border: '1px solid', borderColor: selectedCollectionId === null ? '#333' : 'transparent',
                                        borderRadius: '8px', color: selectedCollectionId === null ? 'white' : '#888',
                                        fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s'
                                    }}
                                >
                                    <i className="fa-solid fa-layer-group" style={{ width: '20px', textAlign: 'center' }}></i>
                                    <span>전체 에셋</span>
                                </button>
                                {collections.map(col => (
                                    <button
                                        key={col.id}
                                        onClick={() => setSelectedCollectionId(col.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                                            backgroundColor: selectedCollectionId === col.id ? '#1a1a1a' : 'transparent',
                                            border: '1px solid', borderColor: selectedCollectionId === col.id ? '#333' : 'transparent',
                                            borderRadius: '8px', color: selectedCollectionId === col.id ? 'white' : '#888',
                                            fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s'
                                        }}
                                    >
                                        <i className={`fa-solid ${col.icon || 'fa-folder'}`} style={{ width: '20px', textAlign: 'center' }}></i>
                                        <span>{col.name}</span>
                                    </button>
                                ))}

                                <div style={{ height: '1px', backgroundColor: '#222', margin: '10px 0' }}></div>

                                <button
                                    onClick={handleCreateCollection}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                                        backgroundColor: 'transparent',
                                        border: '1px dashed #444',
                                        borderRadius: '8px', color: '#666',
                                        fontSize: '0.9rem', cursor: 'pointer', textAlign: 'center', width: '100%', justifyContent: 'center',
                                        marginTop: '8px'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#ccc'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#666'; }}
                                >
                                    <i className="fa-solid fa-plus"></i>
                                    <span>새 컬렉션</span>
                                </button>
                            </nav>
                        </aside>
                    )}

                    {/* --- Grid Content --- */}
                    <main style={{ flex: 1, padding: '2rem' }}>
                        {/* Toolbar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ position: 'relative', width: '400px' }}>
                                <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}></i>
                                <input
                                    type="text"
                                    placeholder={activeTab === 'games' ? "내 게임 검색..." : "내 에셋 검색..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%', backgroundColor: '#111', border: '1px solid #333',
                                        borderRadius: '8px', padding: '10px 10px 10px 40px', color: 'white',
                                        fontSize: '0.95rem', outline: 'none'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                    onBlur={(e) => e.target.style.borderColor = '#333'}
                                />
                            </div>
                            <div style={{ color: '#666' }}>
                                총 {filteredItems.length}개 항목
                            </div>
                        </div>

                        {/* Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '24px'
                        }}>
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    style={{
                                        backgroundColor: '#0a0a0a',
                                        borderRadius: '12px',
                                        border: '1px solid #222',
                                        overflow: 'hidden',
                                        transition: 'transform 0.2s, border-color 0.2s',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#222'; }}
                                >
                                    {/* Thumbnail */}
                                    <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                                        <img
                                            src={item.thumbnail}
                                            alt={item.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        {/* Action Overlay */}
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'rgba(0,0,0,0.5)', opacity: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            transition: 'opacity 0.2s'
                                        }}
                                            className="card-overlay"
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                                        >
                                            <button style={{
                                                padding: '10px 20px', borderRadius: '6px', border: 'none',
                                                backgroundColor: '#2563eb', color: 'white', fontWeight: 600,
                                                cursor: 'pointer'
                                            }}>
                                                {item.type === 'game' ? <><i className="fa-solid fa-play"></i> 플레이</> : <><i className="fa-solid fa-download"></i> 다운로드</>}
                                            </button>
                                            {item.type === 'asset' &&
                                                <button style={{
                                                    width: '40px', height: '37px', borderRadius: '6px', border: '1px solid #ccc',
                                                    backgroundColor: 'transparent', color: 'white', fontWeight: 600,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }} title="컬렉션 이동">
                                                    <i className="fa-solid fa-folder"></i>
                                                </button>
                                            }
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div style={{ padding: '16px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.title}
                                        </h3>
                                        <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '12px' }}>
                                            {item.author}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#555' }}>
                                            <span>{item.assetType || 'Game'}</span>
                                            <span>{item.purchaseDate}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredItems.length === 0 && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '4rem', color: '#444', height: '50vh'
                            }}>
                                <i className="fa-solid fa-ghost" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
                                <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>항목을 찾을 수 없습니다</p>
                                <p style={{ fontSize: '0.9rem' }}>검색어를 변경하거나 새로운 에셋을 찾아보세요.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
