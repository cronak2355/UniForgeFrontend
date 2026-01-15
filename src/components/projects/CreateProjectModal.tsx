import React, { useState } from 'react';
import ReactDOM from 'react-dom';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string, description: string) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    isOpen,
    onClose,
    onCreate
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) return;
        setIsCreating(true);
        try {
            await onCreate(title, description);
        } catch (e) {
            console.error(e);
        } finally {
            setIsCreating(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-lg p-0 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-[#222] px-6 py-4 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <i className="fa-solid fa-plus-circle text-blue-500"></i>
                        New Project
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Visual Banner (Photoshop style) */}
                    <div className="h-24 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-white/5 flex items-center justify-center mb-4">
                        <div className="text-center">
                            <i className="fa-solid fa-layer-group text-3xl text-blue-400 mb-2"></i>
                            <p className="text-xs text-blue-300/70">Start creating your interactive world</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Project Title</label>
                            <input
                                type="text"
                                autoFocus
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-lg"
                                placeholder="Untitled Project"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Description <span className="text-gray-600 normal-case">(Optional)</span></label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none text-sm"
                                placeholder="What is this project about?"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#222] px-6 py-4 border-t border-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || isCreating}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 transform active:scale-95"
                    >
                        {isCreating ? (
                            <>
                                <i className="fa-solid fa-circle-notch fa-spin"></i>
                                Creating...
                            </>
                        ) : (
                            'Create Project'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};
