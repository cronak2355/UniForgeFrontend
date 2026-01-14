import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface SaveGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, description: string) => void;
    initialTitle?: string;
    initialDescription?: string;
    isSaving?: boolean;
}

export const SaveGameModal: React.FC<SaveGameModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialTitle = '',
    initialDescription = '',
    isSaving = false
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        console.error("[SaveGameModal] Mounted");
        setMounted(true);
        return () => {
            console.error("[SaveGameModal] Unmounted");
            setMounted(false);
        }
    }, []);

    useEffect(() => {
        console.error("[SaveGameModal] isOpen changed:", isOpen);
        if (isOpen) {
            setTitle(initialTitle);
            setDescription(initialDescription);
        }
    }, [isOpen, initialTitle, initialDescription]);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl relative">

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <i className="fa-solid fa-floppy-disk text-blue-500"></i>
                    프로젝트 저장
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[#222] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="게임 제목을 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">설명</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-[#222] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors h-32 resize-none"
                            placeholder="게임에 대한 설명을 입력하세요"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        disabled={isSaving}
                    >
                        취소
                    </button>
                    <button
                        onClick={() => onSave(title, description)}
                        disabled={!title.trim() || isSaving}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                저장 중...
                            </>
                        ) : (
                            '저장하기'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};
