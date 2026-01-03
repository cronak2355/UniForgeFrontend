import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const CreateAssetPage = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0
    });
    const [file, setFile] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? parseInt(value) || 0 : value
        }));
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (selectedFile: File) => {
        setFile(selectedFile);

        // Generate preview for images
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewImage(e.target?.result as string);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            setPreviewImage(null);
        }
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

        setUploading(true);
        setError(null);
        setUploadProgress(10);

        try {
            // Step 1: Create asset in DB
            setUploadProgress(20);
            const createResponse = await fetch(
                `${API_BASE_URL}/assets?authorId=1&name=${encodeURIComponent(formData.name)}&price=${formData.price}&description=${encodeURIComponent(formData.description || '')}`,
                { method: 'POST' }
            );

            if (!createResponse.ok) {
                throw new Error('에셋 생성에 실패했습니다.');
            }

            const asset = await createResponse.json();
            setUploadProgress(40);

            // Step 2: Create version to get versionId
            const versionResponse = await fetch(
                `${API_BASE_URL}/assets/${asset.id}/versions`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ s3RootPath: 'pending' })
                }
            );

            if (!versionResponse.ok) {
                throw new Error('버전 생성에 실패했습니다.');
            }

            const version = await versionResponse.json();
            setUploadProgress(50);

            // Step 3: Get presigned upload URL
            const uploadUrlResponse = await fetch(
                `${API_BASE_URL}/assets/${asset.id}/versions/${version.id}/upload-url?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
            );

            if (!uploadUrlResponse.ok) {
                throw new Error('업로드 URL 생성에 실패했습니다.');
            }

            const { uploadUrl } = await uploadUrlResponse.json();
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

            // Step 5: Publish the version
            await fetch(`${API_BASE_URL}/assets/versions/${version.id}/publish`, {
                method: 'POST'
            });

            setUploadProgress(100);

            // Success! Navigate to the new asset
            setTimeout(() => {
                navigate(`/assets/${asset.id}`);
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
                    {/* File Upload Area */}
                    <div
                        style={{
                            border: `2px dashed ${dragActive ? '#3b82f6' : '#333'}`,
                            borderRadius: '16px',
                            padding: '3rem',
                            textAlign: 'center',
                            marginBottom: '2rem',
                            backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.1)' : '#0a0a0a',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
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
                                {previewImage ? (
                                    <img
                                        src={previewImage}
                                        alt="Preview"
                                        style={{
                                            maxWidth: '200px',
                                            maxHeight: '200px',
                                            borderRadius: '8px',
                                            marginBottom: '1rem'
                                        }}
                                    />
                                ) : (
                                    <i className="fa-solid fa-file-zipper" style={{ fontSize: '4rem', color: '#3b82f6', marginBottom: '1rem' }}></i>
                                )}
                                <p style={{ fontWeight: 600 }}>{file.name}</p>
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        ) : (
                            <div>
                                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '3rem', color: '#666', marginBottom: '1rem' }}></i>
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>파일을 드래그하거나 클릭하여 선택</p>
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                                    ZIP, RAR, PNG, JPG, GLB, FBX, OBJ 지원 (최대 100MB)
                                </p>
                            </div>
                        )}
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
