import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GlobalHeader = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const isDev = import.meta.env.DEV;
    const commitHash = __COMMIT_HASH__;
    const buildTime = __BUILD_TIME__;

    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            borderBottom: '1px solid #1a1a1a',
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                    }}
                >
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/main')}>
                    <i className="fa-solid fa-cube" style={{ marginRight: '10px', color: '#3b82f6' }}></i>
                    <span className="gradient-text">Uniforge</span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* Build Info */}
                <div style={{
                    fontSize: '0.75rem',
                    color: '#444',
                    textAlign: 'right',
                    fontFamily: 'monospace'
                }}>
                    <div>Build: {commitHash}</div>
                    <div>{buildTime}</div>
                </div>

                {/* Auth State */}
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>{user.name}</span>
                        <button
                            onClick={logout}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: '#ccc',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            로그아웃
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/auth')}
                        style={{
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}
                    >
                        로그인
                    </button>
                )}
            </div>
        </header>
    );
};

export default GlobalHeader;
