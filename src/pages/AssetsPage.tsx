import { useNavigate } from 'react-router-dom';

const AssetsPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            backgroundColor: 'black',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            color: 'white'
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                border: '1px solid #333',
                margin: '20px auto 0',
                width: '95%',
                maxWidth: '1200px',
                borderRadius: '16px',
                backgroundColor: '#0a0a0a'
            }}>
                <div
                    style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={() => navigate('/main')}
                >
                    <span className="gradient-text">Uniforge</span>
                </div>
            </header>
            <main style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem'
                }}>🎨</div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 600 }}>Store</h1>
                <p style={{ color: '#888', fontSize: '1.1rem' }}>
                    다양한 게임 에셋을 탐색하고 다운로드하세요.
                </p>
                <p style={{
                    color: '#555',
                    fontSize: '0.9rem',
                    marginTop: '2rem',
                    padding: '1rem 2rem',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    backgroundColor: '#0a0a0a'
                }}>
                    🚧 준비 중인 페이지입니다
                </p>
            </main>
        </div>
    );
};

export default AssetsPage;
