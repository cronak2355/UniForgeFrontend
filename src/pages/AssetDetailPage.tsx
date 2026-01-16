import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { marketplaceService, Asset, AssetVersion } from '../services/marketplaceService';
import { libraryService } from '../services/libraryService';
import GlobalHeader from '../components/GlobalHeader';

import { getCloudFrontUrl } from '../utils/imageUtils';

const AssetDetailPage = () => {
    const { assetId } = useParams<{ assetId: string }>();
    const navigate = useNavigate();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [versions, setVersions] = useState<AssetVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const fetchAssetDetails = async () => {
            if (!assetId) return;
            try {
                setLoading(true);
                const [assetData, versionsData] = await Promise.all([
                    marketplaceService.getAssetById(assetId),
                    marketplaceService.getAssetVersions(assetId)
                ]);
                setAsset(assetData);
                setVersions(versionsData);
            } catch (err: any) {
                console.error(err);
                setError(err.message || '에셋을 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchAssetDetails();
    }, [assetId]);

    const handleAddToLibrary = async () => {
        if (!assetId) return;

        // 로그인 체크
        if (!authService.isAuthenticated()) {
            if (confirm('로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?')) {
                navigate('/auth');
            }
            return;
        }

        setIsAdding(true);
        try {
            await libraryService.addToLibrary(assetId, 'ASSET');
            alert('라이브러리에 성공적으로 추가되었습니다!');
        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes('401')) {
                alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                navigate('/auth');
            } else {
                alert(err.message || '라이브러리 추가에 실패했습니다.');
            }
        } finally {
            setIsAdding(false);
        }
    };

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
                {/* Visual debug info if relevant */}
                {error && error.includes('Server returned') && (
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
                        <p>서버 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
                    </div>
                )}
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
            <GlobalHeader />

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
                                src={getCloudFrontUrl(asset.imageUrl || asset.image) || "/placeholder-asset.png"}
                                alt={asset.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    e.currentTarget.src = "/placeholder-asset.png";
                                    e.currentTarget.onerror = null; // Prevent infinite loop
                                }}
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

                            <button
                                onClick={handleAddToLibrary}
                                disabled={isAdding}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    backgroundColor: isAdding ? '#4b5563' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: isAdding ? 'not-allowed' : 'pointer',
                                    marginBottom: '1rem'
                                }}
                            >
                                <i className={`fa-solid ${isAdding ? 'fa-spinner fa-spin' : 'fa-download'}`} style={{ marginRight: '8px' }}></i>
                                {isAdding ? '처리 중...' : '라이브러리에 추가'}
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
