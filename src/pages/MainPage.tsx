import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

const TITLE_WORDS = ['나만의', '간단히', '혼자서', '가볍게'];

const MainPage = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [titleWord, setTitleWord] = useState('나만의');

    // 타이틀 애니메이션 효과
    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % TITLE_WORDS.length;
            setTitleWord(TITLE_WORDS[index]);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    // 더미 데이터: 인기 게임
    const POPULAR_GAMES = [
        { title: "Neon Racer 2077", author: "CyberDev", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=300", likes: 1250 },
        { title: "Mystic Forest RPG", author: "FantasyWorks", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300", likes: 890 },
        { title: "Space Commander", author: "StarLab", image: "https://images.unsplash.com/photo-1534237710431-e2fc698436d0?auto=format&fit=crop&q=80&w=300", likes: 2100 },
        { title: "Pixel Dungeon", author: "RetroKing", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=300", likes: 1540 },
        { title: "Sky Island", author: "CloudBreaker", image: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&q=80&w=300", likes: 3200 },
        { title: "Shadow Ninja", author: "DarkBlade", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300", likes: 670 },
        { title: "Block Builder", author: "VoxelMaster", image: "https://images.unsplash.com/photo-1574169208507-84376194878a?auto=format&fit=crop&q=80&w=300", likes: 4500 },
    ];


    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div style={{
            backgroundColor: 'black',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            position: 'relative'
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                border: 'none',
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '95%',
                maxWidth: '1200px',
                borderRadius: '16px',
                backgroundColor: 'rgba(10, 10, 10, 0.85)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        <i className="fa-solid fa-cube" style={{ marginRight: '10px', color: '#3b82f6' }}></i>
                        <span className="gradient-text">Uniforge</span>
                    </div>
                    <nav style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => navigate('/explore')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#b0b0b0',
                                fontSize: '1rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                letterSpacing: '0.3px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.backgroundColor = '#1a1a1a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#b0b0b0';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            게임 플레이스
                        </button>
                        <button
                            onClick={() => navigate('/marketplace')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#b0b0b0',
                                fontSize: '1rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                letterSpacing: '0.3px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.backgroundColor = '#1a1a1a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#b0b0b0';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            에셋 플레이스
                        </button>
                        <button
                            onClick={() => navigate('/library')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#b0b0b0',
                                fontSize: '1rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                letterSpacing: '0.3px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.backgroundColor = '#1a1a1a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#b0b0b0';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            라이브러리
                        </button>
                    </nav>
                </div>
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: '2px solid #333',
                            backgroundColor: '#1a1a1a',
                            cursor: 'pointer',
                            padding: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#555'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
                    >
                        {user?.profileImage ? (
                            <img
                                src={user.profileImage}
                                alt="프로필"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#666"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        )}
                    </button>

                    {showDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '50px',
                            right: 0,
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            minWidth: '200px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '16px',
                                borderBottom: '1px solid #333'
                            }}>
                                <div style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    marginBottom: '4px'
                                }}>
                                    {user?.name}
                                </div>
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: '#888'
                                }}>
                                    {user?.email}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/library');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: 'transparent',
                                    color: '#fff',
                                    border: 'none',
                                    borderBottom: '1px solid #333',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'background-color 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#222'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span>📚</span> 라이브러리
                            </button>
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: 'transparent',
                                    color: '#ef4444',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#222'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                로그아웃
                            </button>
                        </div>
                    )}
                </div>
            </header>
            <div className="hero-banner">
                <h1 className="hero-title">
                    <span key={titleWord} className="hero-title-animated">{titleWord}</span> 게임 만들기
                </h1>
                <p className="hero-subtitle">빈 캔버스에서 시작하거나, 수백 개의 템플릿을 활용해보세요.</p>

                <div className="action-cards-container">
                    <div className="action-card" onClick={() => navigate('/explore')}>
                        <div className="action-card-icon">
                            <i className="fa-solid fa-compass"></i>
                        </div>
                        <div className="action-card-content">
                            <h3>구경하기</h3>
                            <p>다른 크리에이터들의 게임을 플레이해보세요</p>
                        </div>
                        <div className="action-card-arrow">
                            <i className="fa-solid fa-arrow-right"></i>
                        </div>
                    </div>

                    <div className="action-card primary" onClick={() => { navigate('/editor') }}>
                        <div className="action-card-icon">
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <div className="action-card-content">
                            <h3>에디터</h3>
                            <p>지금 바로 나만의 게임을 만들어보세요</p>
                        </div>
                        <div className="action-card-arrow">
                            <i className="fa-solid fa-arrow-right"></i>
                        </div>
                    </div>

                    <div className="action-card" onClick={() => navigate('/marketplace')}>
                        <div className="action-card-icon">
                            <i className="fa-solid fa-puzzle-piece"></i>
                        </div>
                        <div className="action-card-content">
                            <h3>에셋 플레이스</h3>
                            <p>고퀄리티 에셋으로 게임을 빠르게 완성하세요</p>
                        </div>
                        <div className="action-card-arrow">
                            <i className="fa-solid fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </div>

            <main style={{
                maxWidth: '1200px',
                width: '95%',
                margin: '80px auto 60px',
                padding: '0 20px',
                flex: 1
            }}>
                {/* 내 프로젝트 섹션 (My Projects) */}
                <div className="section-header-modern">
                    <div className="section-bar"></div>
                    <h2 className="section-title-modern">내 프로젝트 (My Projects)</h2>
                </div>

                <div className="modern-grid">
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '60px 40px',
                        textAlign: 'center',
                        backgroundColor: '#161616',
                        border: '1px dashed #444',
                        borderRadius: '4px'
                    }}>
                        <h3 style={{
                            color: '#aaa',
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            marginBottom: '8px'
                        }}>아직 프로젝트가 없습니다</h3>
                        <p style={{
                            color: '#888',
                            fontSize: '0.9rem'
                        }}>상단의 '에디터'를 통해 새로운 게임을 만들어보세요!</p>
                    </div>
                </div>

                {/* 인기 게임 섹션 (Popular Games) */}
                <div className="section-header-modern">
                    <div className="section-bar"></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <h2 className="section-title-modern">인기 게임 (Popular)</h2>
                        <span style={{
                            color: '#666',
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }} onClick={() => navigate('/explore')}>더보기 &gt;</span>
                    </div>
                </div>

                <div className="horizontal-scroll-container">
                    {POPULAR_GAMES.map((game, index) => (
                        <div key={index} className="horizontal-card">
                            <img src={game.image} alt={game.title} />
                            <div className="horizontal-card-info">
                                <div className="modern-card-title">{game.title}</div>
                                <div className="modern-card-meta">
                                    <span>👤 {game.author}</span>
                                    <span>♥ {game.likes}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default MainPage;

