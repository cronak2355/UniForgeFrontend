import React, { memo, useEffect, useState } from 'react';
import { styles } from './GameUI.styles';

interface DialogueBoxProps {
    text: string | null;
    speaker?: string; // Optional speaker name
    duration?: number; // Auto-close duration
    onClose: () => void;
}

export const DialogueBox = memo(function DialogueBox({ text, speaker, duration = 3000, onClose }: DialogueBoxProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (text) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [text, duration, onClose]);

    if (!visible || !text) return null;

    return (
        <div style={styles.dialogueContainer}>
            {speaker && <div style={styles.dialogueName}>{speaker}</div>}
            <div style={styles.dialogueText}>
                {text}
            </div>
        </div>
    );
});
