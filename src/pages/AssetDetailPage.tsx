import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marketplaceService, Asset, AssetVersion } from '../services/marketplaceService';

const AssetDetailPage = () => {
    const { assetId } = useParams<{ assetId: string }>();
    const navigate = useNavigate();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [versions, setVersions] = useState<AssetVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!assetId) return;
            try {
                const [assetData, versionsData] = await Promise.all([
                    marketplaceService.getAssetById(assetId),
                    marketplaceService.getAssetVersions(assetId)
                ]);
                setAsset(assetData);
                setVersions(versionsData);
            } catch (err) {
                setError('에셋을 불러오는데 실패했습니다.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [assetId]);

    if (loading) {
        return (
            <div style={{ backgroundColor: 'black', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <p>로딩 중...</p>
            </div>
        );
    }

    if (error || !asset) {
        return (
            <div style={{ backgroundColor: 'black', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <p>{error || '에셋을 찾을 수 없습니다.'}</p>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: 'black',
            minHeight: '100vh',
            color: 'white',
        }}>
            {/* Header */}
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
            </header>

            {/* Main Content */}
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '3rem' }}>
                    {/* Left: Asset Info */}
                    <div>
                        {/* Preview Image */}
                        <div style={{
                            width: '100%',
                            height: '400px',
                            backgroundColor: '#111',
                            borderRadius: '16px',
                            marginBottom: '2rem',
                            overflow: 'hidden',
                            border: '1px solid #333'
                        }}>
                            <img
                                src={asset.image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800"}
                                alt={asset.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>

                        {/* Description */}
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>설명</h2>
                        <p style={{ color: '#888', lineHeight: '1.8', marginBottom: '2rem' }}>
                            {asset.description || '이 에셋에 대한 설명이 없습니다.'}
                        </p>

                        {/* Versions */}
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>버전 히스토리</h2>
                        {versions.length === 0 ? (
                            <p style={{ color: '#666' }}>등록된 버전이 없습니다.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {versions.map((version) => (
                                    <div
                                        key={version.id}
                                        style={{
                                            padding: '1rem',
                                            backgroundColor: '#111',
                                            borderRadius: '8px',
                                            border: '1px solid #222',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600 }}>Version #{version.id}</span>
                                            <span style={{
                                                marginLeft: '1rem',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                backgroundColor: version.status === 'PUBLISHED' ? '#22c55e' : '#666',
                                                color: 'white'
                                            }}>
                                                {version.status}
                                            </span>
                                        </div>
                                        <span style={{ color: '#666', fontSize: '0.85rem' }}>
                                            {new Date(version.createdAt).toLocaleString('ko-KR')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Purchase Card */}
                    <div style={{ position: 'sticky', top: '2rem', height: 'fit-content' }}>
                        <div style={{
                            backgroundColor: '#111',
                            borderRadius: '16px',
                            border: '1px solid #333',
                            padding: '2rem',
                        }}>
                            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{asset.name}</h1>
                            <p style={{ color: '#888', marginBottom: '1.5rem' }}>by User {asset.authorId}</p>

                            <div style={{
                                fontSize: '2rem',
                                fontWeight: 700,
                                marginBottom: '1.5rem',
                                color: asset.price === 0 ? '#22c55e' : 'white'
                            }}>
                                {asset.price === 0 ? 'Free' : `₩${asset.price.toLocaleString()}`}
                            </div>

                            <button style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginBottom: '1rem'
                            }}>
                                <i className="fa-solid fa-download" style={{ marginRight: '8px' }}></i>
                                라이브러리에 추가
                            </button>

                            <button style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: 'transparent',
                                color: 'white',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}>
                                <i className="fa-solid fa-heart" style={{ marginRight: '8px' }}></i>
                                찜하기
                            </button>

                            <hr style={{ border: 'none', borderTop: '1px solid #222', margin: '1.5rem 0' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#888', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>등록일</span>
                                    <span>{new Date(asset.createdAt).toLocaleDateString('ko-KR')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>버전 수</span>
                                    <span>{versions.length}개</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AssetDetailPage;
