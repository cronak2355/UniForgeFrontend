import React, { useEffect, useState } from "react";

interface LoadingOverlayProps {
    isVisible: boolean;
    message: string;
}

export function LoadingOverlay({ isVisible, message }: LoadingOverlayProps) {
    const [dots, setDots] = useState(1);

    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setDots((prev) => (prev % 5) + 1);
        }, 400);

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    // Remove existing dots from the end of the message and append animated dots
    const cleanMessage = message.replace(/\.+$/, "");
    const animatedDots = ".".repeat(dots);

    return (
        <div style={{
            position: "absolute", // Changed from fixed to absolute
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "#000000",
            zIndex: 50, // Reduced zIndex to fit within editor panes
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontFamily: "sans-serif"
        }}>
            <div className="spinner" style={{
                width: "40px",
                height: "40px",
                border: "4px solid rgba(255, 255, 255, 0.3)",
                borderTop: "4px solid #ffffff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "20px"
            }}></div>
            <div style={{ fontSize: "18px", fontWeight: 500 }}>
                {cleanMessage}{animatedDots}
            </div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
