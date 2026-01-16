import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { marketplaceService } from '../services/marketplaceService';
import { CDN_URL } from '../services/assetService';

const CreateAssetPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        tags: [] as string[],
        assetType: '오브젝트',
        isPublic: true
    });
    const [currentTag, setCurrentTag] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);




    // Store technical metadata from Asset Editor
    const [technicalMetadata, setTechnicalMetadata] = useState<any>(null);

    // Handle incoming asset from Asset Editor
    useEffect(() => {
        if ((location.state as any)?.assetBlob) {
            const { assetBlob, assetName, thumbnailBlob, metadata } = (location.state as any);
            const fileName = `${assetName || 'New Asset'}.webp`; // Assuming we exported webp
            const newFile = new File([assetBlob], fileName, { type: 'image/webp' });

            setFile(newFile);
            setFormData(prev => ({
                ...prev,
                name: assetName || ''
            }));

            // Store metadata if provided
            if (metadata) {
                setTechnicalMetadata(metadata);
            }

            // Use independent thumbnail blob if available (Single Frame)
            if (thumbnailBlob) {
                const thumbFile = new File([thumbnailBlob], "thumbnail.png", { type: 'image/png' });
                setThumbnailFile(thumbFile);

                const reader = new FileReader();
                reader.onload = (e) => {
                    setThumbnailPreview(e.target?.result as string);
                };
                reader.readAsDataURL(thumbFile);
            } else {
                // Fallback: Use entire sprite sheet as thumbnail
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    setThumbnailPreview(result);
                    setThumbnailFile(newFile);
                };
                reader.readAsDataURL(newFile);
            }
        }
    }, [location.state]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? Number(value) : value
        }));
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setThumbnailFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setThumbnailPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault();
            const tag = currentTag.trim();
            if (tag && !formData.tags.includes(tag)) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...prev.tags, tag]
                }));
            }
            setCurrentTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    // Helper to map Korean labels to System Tags
    const resolveAssetType = (label: string) => {
        const map: Record<string, string> = {
            '캐릭터': 'Character',
            '배경/타일': 'Tile',
            '무기/장비': 'Item',
            '오브젝트': 'Prop',
            'VFX': 'Effect',
            'UI': 'UI',
            '사운드': 'Sound',
            '기타': 'Etc'
        };
        return map[label] || label;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('에셋 이름을 입력해주세요.');
            return;
        }

        if (!file) {
            setError('파일을 선택해주세요.');
            return;
        }

        // 로그인 체크
        if (!authService.isAuthenticated()) {
            setError('로그인이 필요합니다.');
            return;
        }

        setUploading(true);
        setError(null);
        setUploadProgress(10);

        try {
            // Prepare Description (Merge User Desc + Technical Metadata)
            let finalDescription = formData.description;
            if (technicalMetadata) {
                // If technical metadata exists, we wrap it.
                // We assume the system expects the ROOT JSON to contain frame info.
                // So we spread metadata and add a 'userDescription' field.
                const merged = {
                    ...technicalMetadata,
                    description: formData.description // keep user text in 'description' field within JSON
                };
                finalDescription = JSON.stringify(merged);
            }

            // Step 1: Create asset in DB
            // Step 1: Create or Update asset in DB
            setUploadProgress(20);

            let assetId = (location.state as any)?.assetId;
            let asset: any = null;

            if (assetId) {
                // UPDATE Mode
                console.log("[CreateAssetPage] Updating existing asset:", assetId);
                asset = await marketplaceService.updateAsset(assetId, {
                    name: formData.name,
                    price: formData.price,
                    description: finalDescription || null,
                    isPublic: formData.isPublic,
                    tags: formData.tags.join(','), // Assuming backend handles CSV or array? Check type.
                    assetType: resolveAssetType(formData.assetType),
                } as any);
            } else {
                // CREATE Mode
                console.log("[CreateAssetPage] Creating new asset");
                asset = await marketplaceService.createAsset({
                    name: formData.name,
                    price: formData.price,
                    description: finalDescription || null,
                    isPublic: formData.isPublic,
                    tags: formData.tags.join(','),
                    assetType: resolveAssetType(formData.assetType)
                });
                assetId = asset.id;
            }

            setUploadProgress(30);

            // Step 1.5: Upload Thumbnail (if exists)
            // NOTE: We must use the PROXY URL for the imageUrl to ensure it works across private buckets/CORS.
            if (thumbnailFile) {
                const { uploadUrl, s3Key } = await marketplaceService.getPresignedUrlForImage(assetId, thumbnailFile.type);
                if (uploadUrl && s3Key) {
                    await fetch(uploadUrl, {
                        method: 'PUT',
                        body: thumbnailFile,
                        headers: { 'Content-Type': thumbnailFile.type }
                    });

                    // IMPORTANT: Register the image resource in the backend!
                    await marketplaceService.registerImageResource({
                        ownerType: "ASSET",
                        ownerId: assetId,
                        imageType: "thumbnail",
                        s3Key: s3Key,
                        isActive: true
                    });

                    // Update asset with PROXY URL
                    // Update asset with PROXY URL -> CDN URL
                    // The backend proxy endpoint: /api/assets/s3/:id?imageType=thumbnail
                    // const proxyUrl = `https://uniforge.kr/api/assets/s3/${assetId}?imageType=thumbnail`;
                    const directUrl = `${CDN_URL}/${s3Key}`;
                    await marketplaceService.updateAsset(assetId, { imageUrl: directUrl });
                }
            }
            setUploadProgress(40);

            // Step 2: Create version to get versionId
            const version = await marketplaceService.createVersion(assetId);
            setUploadProgress(50);

            // Step 3: Get presigned upload URL
            const { uploadUrl, s3Key: responseKey } = await marketplaceService.getUploadUrl(assetId, version.id, file.name, file.type);
            console.log("[CreateAssetPage] Got Upload URL:", uploadUrl, "Key from Response:", responseKey);

            setUploadProgress(60);

            // Step 4: Upload file directly to S3
            const s3Response = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            if (!s3Response.ok) {
                throw new Error('S3 업로드에 실패했습니다.');
            }
            setUploadProgress(90);

            // Step 4.5: Register Main Image Resource (CRITICAL FIX)
            // Extract S3 Key from uploadUrl if responseKey is missing
            let mainS3Key: string | null = responseKey || null;

            if (!mainS3Key) {
                try {
                    const parsed = new URL(uploadUrl);
                    // Remove leading slash
                    mainS3Key = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
                    mainS3Key = decodeURIComponent(mainS3Key);
                    console.warn("[CreateAssetPage] s3Key missing in response, extracted from URL:", mainS3Key);
                } catch (e) {
                    console.warn("Failed to extract S3 Key from upload URL", e);
                }
            } else {
                console.log("[CreateAssetPage] Using trusted s3Key from response:", mainS3Key);
            }

            if (mainS3Key) {
                const isImageFile = file.type.startsWith('image/');
                console.log(`[CreateAssetPage] Main File Type: ${file.type}, isImage: ${isImageFile}, Key: ${mainS3Key}`);

                // Only register as "base" image if it IS an image
                if (isImageFile) {
                    await marketplaceService.registerImageResource({
                        ownerType: "ASSET",
                        ownerId: assetId,
                        imageType: "base",
                        s3Key: mainS3Key,
                        isActive: true
                    });

                    // Update asset with PROXY URL -> CDN URL
                    // Encode key parts to ensure URL is valid even with spaces
                    const cleanKey = mainS3Key.startsWith('/') ? mainS3Key.slice(1) : mainS3Key;
                    // Note: S3 keys might contain / that are separators. We should encode components if needed, 
                    // but simple encodeURI usually suffices for full paths unless special chars exist.
                    // Safer: split by / and encodeURIComponent each part.
                    const encodedKey = cleanKey.split('/').map(part => encodeURIComponent(part)).join('/');
                    const directUrl = `${CDN_URL}/${encodedKey}`;

                    console.log(`[CreateAssetPage] Updating Asset Image URL to: ${directUrl}`);
                    await marketplaceService.updateAsset(assetId, { imageUrl: directUrl });
                } else {
                    console.log("[CreateAssetPage] Main file is not an image, skipping imageUrl update.");
                }
            }

            // Step 5: Publish the version
            await marketplaceService.publishVersion(version.id);

            setUploadProgress(100);

            // Success!
            // Success!
            setTimeout(() => {
                const locState = (location.state as any);
                if (locState?.returnToEditor) {
                    // Navigate back to Editor
                    // If gameId is present, go to specific game. If not, go to /editor (loads autosave)
                    const targetPath = locState.gameId ? `/editor/${locState.gameId}` : '/editor';
                    navigate(`${targetPath}?newAssetId=${asset.id}`);
                } else {
                    // Navigate to Detail Page
                    navigate(`/assets/${asset.id}`);
                }
            }, 500);

        } catch (err) {
            setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
            setUploading(false);
        }
    };

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
            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    <i className="fa-solid fa-plus" style={{ marginRight: '12px', color: '#3b82f6' }}></i>
                    새 에셋 등록
                </h1>
                <p style={{ color: '#888', marginBottom: '2rem' }}>
                    마켓플레이스에 판매할 에셋을 업로드하세요.
                </p>

                <form onSubmit={handleSubmit}>

                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                        {/* Thumbnail Upload */}
                        <div style={{ width: '200px' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>대표 이미지 (썸네일)</label>
                            <div
                                onClick={() => thumbnailInputRef.current?.click()}
                                style={{
                                    width: '200px', height: '200px',
                                    borderRadius: '12px',
                                    border: '1px dashed #333',
                                    backgroundColor: '#111',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                            >
                                {thumbnailPreview ? (
                                    <img src={thumbnailPreview} alt="Thumbnail Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#666' }}>
                                        <i className="fa-solid fa-image" style={{ fontSize: '2rem', marginBottom: '8px' }}></i>
                                        <p style={{ fontSize: '0.8rem' }}>이미지 선택</p>
                                    </div>
                                )}
                                <input
                                    ref={thumbnailInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

                        {/* File Upload Area */}
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>에셋 파일 (ZIP, OBJ, FBX 등)</label>
                            <div
                                style={{
                                    border: `2px dashed ${dragActive ? '#3b82f6' : '#333'}`,
                                    borderRadius: '16px',
                                    padding: '3rem',
                                    textAlign: 'center',
                                    backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.1)' : '#0a0a0a',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    height: '200px',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                                }}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                    accept=".zip,.rar,.7z,.png,.jpg,.jpeg,.glb,.gltf,.fbx,.obj"
                                />

                                {file ? (
                                    <div>
                                        <i className="fa-solid fa-file-zipper" style={{ fontSize: '2.5rem', color: '#3b82f6', marginBottom: '1rem' }}></i>
                                        <p style={{ fontWeight: 600 }}>{file.name}</p>
                                        <p style={{ color: '#888', fontSize: '0.9rem' }}>
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2.5rem', color: '#666', marginBottom: '1rem' }}></i>
                                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>파일 업로드</p>
                                        <p style={{ color: '#666', fontSize: '0.8rem' }}>
                                            최대 100MB
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            에셋 이름 *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="예: Cyberpunk Character Pack"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            설명
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="에셋에 대한 상세 설명을 입력하세요..."
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            가격 (원)
                        </label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            min="0"
                            step="100"
                            placeholder="0 (무료)"
                            style={{
                                width: '200px',
                                padding: '12px 16px',
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                        <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            0을 입력하면 무료 에셋으로 등록됩니다.
                        </p>
                    </div>

                    {/* Asset Type Selection */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            카테고리 (타입)
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {['캐릭터', '배경/타일', '무기/장비', '오브젝트', 'VFX', 'UI', '사운드', '기타'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, assetType: type }))}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: formData.assetType === type ? '#3b82f6' : '#222',
                                        color: formData.assetType === type ? 'white' : '#ccc',
                                        border: '1px solid',
                                        borderColor: formData.assetType === type ? '#3b82f6' : '#333',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags Input */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            태그 (장르)
                        </label>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            padding: '12px',
                            backgroundColor: '#111',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            minHeight: '50px'
                        }}>
                            {formData.tags.map(tag => (
                                <span key={tag} style={{
                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                    color: '#3b82f6',
                                    padding: '4px 10px',
                                    borderRadius: '16px',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    #{tag}
                                    <i
                                        className="fa-solid fa-xmark"
                                        style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                                        onClick={() => removeTag(tag)}
                                    ></i>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={currentTag}
                                onChange={(e) => setCurrentTag(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder={formData.tags.length === 0 ? "태그 입력 후 Enter (예: 공포, RPG)" : ""}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    flex: 1,
                                    minWidth: '100px'
                                }}
                            />
                        </div>
                    </div>
                    {/* Visibility Toggle */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            공개 설정
                        </label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: formData.isPublic ? '#2563eb' : '#111',
                                    border: '1px solid',
                                    borderColor: formData.isPublic ? '#2563eb' : '#333',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <i className="fa-solid fa-globe"></i>
                                공개
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: !formData.isPublic ? '#2563eb' : '#111',
                                    border: '1px solid',
                                    borderColor: !formData.isPublic ? '#2563eb' : '#333',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <i className="fa-solid fa-lock"></i>
                                비공개
                            </button>
                        </div>
                        <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            {formData.isPublic ? '마켓플레이스에서 모든 사용자가 볼 수 있습니다.' : '나만 볼 수 있는 비공개 에셋입니다.'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            color: '#ef4444'
                        }}>
                            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
                            {error}
                        </div>
                    )}

                    {/* Progress Bar */}
                    {uploading && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{
                                height: '8px',
                                backgroundColor: '#222',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${uploadProgress}%`,
                                    backgroundColor: '#3b82f6',
                                    transition: 'width 0.3s'
                                }}></div>
                            </div>
                            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem', textAlign: 'center' }}>
                                업로드 중... {uploadProgress}%
                            </p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={uploading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            backgroundColor: uploading ? '#333' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {uploading ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                업로드 중...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-upload" style={{ marginRight: '8px' }}></i>
                                에셋 등록하기
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default CreateAssetPage;
