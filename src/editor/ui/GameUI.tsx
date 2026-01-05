/**
 * GameUI 컴포넌트 - HP 바, 점수, 타이머 등
 * 
 * 모든 게임 장르에서 사용 가능한 UI 컴포넌트
 */

import { memo, type CSSProperties } from "react";

// ============================================================
// 스타일
// ============================================================

const colors = {
    hpFull: "#22c55e",
    hpMedium: "#eab308",
    hpLow: "#ef4444",
    hpBackground: "#1f2937",
    mpBar: "#3b82f6",
    expBar: "#a855f7",
    textPrimary: "#f0f6fc",
    textSecondary: "#9ca3af",
    panelBg: "rgba(17, 24, 39, 0.85)",
    border: "#374151",
};

// ============================================================
// HP 바 컴포넌트
// ============================================================

interface HPBarProps {
    current: number;
    max: number;
    showText?: boolean;
    width?: number;
    height?: number;
    style?: CSSProperties;
}

export const HPBar = memo(function HPBar({
    current,
    max,
    showText = true,
    width = 200,
    height = 20,
    style
}: HPBarProps) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));

    // HP에 따른 색상
    let barColor = colors.hpFull;
    if (percentage <= 25) {
        barColor = colors.hpLow;
    } else if (percentage <= 50) {
        barColor = colors.hpMedium;
    }

    return (
        <div style={{
            width,
            height,
            background: colors.hpBackground,
            borderRadius: height / 2,
            overflow: "hidden",
            position: "relative",
            border: `1px solid ${colors.border}`,
            ...style
        }}>
            {/* 바 채우기 */}
            <div style={{
                width: `${percentage}%`,
                height: "100%",
                background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}aa 100%)`,
                borderRadius: height / 2,
                transition: "width 0.2s ease-out, background 0.3s ease"
            }} />

            {/* 텍스트 */}
            {showText && (
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: height * 0.6,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)"
                }}>
                    {Math.floor(current)} / {max}
                </div>
            )}
        </div>
    );
});

// ============================================================
// MP 바 컴포넌트
// ============================================================

interface MPBarProps {
    current: number;
    max: number;
    showText?: boolean;
    width?: number;
    height?: number;
    style?: CSSProperties;
}

export const MPBar = memo(function MPBar({
    current,
    max,
    showText = true,
    width = 200,
    height = 16,
    style
}: MPBarProps) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));

    return (
        <div style={{
            width,
            height,
            background: colors.hpBackground,
            borderRadius: height / 2,
            overflow: "hidden",
            position: "relative",
            border: `1px solid ${colors.border}`,
            ...style
        }}>
            <div style={{
                width: `${percentage}%`,
                height: "100%",
                background: `linear-gradient(180deg, ${colors.mpBar} 0%, ${colors.mpBar}aa 100%)`,
                borderRadius: height / 2,
                transition: "width 0.2s ease-out"
            }} />

            {showText && (
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: height * 0.6,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)"
                }}>
                    {Math.floor(current)} / {max}
                </div>
            )}
        </div>
    );
});

// ============================================================
// 점수 표시 컴포넌트
// ============================================================

interface ScoreDisplayProps {
    score: number;
    label?: string;
    style?: CSSProperties;
}

export const ScoreDisplay = memo(function ScoreDisplay({
    score,
    label = "SCORE",
    style
}: ScoreDisplayProps) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 16px",
            background: colors.panelBg,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            ...style
        }}>
            <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: colors.textSecondary,
                letterSpacing: 1,
                textTransform: "uppercase"
            }}>
                {label}
            </span>
            <span style={{
                fontSize: 24,
                fontWeight: 700,
                color: colors.textPrimary,
                fontFamily: "monospace"
            }}>
                {score.toLocaleString().padStart(8, '0')}
            </span>
        </div>
    );
});

// ============================================================
// 타이머 표시 컴포넌트
// ============================================================

interface TimerDisplayProps {
    seconds: number;
    label?: string;
    style?: CSSProperties;
}

export const TimerDisplay = memo(function TimerDisplay({
    seconds,
    label = "TIME",
    style
}: TimerDisplayProps) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const formatted = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 16px",
            background: colors.panelBg,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            ...style
        }}>
            <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: colors.textSecondary,
                letterSpacing: 1
            }}>
                {label}
            </span>
            <span style={{
                fontSize: 24,
                fontWeight: 700,
                color: colors.textPrimary,
                fontFamily: "monospace"
            }}>
                {formatted}
            </span>
        </div>
    );
});

// ============================================================
// 웨이브 표시 컴포넌트
// ============================================================

interface WaveDisplayProps {
    currentWave: number;
    totalWaves: number;
    enemiesRemaining?: number;
    style?: CSSProperties;
}

export const WaveDisplay = memo(function WaveDisplay({
    currentWave,
    totalWaves,
    enemiesRemaining,
    style
}: WaveDisplayProps) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 16px",
            background: colors.panelBg,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            ...style
        }}>
            <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: colors.textSecondary,
                letterSpacing: 1
            }}>
                WAVE
            </span>
            <span style={{
                fontSize: 24,
                fontWeight: 700,
                color: colors.textPrimary
            }}>
                {currentWave} / {totalWaves}
            </span>
            {enemiesRemaining !== undefined && (
                <span style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 4
                }}>
                    {enemiesRemaining} remaining
                </span>
            )}
        </div>
    );
});

// ============================================================
// 플레이어 상태 패널 (HP + MP 통합)
// ============================================================

interface PlayerStatusProps {
    hp: number;
    maxHp: number;
    mp?: number;
    maxMp?: number;
    playerName?: string;
    level?: number;
    style?: CSSProperties;
}

export const PlayerStatus = memo(function PlayerStatus({
    hp,
    maxHp,
    mp,
    maxMp,
    playerName,
    level,
    style
}: PlayerStatusProps) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: 12,
            background: colors.panelBg,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            minWidth: 200,
            ...style
        }}>
            {/* 이름 & 레벨 */}
            {(playerName || level !== undefined) && (
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4
                }}>
                    {playerName && (
                        <span style={{ fontWeight: 600, color: colors.textPrimary }}>
                            {playerName}
                        </span>
                    )}
                    {level !== undefined && (
                        <span style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                            background: colors.hpBackground,
                            padding: "2px 8px",
                            borderRadius: 4
                        }}>
                            Lv.{level}
                        </span>
                    )}
                </div>
            )}

            {/* HP 바 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.hpFull, width: 24 }}>
                    HP
                </span>
                <HPBar current={hp} max={maxHp} height={16} width={160} />
            </div>

            {/* MP 바 (있을 경우) */}
            {mp !== undefined && maxMp !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.mpBar, width: 24 }}>
                        MP
                    </span>
                    <MPBar current={mp} max={maxMp} height={12} width={160} />
                </div>
            )}
        </div>
    );
});

// ============================================================
// 게임 HUD (전체 UI 레이아웃)
// ============================================================

interface GameHUDProps {
    // 플레이어 상태
    playerHp: number;
    playerMaxHp: number;
    playerMp?: number;
    playerMaxMp?: number;
    playerName?: string;
    playerLevel?: number;

    // 게임 정보
    score?: number;
    time?: number;

    // 웨이브 (디펜스용)
    currentWave?: number;
    totalWaves?: number;
    enemiesRemaining?: number;

    style?: CSSProperties;
}

export const GameHUD = memo(function GameHUD({
    playerHp,
    playerMaxHp,
    playerMp,
    playerMaxMp,
    playerName,
    playerLevel,
    score,
    time,
    currentWave,
    totalWaves,
    enemiesRemaining,
    style
}: GameHUDProps) {
    return (
        <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            pointerEvents: "none",
            ...style
        }}>
            {/* 좌측: 플레이어 상태 */}
            <PlayerStatus
                hp={playerHp}
                maxHp={playerMaxHp}
                mp={playerMp}
                maxMp={playerMaxMp}
                playerName={playerName}
                level={playerLevel}
                style={{ pointerEvents: "auto" }}
            />

            {/* 우측: 점수/시간/웨이브 */}
            <div style={{ display: "flex", gap: 8 }}>
                {score !== undefined && (
                    <ScoreDisplay score={score} style={{ pointerEvents: "auto" }} />
                )}
                {time !== undefined && (
                    <TimerDisplay seconds={time} style={{ pointerEvents: "auto" }} />
                )}
                {currentWave !== undefined && totalWaves !== undefined && (
                    <WaveDisplay
                        currentWave={currentWave}
                        totalWaves={totalWaves}
                        enemiesRemaining={enemiesRemaining}
                        style={{ pointerEvents: "auto" }}
                    />
                )}
            </div>
        </div>
    );
});
