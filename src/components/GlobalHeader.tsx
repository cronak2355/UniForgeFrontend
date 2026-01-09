import React from 'react';
import { useNavigate } from 'react-router-dom';

const GlobalHeader = () => {
    const navigate = useNavigate();

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

            {/* Build Info - Visible only in Dev/Staging or if specifically requested */}
            <div style={{
                fontSize: '0.75rem',
                color: '#444',
                textAlign: 'right',
                fontFamily: 'monospace'
            }}>
                <div>Build: {commitHash}</div>
                <div>{buildTime}</div>
            </div>
        </header>
    );
};

export default GlobalHeader;
