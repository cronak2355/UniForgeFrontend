import { useRef, useEffect } from 'react';
import './AIStudioTab.css';

// Types
export interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

export interface StylePreset {
    id: string;
    name: string;
}

export interface AIStudioTabProps {
    // Chat state
    chatMessages: ChatMessage[];
    isLoading: boolean;

    // Prompt state
    aiPrompt: string;
    onPromptChange: (value: string) => void;

    // Settings
    assetType: 'character' | 'object' | 'effect';
    onAssetTypeChange: (type: 'character' | 'object' | 'effect') => void;

    featherAmount: number;
    onFeatherChange: (value: number) => void;

    // Style presets
    visualStyles: StylePreset[];
    themes: StylePreset[];
    moods: StylePreset[];

    selectedStyleId: string;
    onStyleChange: (id: string) => void;

    selectedThemeId: string;
    onThemeChange: (id: string) => void;

    selectedMoodId: string;
    onMoodChange: (id: string) => void;

    // Actions
    onGenerate: () => void;
    onRefine: () => void;
    onRemoveBg: () => void;
}

export function AIStudioTab({
    chatMessages,
    isLoading,
    aiPrompt,
    onPromptChange,
    assetType,
    onAssetTypeChange,
    featherAmount,
    onFeatherChange,
    visualStyles,
    themes,
    moods,
    selectedStyleId,
    onStyleChange,
    selectedThemeId,
    onThemeChange,
    selectedMoodId,
    onMoodChange,
    onGenerate,
    onRefine,
    onRemoveBg,
}: AIStudioTabProps) {
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onGenerate();
        }
    };

    return (
        <div className="ai-studio">
            {/* Chat Area */}
            <div ref={chatContainerRef} className="ai-chat-area">
                {chatMessages.length === 0 && (
                    <div className="ai-chat-empty">
                        <span className="ai-chat-empty-icon">✨</span>
                        <p className="ai-chat-empty-text">Generator Ready</p>
                    </div>
                )}

                {chatMessages.map(msg => (
                    <div
                        key={msg.id}
                        className={`ai-message ai-message--${msg.role}`}
                    >
                        <div className={`ai-message-bubble ai-message-bubble--${msg.role}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="ai-loading">
                        <div className="ai-loading-bubble">
                            <div className="ai-loading-dot" />
                            <div className="ai-loading-dot" />
                            <div className="ai-loading-dot" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="ai-input-area">
                {/* Style Settings */}
                <div className="ai-settings">
                    {/* Visual Style */}
                    <div className="ai-setting-row">
                        <span className="ai-setting-label">Style</span>
                        <select
                            className="ai-setting-select"
                            value={selectedStyleId}
                            onChange={(e) => onStyleChange(e.target.value)}
                        >
                            {visualStyles.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                            <option value="">(None)</option>
                        </select>
                    </div>

                    {/* Theme */}
                    <div className="ai-setting-row">
                        <span className="ai-setting-label">Theme</span>
                        <select
                            className="ai-setting-select"
                            value={selectedThemeId}
                            onChange={(e) => onThemeChange(e.target.value)}
                        >
                            {themes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                            <option value="">(None)</option>
                        </select>
                    </div>

                    {/* Mood */}
                    <div className="ai-setting-row">
                        <span className="ai-setting-label">Mood</span>
                        <select
                            className="ai-setting-select"
                            value={selectedMoodId}
                            onChange={(e) => onMoodChange(e.target.value)}
                        >
                            {moods.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                            <option value="">(None)</option>
                        </select>
                    </div>
                </div>

                {/* Controls Row */}
                <div className="ai-controls-row">
                    {/* Type Selector */}
                    <div className="ai-type-selector">
                        {(['character', 'object', 'effect'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => onAssetTypeChange(t)}
                                className={`ai-type-btn ${assetType === t ? 'ai-type-btn--active' : 'ai-type-btn--inactive'}`}
                                title={t}
                            >
                                {t === 'character' ? 'CHAR' : t === 'object' ? 'OBJ' : 'FX'}
                            </button>
                        ))}
                    </div>

                    {/* Feather Slider */}
                    <div className="ai-feather-row">
                        <span className="ai-feather-label">Feather / Tol</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={featherAmount}
                            onChange={e => onFeatherChange(Number(e.target.value))}
                            className="ai-feather-slider"
                        />
                        <span className="ai-feather-value">{featherAmount}</span>
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="ai-prompt-wrapper">
                    <div className="ai-prompt-container">
                        <div className="ai-prompt-glow" />
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => onPromptChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe asset..."
                            rows={3}
                            className="ai-prompt-textarea"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="ai-actions">
                        <button onClick={onGenerate} className="ai-generate-btn">
                            <span className="ai-generate-btn-content">
                                <span>✨ Generate Asset</span>
                            </span>
                            <div className="ai-generate-btn-hover" />
                        </button>

                        <div className="ai-secondary-btns">
                            <button onClick={onRefine} className="ai-refine-btn">
                                Refine Selected
                            </button>
                            <button onClick={onRemoveBg} className="ai-remove-bg-btn">
                                Remove BG
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
