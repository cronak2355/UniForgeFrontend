// src/AssetsEditor/components/AnimationPreview.tsx
// Phaser 캔버스 + React UI 통합 예시

import React, { useState, useCallback } from 'react';
import { PhaserCanvas, usePhaserCanvas } from '../phaser';
import type { MotionType, MotionConfig } from '../types/animation';

// ═══════════════════════════════════════════════════════════
// 모션 프리셋 데이터
// ═══════════════════════════════════════════════════════════

const MOTION_PRESETS: Array<{ type: MotionType; label: string; emoji: string }> = [
  { type: 'idle', label: '숨쉬기', emoji: '😌' },
  { type: 'walk', label: '걷기', emoji: '🚶' },
  { type: 'jump', label: '점프', emoji: '⬆️' },
  { type: 'attack', label: '공격', emoji: '⚔️' },
  { type: 'hit', label: '피격', emoji: '💥' },
  { type: 'rotate', label: '회전', emoji: '🔄' },
];

// ═══════════════════════════════════════════════════════════
// 스타일
// ═══════════════════════════════════════════════════════════

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '16px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    width: 'fit-content',
  },
  canvasWrapper: {
    border: '2px solid #333',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  motionButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#fff',
  },
  motionButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  emoji: {
    fontSize: '24px',
  },
  label: {
    fontSize: '11px',
    color: '#aaa',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sliderLabel: {
    fontSize: '12px',
    color: '#aaa',
    width: '60px',
  },
  slider: {
    flex: 1,
    height: '4px',
    WebkitAppearance: 'none' as const,
    backgroundColor: '#333',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  sliderValue: {
    fontSize: '12px',
    color: '#fff',
    width: '40px',
    textAlign: 'right' as const,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#aaa',
    cursor: 'pointer',
  },
  stopButton: {
    padding: '10px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  urlInput: {
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    width: '100%',
  },
  loadButton: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
  },
  status: {
    fontSize: '11px',
    color: '#666',
    textAlign: 'center' as const,
  },
};

// ═══════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════

export function AnimationPreview() {
  const {
    canvasRef,
    currentMotion,
    isAssetLoaded,
    assetInfo,
    playMotion,
    stopMotion,
    loadAsset,
    handleAssetLoaded,
  } = usePhaserCanvas();

  // 설정 상태
  const [speed, setSpeed] = useState(1.0);
  const [intensity, setIntensity] = useState(1.0);
  const [loop, setLoop] = useState(true);
  const [assetUrl, setAssetUrl] = useState('');

  // ─────────────────────────────────────────────────────────
  // 핸들러
  // ─────────────────────────────────────────────────────────

  const handleSpeedChange = useCallback((value: number) => {
    setSpeed(value);
    canvasRef.current?.updateConfig({ speed: value });
  }, [canvasRef]);

  const handleIntensityChange = useCallback((value: number) => {
    setIntensity(value);
    canvasRef.current?.updateConfig({ intensity: value });
  }, [canvasRef]);

  const handleLoopChange = useCallback((checked: boolean) => {
    setLoop(checked);
    canvasRef.current?.updateConfig({ loop: checked });
  }, [canvasRef]);

  const handleLoadUrl = useCallback(() => {
    if (assetUrl.trim()) {
      loadAsset(assetUrl.trim());
    }
  }, [assetUrl, loadAsset]);

  const handleMotionClick = useCallback((type: MotionType) => {
    if (currentMotion === type) {
      stopMotion();
    } else {
      playMotion(type);
    }
  }, [currentMotion, playMotion, stopMotion]);

  // ─────────────────────────────────────────────────────────
  // 렌더링
  // ─────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Phaser 캔버스 */}
      <div style={styles.canvasWrapper}>
        <PhaserCanvas
          ref={canvasRef}
          width={300}
          height={300}
          onAssetLoaded={handleAssetLoaded}
          onAssetError={(err) => console.error('Asset error:', err)}
          onMotionStarted={(type) => console.log('Motion started:', type)}
          onMotionCompleted={(type) => console.log('Motion completed:', type)}
        />
      </div>

      <div style={styles.controls}>
        {/* 에셋 로드 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>에셋 로드</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="이미지 URL 입력..."
              value={assetUrl}
              onChange={(e) => setAssetUrl(e.target.value)}
              style={styles.urlInput}
            />
            <button onClick={handleLoadUrl} style={styles.loadButton}>
              로드
            </button>
          </div>
        </div>

        {/* 모션 버튼들 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>모션</div>
          <div style={styles.buttonGrid}>
            {MOTION_PRESETS.map(({ type, label, emoji }) => (
              <button
                key={type}
                onClick={() => handleMotionClick(type)}
                style={{
                  ...styles.motionButton,
                  ...(currentMotion === type ? styles.motionButtonActive : {}),
                }}
              >
                <span style={styles.emoji}>{emoji}</span>
                <span style={styles.label}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 설정 슬라이더 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>설정</div>
          
          {/* 속도 */}
          <div style={styles.sliderRow}>
            <span style={styles.sliderLabel}>속도</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{speed.toFixed(1)}x</span>
          </div>

          {/* 강도 */}
          <div style={styles.sliderRow}>
            <span style={styles.sliderLabel}>강도</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={intensity}
              onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{intensity.toFixed(1)}x</span>
          </div>

          {/* 반복 */}
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => handleLoopChange(e.target.checked)}
            />
            반복 재생
          </label>
        </div>

        {/* 정지 버튼 */}
        {currentMotion !== 'none' && (
          <button onClick={stopMotion} style={styles.stopButton}>
            ⏹ 정지
          </button>
        )}

        {/* 상태 표시 */}
        <div style={styles.status}>
          {isAssetLoaded && assetInfo
            ? `에셋: ${assetInfo.width}x${assetInfo.height}px`
            : '에셋을 로드하거나 캔버스에서 그리세요'
          }
          {currentMotion !== 'none' && ` | 재생 중: ${currentMotion}`}
        </div>
      </div>
    </div>
  );
}
