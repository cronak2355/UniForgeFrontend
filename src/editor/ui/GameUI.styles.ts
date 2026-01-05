export const styles = {
    overlayContainer: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none' as const, // 클릭이 게임 캔버스에 전달되도록
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'space-between',
        padding: '20px',
        boxSizing: 'border-box' as const,
    },

    // Status HUD
    hudContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
        pointerEvents: 'auto' as const, // HUD는 클릭 가능해도 됨 (옵션)
        width: '250px',
    },
    barContainer: {
        width: '100%',
        height: '16px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative' as const,
    },
    hpFill: (ratio: number) => ({
        width: `${ratio * 100}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #ff4d4d, #ff1a1a)',
        transition: 'width 0.2s ease-out',
    }),
    mpFill: (ratio: number) => ({
        width: `${ratio * 100}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #4d79ff, #1a53ff)',
        transition: 'width 0.2s ease-out',
    }),
    textOverlay: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: '#fff',
        textShadow: '1px 1px 1px #000',
        fontWeight: 'bold' as const,
    },
    scoreText: {
        fontSize: '18px',
        fontWeight: 'bold' as const,
        color: '#fbff00',
        textShadow: '2px 2px 2px #000',
        fontFamily: 'monospace',
    },

    // Dialogue Box
    dialogueContainer: {
        alignSelf: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        border: '2px solid #fff',
        borderRadius: '8px',
        padding: '16px 24px',
        marginBottom: '40px',
        maxWidth: '80%',
        pointerEvents: 'auto' as const,
        animation: 'fadeIn 0.2s ease-out',
    },
    dialogueText: {
        color: '#fff',
        fontSize: '16px',
        lineHeight: '1.5',
        textAlign: 'center' as const,
    },
    dialogueName: {
        color: '#fbff00',
        fontSize: '14px',
        fontWeight: 'bold' as const,
        marginBottom: '4px',
    },
};
