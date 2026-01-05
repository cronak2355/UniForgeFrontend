import React, { memo } from 'react';
import { styles } from './GameUI.styles';

interface StatusHUDProps {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    score: number;
}

export const StatusHUD = memo(function StatusHUD({ hp, maxHp, mp, maxMp, score }: StatusHUDProps) {
    const hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const mpRatio = maxMp > 0 ? Math.max(0, Math.min(1, mp / maxMp)) : 0;

    return (
        <div style={styles.hudContainer}>
            {/* Score */}
            <div style={styles.scoreText}>
                SCORE: {score.toLocaleString()}
            </div>

            {/* HP Bar */}
            <div style={styles.barContainer}>
                <div style={styles.hpFill(hpRatio)} />
                <div style={styles.textOverlay}>
                    HP {Math.ceil(hp)} / {maxHp}
                </div>
            </div>

            {/* MP Bar */}
            <div style={styles.barContainer}>
                <div style={styles.mpFill(mpRatio)} />
                <div style={styles.textOverlay}>
                    MP {Math.ceil(mp)} / {maxMp}
                </div>
            </div>
        </div>
    );
});
