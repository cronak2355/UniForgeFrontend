import { memo } from 'react';

const Loading = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            backgroundColor: 'black',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: 'white'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <span className="gradient-text" style={{ fontSize: '2rem' }}>Uniforge</span>
                <div className="btn-loader" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#2563eb' }}></div>
            </div>
        </div>
    );
};

export default memo(Loading);
