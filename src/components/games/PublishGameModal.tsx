import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMyGames, updateGameInfo, GameSummary, uploadGameThumbnail } from '../../services/gameService';
import { getCloudFrontUrl } from '../../utils/imageUtils';

interface PublishGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (game: GameSummary) => void;
}

export const PublishGameModal: React.FC<PublishGameModalProps> = ({ isOpen, onClose, onPublish }) => {
    const { user } = useAuth();
    const [step, setStep] = useState<1 | 2>(1); // 1: Select, 2: Edit & Confirm
    const [myGames, setMyGames] = useState<GameSummary[]>([]);
    const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);

    // Edit Form State
    const [editTitle, setEditTitle] = useState("");
    const [editDesc, setEditDesc] = useState("");

    // Thumbnail State
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && user) {
            loadGames();
            setStep(1);
            setSelectedGame(null);
            setThumbnailFile(null);
            setThumbnailPreview(null);
        }
    }, [isOpen, user]);

    const loadGames = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const games = await fetchMyGames(user.id);
            setMyGames(games);
        } catch (e) {
            console.error("Failed to load games", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectGame = (game: GameSummary) => {
        setSelectedGame(game);
        setEditTitle(game.title);
        setEditDesc(game.description || "");

        // Initial preview from existing URL
        if (game.thumbnailUrl) {
            setThumbnailPreview(getCloudFrontUrl(game.thumbnailUrl));
        } else {
            setThumbnailPreview(null);
        }
        setThumbnailFile(null);

        setStep(2);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setThumbnailFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setThumbnailPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePublish = async () => {
        if (!selectedGame) return;
        setPublishing(true);
        try {
            // 1. Upload Thumbnail if changed
            let finalThumbnailUrl = selectedGame.thumbnailUrl;
            if (thumbnailFile) {
                finalThumbnailUrl = await uploadGameThumbnail(selectedGame.gameId, thumbnailFile);
            }

            // 2. Update Info & Set Public
            // Note: uploadGameThumbnail returns the full CloudFront URL, 
            // updateGameInfo expects simple update. 
            // Actually uploadGameThumbnail calls updateGameInfo internally too? 
            // No, my implementation of uploadGameThumbnail calls updateGameInfo, 
            // BUT here we call it again for title/desc and verify isPublic.
            // It's redundant but safe. 

            const updated = await updateGameInfo(
                selectedGame.gameId,
                editTitle,
                editDesc,
                finalThumbnailUrl || undefined, // undefined to ignore if no change? 
                // Wait, if finalThumbnailUrl is null/empty but was previous string, we want to keep it?
                // logic: if thumbnailFile exists, use new URL. 
                // if not, pass undefined to keep existing? 
                // In updateGameInfo: if undefined, it skips update. Correct.

                true // Set isPublic = true
            );

            onPublish(updated);
            onClose();
        } catch (e) {
            console.error("Publish failed", e);
            alert("게임 게시 실패: " + (e instanceof Error ? e.message : "Unknown error"));
        } finally {
            setPublishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#111]">
                    <h2 className="text-xl font-bold text-white">
                        <i className="fa-solid fa-cloud-arrow-up mr-2 text-blue-500"></i>
                        게임 게시하기
                    </h2>
                    <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {step === 1 ? (
                        /* Step 1: Select Game */
                        <div>
                            <h3 className="text-white font-semibold mb-4">게시할 프로젝트 선택</h3>
                            {loading ? (
                                <div className="text-center py-10 text-[#666]">
                                    <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
                                </div>
                            ) : myGames.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {myGames.map(game => (
                                        <div
                                            key={game.gameId}
                                            onClick={() => handleSelectGame(game)}
                                            className="bg-[#111] border border-[#333] rounded-lg p-3 hover:border-blue-500 cursor-pointer transition-all hover:bg-[#161616] group flex gap-3"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-24 h-16 bg-black rounded overflow-hidden flex-shrink-0 border border-[#222]">
                                                {game.thumbnailUrl ? (
                                                    <img src={getCloudFrontUrl(game.thumbnailUrl)} alt={game.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[#444]">
                                                        <i className="fa-solid fa-image"></i>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-gray-200 truncate group-hover:text-blue-400 transition-colors">
                                                    {game.title}
                                                </div>
                                                <div className="text-xs text-[#666] mt-1">
                                                    {new Date(game.createdAt).toLocaleDateString()}
                                                </div>
                                                {game.isPublic && (
                                                    <span className="inline-block mt-2 text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-900/50">
                                                        PUBLISHED
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-[#666]">
                                    생성된 프로젝트가 없습니다.
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Step 2: Edit Metadata */
                        <div>
                            <button onClick={() => setStep(1)} className="text-[#666] hover:text-white mb-4 text-sm flex items-center gap-1">
                                <i className="fa-solid fa-arrow-left"></i> 프로젝트 다시 선택
                            </button>

                            <div className="space-y-6">
                                {/* Thumbnail Upload */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">썸네일</label>
                                    <div className="flex gap-4">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-48 h-28 bg-[#111] border border-dashed border-[#444] rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 overflow-hidden relative group transition-colors"
                                        >
                                            {thumbnailPreview ? (
                                                <>
                                                    <img src={thumbnailPreview} className="w-full h-full object-cover" alt="Preview" />
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <i className="fa-solid fa-pen text-white"></i>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center text-gray-500">
                                                    <i className="fa-solid fa-image mb-1 text-xl"></i>
                                                    <div className="text-xs">이미지 업로드</div>
                                                </div>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </div>
                                        <div className="flex-1 text-xs text-gray-500 flex flex-col justify-center">
                                            <p className="mb-1"><span className="text-blue-400 font-semibold">Tip:</span> 게임을 잘 표현하는 이미지를 선택하세요.</p>
                                            <p>권장 사이즈: 1920x1080 (16:9)</p>
                                            <p>지원 형식: JPG, PNG, WEBP</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">게임 제목</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-1">게임 설명</label>
                                    <textarea
                                        value={editDesc}
                                        onChange={e => setEditDesc(e.target.value)}
                                        rows={4}
                                        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white outline-none focus:border-blue-500 text-sm transition-colors resize-none"
                                        placeholder="게임에 대한 설명을 입력하세요..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#333] bg-[#111] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-[#888] hover:text-white hover:bg-[#222] transition-colors font-medium text-sm"
                    >
                        취소
                    </button>
                    {step === 2 && (
                        <button
                            onClick={handlePublish}
                            disabled={publishing || !editTitle.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {publishing && <i className="fa-solid fa-spinner fa-spin"></i>}
                            {publishing ? '게시 중...' : '게시하기'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
