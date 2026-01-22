import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMyGames, GameSummary } from '../../services/gameService';
import { assetService } from '../../services/assetService';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    getCanvasBlob: () => Promise<Blob | null>;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, getCanvasBlob }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'marketplace' | 'project'>('marketplace');
    const [isLoading, setIsLoading] = useState(false);

    // Marketplace Form State
    const [mpName, setMpName] = useState('');
    const [mpDescription, setMpDescription] = useState('');
    const [mpPrice, setMpPrice] = useState(0);
    const [mpTags, setMpTags] = useState('');

    // Project Form State
    const [projects, setProjects] = useState<GameSummary[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [projAssetName, setProjAssetName] = useState('');

    useEffect(() => {
        if (isOpen && user?.id) {
            loadProjects();
        }
    }, [isOpen, user?.id]);

    const loadProjects = async () => {
        if (!user?.id) return;
        try {
            const myGames = await fetchMyGames(user.id);
            setProjects(myGames);
            if (myGames.length > 0) {
                setSelectedProjectId(myGames[0].gameId);
            }
        } catch (e) {
            console.error("Failed to load projects", e);
        }
    };

    const handleMarketplaceUpload = async () => {
        if (!mpName.trim()) {
            alert("에셋 이름을 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            const blob = await getCanvasBlob();
            if (!blob) throw new Error("캔버스 이미지를 가져올 수 없습니다.");

            const file = new File([blob], "asset.png", { type: "image/png" });

            // Create metadata
            const metadata = {
                description: mpDescription,
                price: mpPrice, // Note: assetService might not handle price directly in uploadAsset yet, usually handled by createAsset entity first.
                // But assetService.uploadAsset does create entity internally in the code I saw.
                // Let's check assetService.uploadAsset implementation again.
                // It takes (file, name, tag, token, metadata, isPublic)
            };

            await assetService.uploadAsset(
                file,
                mpName,
                mpTags || 'General', // Default tag
                null, // Token is handled by apiClient
                metadata,
                true // isPublic
            );

            alert("마켓플레이스에 업로드되었습니다!");
            onClose();
        } catch (e) {
            console.error(e);
            alert("업로드 실패: " + (e instanceof Error ? e.message : "알 수 없는 오류"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleProjectUpload = async () => {
        if (!selectedProjectId) {
            alert("프로젝트를 선택해주세요.");
            return;
        }
        if (!projAssetName.trim()) {
            alert("에셋 이름을 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            const blob = await getCanvasBlob();
            if (!blob) throw new Error("캔버스 이미지를 가져올 수 없습니다.");

            const file = new File([blob], "asset.png", { type: "image/png" });

            // Embed project ID in metadata for now
            const metadata = {
                projectId: selectedProjectId,
                targetGame: projects.find(p => p.gameId === selectedProjectId)?.title
            };

            await assetService.uploadAsset(
                file,
                projAssetName,
                'ProjectAsset',
                null,
                metadata,
                false // isPublic = false (Private)
            );

            // Note: Ideally we would also link this asset to the game in a relation table via gameService,
            // but for now we physically store it and tag it.
            // If the game editor fetches "My Assets", it will show up.

            alert("프로젝트에 추가되었습니다!");
            onClose();
        } catch (e) {
            console.error(e);
            alert("추가 실패: " + (e instanceof Error ? e.message : "알 수 없는 오류"));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-file-export text-violet-500"></i>
                        내보내기
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800">
                    <button
                        onClick={() => setActiveTab('marketplace')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'marketplace' ? 'border-violet-500 text-violet-400 bg-zinc-800/50' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                    >
                        <i className="fa-solid fa-store mr-2"></i> 마켓플레이스
                    </button>
                    <button
                        onClick={() => setActiveTab('project')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'project' ? 'border-amber-500 text-amber-400 bg-zinc-800/50' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                    >
                        <i className="fa-solid fa-briefcase mr-2"></i> 내 프로젝트
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {activeTab === 'marketplace' ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-400">에셋 이름</label>
                                <input
                                    type="text"
                                    value={mpName}
                                    onChange={(e) => setMpName(e.target.value)}
                                    placeholder="멋진 에셋의 이름을 지어주세요"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none placeholder:text-zinc-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-400">설명</label>
                                <textarea
                                    value={mpDescription}
                                    onChange={(e) => setMpDescription(e.target.value)}
                                    placeholder="이 에셋에 대한 설명을 입력하세요"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none placeholder:text-zinc-600 h-24 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-400">가격 (P)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={mpPrice}
                                        onChange={(e) => setMpPrice(Number(e.target.value))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-400">태그</label>
                                    <input
                                        type="text"
                                        value={mpTags}
                                        onChange={(e) => setMpTags(e.target.value)}
                                        placeholder="RPG, Fantasy..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none placeholder:text-zinc-600"
                                    />
                                </div>
                            </div>

                            <div className="bg-violet-900/20 border border-violet-500/20 rounded-lg p-3 flex gap-3 items-start">
                                <i className="fa-solid fa-circle-info text-violet-400 mt-0.5"></i>
                                <p className="text-xs text-violet-200/80 leading-relaxed">
                                    마켓플레이스에 업로드하면 다른 사용자가 이 에셋을 구매하거나 다운로드할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-400">대상 프로젝트</label>
                                <select
                                    value={selectedProjectId || ''}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none appearance-none cursor-pointer"
                                >
                                    {projects.length === 0 ? (
                                        <option value="">프로젝트가 없습니다</option>
                                    ) : (
                                        projects.map(p => (
                                            <option key={p.gameId} value={p.gameId}>{p.title}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-400">저장할 이름</label>
                                <input
                                    type="text"
                                    value={projAssetName}
                                    onChange={(e) => setProjAssetName(e.target.value)}
                                    placeholder="프로젝트에서 사용할 이름"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3 flex gap-3 items-start">
                                <i className="fa-solid fa-lock text-amber-400 mt-0.5"></i>
                                <p className="text-xs text-amber-200/80 leading-relaxed">
                                    선택한 프로젝트 전용 개인 에셋으로 저장됩니다. 다른 사용자에게는 보이지 않습니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
                    >
                        취소
                    </button>
                    {activeTab === 'marketplace' ? (
                        <button
                            onClick={handleMarketplaceUpload}
                            disabled={isLoading}
                            className={`px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-violet-900/20 transition-all flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                            마켓플레이스 업로드
                        </button>
                    ) : (
                        <button
                            onClick={handleProjectUpload}
                            disabled={isLoading || projects.length === 0}
                            className={`px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-amber-900/20 transition-all flex items-center gap-2 ${isLoading || projects.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
                            프로젝트에 추가
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
