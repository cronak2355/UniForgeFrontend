import React, { useState, useEffect } from 'react';
import { ART_STYLES, THEMES, MOODS, CATEGORY_PREFIXES } from '../data/AiStyles';
import { Asset } from '../../editor/types/Asset';

interface AiWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string, category: string, metadata: any) => Promise<void>;
}

export const AiWizardModal: React.FC<AiWizardModalProps> = ({ isOpen, onClose, onGenerate }) => {
    const [step, setStep] = useState(1);
    const [category, setCategory] = useState<'CHARACTER' | 'OBJECT' | 'FX' | 'TILE' | null>(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Project Style Persistence (Mock implementation for now, ideally from Context)
    const [useProjectStyle, setUseProjectStyle] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setCategory(null);
            setUserPrompt('');
            // Reset or load project default?
            if (useProjectStyle) {
                // Load from storage/context
            }
        }
    }, [isOpen]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleGenerate = async () => {
        if (!category || !userPrompt) return;
        setIsGenerating(true);

        const categoryPrefix = CATEGORY_PREFIXES[category];
        const styleModifier = ART_STYLES.find(s => s.id === selectedStyle)?.promptModifier || '';
        const themeModifier = THEMES.find(t => t.id === selectedTheme)?.promptModifier || '';
        const moodModifier = MOODS.find(m => m.id === selectedMood)?.promptModifier || '';

        // Construct complete prompt
        // Order: Category Base + User Description + Style + Theme + Mood + (Quality Boosters)
        const finalPrompt = `${categoryPrefix}, ${userPrompt}, ${styleModifier}, ${themeModifier}, ${moodModifier}, white background, isolated, high quality`;

        const metadata = {
            category,
            userPrompt,
            style: selectedStyle,
            theme: selectedTheme,
            mood: selectedMood
        };

        try {
            await onGenerate(finalPrompt, category, metadata);
            onClose();
        } catch (e) {
            console.error("Generation failed", e);
            alert("Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                width: '800px', height: '600px', background: '#1a1a1a',
                borderRadius: '16px', border: '1px solid #333',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                color: 'white', fontFamily: 'system-ui, sans-serif'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px', borderBottom: '1px solid #333',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>AI Asset Wizard</h2>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                            Step {step} of 3: {step === 1 ? 'Select Category' : step === 2 ? 'Description' : 'Style & Vibe'}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>

                    {/* STEP 1: CATEGORY */}
                    {step === 1 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', height: '100%' }}>
                            {(['CHARACTER', 'OBJECT', 'FX'] as const).map(cat => (
                                <div
                                    key={cat}
                                    onClick={() => { setCategory(cat); handleNext(); }}
                                    style={{
                                        border: '2px solid #333', borderRadius: '12px',
                                        background: '#222', cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
                                >
                                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>
                                        {cat === 'CHARACTER' ? '🤺' : cat === 'OBJECT' ? '📦' : '✨'}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '18px' }}>{cat}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: PROMPT */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                            <div style={{ textAlign: 'center', fontSize: '18px', marginBottom: '10px' }}>
                                Describe your {category?.toLowerCase()}:
                            </div>
                            <textarea
                                value={userPrompt}
                                onChange={e => setUserPrompt(e.target.value)}
                                placeholder={`e.g., A flaming sword suitable for a warrior...`}
                                style={{
                                    flex: 1, background: '#111', border: '1px solid #444',
                                    borderRadius: '8px', padding: '16px', color: 'white', fontSize: '16px', resize: 'none'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button onClick={handleBack} style={{ padding: '10px 20px', borderRadius: '8px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>Back</button>
                                <button
                                    onClick={handleNext}
                                    disabled={!userPrompt.trim()}
                                    style={{
                                        padding: '10px 30px', borderRadius: '8px',
                                        background: userPrompt.trim() ? '#3b82f6' : '#222',
                                        color: userPrompt.trim() ? 'white' : '#666', border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: STYLE & VIBE */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Art Style */}
                            <div>
                                <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>ART STYLE</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                                    {ART_STYLES.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => setSelectedStyle(s.id)}
                                            style={{
                                                padding: '10px', borderRadius: '8px', cursor: 'pointer',
                                                border: selectedStyle === s.id ? '2px solid #3b82f6' : '1px solid #333',
                                                background: selectedStyle === s.id ? 'rgba(59, 130, 246, 0.2)' : '#222',
                                                textAlign: 'center'
                                            }}
                                        >
                                            <div style={{ fontSize: '12px', fontWeight: 600 }}>{s.label}</div>
                                            {/* Placeholder for Image: <img src={s.imageUrl} ... /> */}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Theme */}
                            <div>
                                <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>THEME</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {THEMES.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => setSelectedTheme(t.id)}
                                            style={{
                                                padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
                                                border: selectedTheme === t.id ? '1px solid #3b82f6' : '1px solid #444',
                                                background: selectedTheme === t.id ? '#3b82f6' : 'transparent',
                                                color: selectedTheme === t.id ? 'white' : '#ccc'
                                            }}
                                        >
                                            {t.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mood */}
                            <div>
                                <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>MOOD</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {MOODS.map(m => (
                                        <div
                                            key={m.id}
                                            onClick={() => setSelectedMood(m.id)}
                                            style={{
                                                padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
                                                border: selectedMood === m.id ? '1px solid #a855f7' : '1px solid #444',
                                                background: selectedMood === m.id ? '#a855f7' : 'transparent',
                                                color: selectedMood === m.id ? 'white' : '#ccc'
                                            }}
                                        >
                                            {m.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                                <button onClick={handleBack} style={{ padding: '10px 20px', borderRadius: '8px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>Back</button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    style={{
                                        padding: '10px 40px', borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
                                        color: 'white', border: 'none', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '16px',
                                        opacity: isGenerating ? 0.7 : 1
                                    }}
                                >
                                    {isGenerating ? 'Generating...' : '✨ Generate Asset'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
