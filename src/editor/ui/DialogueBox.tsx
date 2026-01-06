import { useState, useEffect } from "react";

interface Props {
    text: string;
    onClose: () => void;
}

export function DialogueBox({ text, onClose }: Props) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [text, onClose]);

    if (!visible) return null;

    return (
        <div style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            border: "2px solid #fff",
            fontSize: "16px",
            fontWeight: "bold",
            maxWidth: "80%",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}>
            {text}
            <style>{`
                @keyframes popIn {
                    from { transform: translateX(-50%) scale(0.8); opacity: 0; }
                    to { transform: translateX(-50%) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
