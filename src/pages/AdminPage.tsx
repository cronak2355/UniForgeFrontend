import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminService, AdminStats, AdminUser, AdminAsset, AdminGame } from '../services/adminService';
import { getCloudFrontUrl } from '../utils/imageUtils';

type TabType = 'dashboard' | 'users' | 'assets' | 'system' | 'games';

export default function AdminPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [assets, setAssets] = useState<AdminAsset[]>([]);
    const [games, setGames] = useState<AdminGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'dashboard') {
                const statsData = await adminService.getStats();
                setStats(statsData);
            } else if (activeTab === 'users') {
                const usersData = await adminService.getUsers(roleFilter || undefined, searchTerm || undefined);
                setUsers(usersData);
            } else if (activeTab === 'assets') {
                const assetsData = await adminService.getAssets(undefined, searchTerm || undefined);
                setAssets(assetsData);
            } else if (activeTab === 'games') {
                const gamesData = await adminService.getGames();
                // Client-side search filtering for now as API might not support it yet
                const filtered = searchTerm
                    ? gamesData.filter(g => g.title.toLowerCase().includes(searchTerm.toLowerCase()))
                    : gamesData;
                setGames(filtered);
            }
        } catch (e: any) {
            setError(e.message || '데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN') => {
        if (!confirm(`정말 이 사용자의 권한을 ${newRole}로 변경하시겠습니까?`)) return;
        try {
            await adminService.updateUserRole(userId, newRole);
            loadData();
        } catch (e: any) {
            alert('권한 변경 실패: ' + e.message);
        }
    };

    const handleDeleteAsset = async (assetId: string, assetName: string) => {
        if (!confirm(`정말 "${assetName}" 에셋을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
        try {
            await adminService.deleteAsset(assetId);
            loadData();
        } catch (e: any) {
            alert('삭제 실패: ' + e.message);
        }
    };

    const handleDeleteAllAssets = async () => {
        const confirmMsg = prompt('정말로 모든 에셋을 삭제하시겠습니까? 돌이킬 수 없습니다. 삭제하려면 "DELETE ALL"을 입력하세요.');
        if (confirmMsg !== 'DELETE ALL') return;

        try {
            await adminService.deleteAllAssets();
            alert('모든 에셋이 삭제되었습니다.');
            loadData();
        } catch (e: any) {
            alert('전체 삭제 실패: ' + e.message);
        }
    };

    const handleCleanupLibrary = async (email: string, userName?: string) => {
        if (!confirm(`${userName ? `'${userName}' (${email})` : `'${email}'`} 사용자의 잘못된 라이브러리 데이터를 정리하시겠습니까?`)) return;
        try {
            const result = await adminService.cleanupLibrary(email);
            alert(result);
        } catch (e: any) {
            alert('정리 실패: ' + e.message);
        }
    };

    const handleDeleteGame = async (gameId: string, gameTitle: string) => {
        if (!confirm(`정말 "${gameTitle}" 게임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
        try {
            await adminService.deleteGame(gameId);
            loadData();
        } catch (e: any) {
            alert('삭제 실패: ' + e.message);
        }
    };

    const handleDeleteAllGames = async () => {
        const confirmMsg = prompt('정말로 모든 게임을 삭제하시겠습니까? 삭제하려면 "DELETE ALL"을 입력하세요.');
        if (confirmMsg !== 'DELETE ALL') return;

        try {
            await adminService.deleteAllGames();
            alert('모든 게임이 삭제되었습니다.');
            loadData();
        } catch (e: any) {
            alert('전체 삭제 실패: ' + e.message);
        }
    };

    const handleSearch = () => {
        loadData();
    };

    return (
        <div style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
            {/* Header */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a',
                backgroundColor: 'rgba(10, 10, 10, 0.95)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => navigate('/main')}>
                        <i className="fa-solid fa-cube" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                        <span className="gradient-text">Uniforge</span>
                        <span style={{ fontSize: '0.9rem', color: '#ef4444', marginLeft: '10px', fontWeight: 600 }}>
                            <i className="fa-solid fa-shield" style={{ marginRight: '6px' }}></i>
                            Admin
                        </span>
                    </div>
                </div>
                <button onClick={() => navigate('/main')} style={{
                    padding: '8px 16px', background: 'transparent', border: '1px solid #333',
                    color: '#888', borderRadius: '6px', cursor: 'pointer'
                }}>
                    <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i>
                    돌아가기
                </button>
            </header>

            <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Sidebar */}
                <aside style={{ width: '220px', padding: '2rem 1rem', borderRight: '1px solid #1a1a1a' }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[
                            { id: 'dashboard', label: '대시보드', icon: 'fa-chart-line' },
                            { id: 'users', label: '사용자 관리', icon: 'fa-users' },
                            { id: 'assets', label: '에셋 관리', icon: 'fa-cube' },
                            { id: 'system', label: '시스템 도구', icon: 'fa-tools' },
                            { id: 'games', label: '게임 관리', icon: 'fa-gamepad' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 16px', borderRadius: '8px', border: 'none',
                                    backgroundColor: activeTab === tab.id ? '#1a1a1a' : 'transparent',
                                    color: activeTab === tab.id ? 'white' : '#888',
                                    cursor: 'pointer', textAlign: 'left', fontSize: '0.95rem'
                                }}
                            >
                                <i className={`fa-solid ${tab.icon}`} style={{ width: '20px' }}></i>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main style={{ flex: 1, padding: '2rem' }}>
                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
                            borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#ef4444'
                        }}>
                            <i className="fa-solid fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                            <p>로딩 중...</p>
                        </div>
                    ) : (
                        <>
                            {/* Dashboard Tab */}
                            {activeTab === 'dashboard' && stats && (
                                <div>
                                    <h1 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
                                        <i className="fa-solid fa-chart-line" style={{ marginRight: '12px', color: '#3b82f6' }}></i>
                                        관리자 대시보드
                                    </h1>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                                        {[
                                            { label: '전체 사용자', value: stats.totalUsers, icon: 'fa-users', color: '#3b82f6' },
                                            { label: '관리자 수', value: stats.adminCount, icon: 'fa-shield', color: '#ef4444' },
                                            { label: '전체 에셋', value: stats.totalAssets, icon: 'fa-cube', color: '#10b981' },
                                            { label: '전체 게임', value: stats.totalGames, icon: 'fa-gamepad', color: '#f59e0b' },
                                        ].map((stat, i) => (
                                            <div key={i} style={{
                                                backgroundColor: '#0a0a0a', borderRadius: '12px',
                                                border: '1px solid #222', padding: '1.5rem'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px' }}>{stat.label}</div>
                                                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stat.value}</div>
                                                    </div>
                                                    <i className={`fa-solid ${stat.icon}`} style={{ fontSize: '2rem', color: stat.color, opacity: 0.6 }}></i>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Users Tab */}
                            {activeTab === 'users' && (
                                <div>
                                    <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>
                                        <i className="fa-solid fa-users" style={{ marginRight: '12px', color: '#3b82f6' }}></i>
                                        사용자 관리
                                    </h1>
                                    {/* Search Bar */}
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="이름 또는 이메일 검색..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                            style={{
                                                flex: 1, padding: '10px 16px', backgroundColor: '#111',
                                                border: '1px solid #333', borderRadius: '8px', color: 'white'
                                            }}
                                        />
                                        <select
                                            value={roleFilter}
                                            onChange={e => { setRoleFilter(e.target.value); }}
                                            style={{
                                                padding: '10px 16px', backgroundColor: '#111',
                                                border: '1px solid #333', borderRadius: '8px', color: 'white'
                                            }}
                                        >
                                            <option value="">모든 역할</option>
                                            <option value="USER">USER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                        <button onClick={handleSearch} style={{
                                            padding: '10px 20px', backgroundColor: '#2563eb', border: 'none',
                                            borderRadius: '8px', color: 'white', cursor: 'pointer'
                                        }}>검색</button>
                                    </div>
                                    {/* Users Table */}
                                    <div style={{ backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #222' }}>
                                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#888' }}>사용자</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#888' }}>이메일</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>역할</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>에셋</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>게임</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>작업</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(u => (
                                                    <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                                        <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                width: '36px', height: '36px', borderRadius: '50%',
                                                                backgroundColor: '#222', overflow: 'hidden'
                                                            }}>
                                                                {u.profileImage ? (
                                                                    <img src={u.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                                                                        <i className="fa-solid fa-user"></i>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span>{u.name}</span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: '#888' }}>{u.email}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <span style={{
                                                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem',
                                                                backgroundColor: u.role === 'ADMIN' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                                                                color: u.role === 'ADMIN' ? '#ef4444' : '#3b82f6'
                                                            }}>{u.role}</span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{u.assetCount}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{u.gameCount}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                {u.id !== user?.id && (
                                                                    <button
                                                                        onClick={() => handleRoleChange(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                                                                        style={{
                                                                            padding: '6px 12px', fontSize: '0.8rem', border: '1px solid #333',
                                                                            backgroundColor: 'transparent', color: '#888', borderRadius: '6px', cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        {u.role === 'ADMIN' ? '권한 해제' : '관리자 부여'}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleCleanupLibrary(u.email, u.name)}
                                                                    title="라이브러리 데이터 정리"
                                                                    style={{
                                                                        padding: '6px 10px', fontSize: '0.8rem', border: '1px solid #333',
                                                                        backgroundColor: 'transparent', color: '#eab308', borderRadius: '6px', cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <i className="fa-solid fa-broom"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Assets Tab */}
                            {activeTab === 'assets' && (
                                <div>
                                    <i className="fa-solid fa-cube" style={{ marginRight: '12px', color: '#10b981' }}></i>
                                    에셋 관리
                                    <button
                                        onClick={handleDeleteAllAssets}
                                        style={{
                                            marginLeft: 'auto',
                                            padding: '8px 16px',
                                            backgroundColor: '#ef4444',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                    >
                                        <i className="fa-solid fa-trash-can" style={{ marginRight: '8px' }}></i>
                                        에셋 전체 삭제
                                    </button>
                                </h1>
                                    {/* Search Bar */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="에셋 이름 검색..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    style={{
                                        flex: 1, padding: '10px 16px', backgroundColor: '#111',
                                        border: '1px solid #333', borderRadius: '8px', color: 'white'
                                    }}
                                />
                                <button onClick={handleSearch} style={{
                                    padding: '10px 20px', backgroundColor: '#2563eb', border: 'none',
                                    borderRadius: '8px', color: 'white', cursor: 'pointer'
                                }}>검색</button>
                            </div>
                            {/* Assets Table */}
                            <div style={{ backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #222' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#888' }}>에셋명</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: '#888' }}>작성자</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>가격</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>공개</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>생성일</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>작업</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assets.map(a => (
                                            <tr key={a.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                                <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '48px', height: '48px', borderRadius: '8px',
                                                        backgroundColor: '#222', overflow: 'hidden'
                                                    }}>
                                                        {a.imageUrl ? (
                                                            <img src={a.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.target as HTMLImageElement).src = 'https://placehold.co/48x48/1a1a1a/666?text=No'} />
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                                                                <i className="fa-solid fa-cube"></i>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span>{a.name}</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#888' }}>{a.authorName}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    {a.price > 0 ? `₩${a.price.toLocaleString()}` : '무료'}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span style={{ color: a.isPublic ? '#10b981' : '#888' }}>
                                                        {a.isPublic ? '공개' : '비공개'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#888' }}>
                                                    {new Date(a.createdAt).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleDeleteAsset(a.id, a.name)}
                                                        style={{
                                                            padding: '6px 12px', fontSize: '0.8rem', border: 'none',
                                                            backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444',
                                                            borderRadius: '6px', cursor: 'pointer'
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-trash" style={{ marginRight: '6px' }}></i>
                                                        삭제
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                            )}

                    {/* System Tab */}
                    {activeTab === 'system' && (
                        <div>
                            <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>
                                <i className="fa-solid fa-tools" style={{ marginRight: '12px', color: '#8b5cf6' }}></i>
                                시스템 도구
                            </h1>

                            <div style={{
                                backgroundColor: '#0a0a0a', borderRadius: '12px',
                                border: '1px solid #222', padding: '1.5rem', marginBottom: '2rem'
                            }}>
                                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                                    <i className="fa-solid fa-broom" style={{ marginRight: '10px', color: '#eab308' }}></i>
                                    데이터 정리
                                </h2>
                                <p style={{ color: '#888', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                                    오류로 인해 생성된 잘못된 라이브러리 항목(NULL 참조)을 정리합니다.<br />
                                    현재 로그인된 본인의 계정을 정리할 수 있습니다.
                                </p>

                                <button
                                    onClick={() => user?.email && handleCleanupLibrary(user.email, user.name)}
                                    style={{
                                        padding: '10px 20px', backgroundColor: '#eab308', border: 'none',
                                        borderRadius: '8px', color: 'black', fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <i className="fa-solid fa-broom"></i>
                                    내 라이브러리 정리하기
                                </button>
                            </div>

                            {/* Future tools can be added here */}
                            <div style={{
                                backgroundColor: '#0a0a0a', borderRadius: '12px',
                                border: '1px solid #222', padding: '1.5rem', opacity: 0.5
                            }}>
                                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#888' }}>
                                    <i className="fa-solid fa-hammer" style={{ marginRight: '10px' }}></i>
                                    준비 중인 기능
                                </h2>
                                <p style={{ color: '#666' }}>추가적인 시스템 관리 도구가 여기에 표시됩니다.</p>
                            </div>
                        </div>
                    )}
                </>
                    )}
            </main>
        </div>
        </div >
    );
}
