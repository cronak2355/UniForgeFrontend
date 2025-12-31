// src/AssetsEditor/components/SkeletonDemo.tsx
// 스켈레톤 애니메이션 데모 UI

import React, { useState, useCallback } from 'react';
import { SkeletonPreview, useSkeletonPreview } from '../phaser/skeleton/SkeletonPreview';
import type { MotionType } from '../types/animation';

// ═══════════════════════════════════════════════════════════════════
// 모션 버튼 데이터
// ═══════════════════════════════════════════════════════════════════

interface MotionButton {
  type: MotionType;
  label: string;
  emoji: string;
  description: string;
}

const MOTION_BUTTONS: MotionButton[] = [
  { 
    type: 'idle', 
    label: '숨쉬기', 
    emoji: '😌',
    description: 'Sine 파형 기반 Squash & Stretch'
  },
  { 
    type: 'walk', 
    label: '걷기', 
    emoji: '🚶',
    description: '기울기 + 하체 반동 뒤뚱거림'
  },
  { 
    type: 'jump', 
    label: '점프', 
    emoji: '🦘',
    description: '웅크림 → 도약 → 착지 반동'
  },
  { 
    type: 'attack', 
    label: '공격', 
    emoji: '⚔️',
    description: '상체 회전 + 잔상 + 화면 흔들림'
  },
  { 
    type: 'hit', 
    label: '피격', 
    emoji: '💥',
    description: '고주파 진동 + 화이트 플래시'
  },
  { 
    type: 'rotate', 
    label: '회전', 
    emoji: '🔄',
    description: '원심력 느낌의 3D 회전'
  },
];

// ═══════════════════════════════════════════════════════════════════
// 스타일 (Tailwind 클래스 시뮬레이션)
// ═══════════════════════════════════════════════════════════════════

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '20px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    maxWidth: '500px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#888',
    margin: '4px 0 0 0',
  },
  previewWrapper: {
    border: '1px solid #333',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  controlsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  label: {
    fontSize: '12px',
    color: '#aaa',
    marginBottom: '4px',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  motionButton: (isActive: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '12px 8px',
    backgroundColor: isActive ? '#2563eb' : '#1a1a1a',
    border: `1px solid ${isActive ? '#3b82f6' : '#333'}`,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
  buttonEmoji: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  buttonLabel: {
    fontSize: '11px',
    color: '#fff',
    fontWeight: '500',
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
    appearance: 'none' as const,
    backgroundColor: '#333',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  sliderValue: {
    fontSize: '12px',
    color: '#60a5fa',
    width: '40px',
    textAlign: 'right' as const,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: '16px',
    height: '16px',
    accentColor: '#2563eb',
  },
  checkboxLabel: {
    fontSize: '12px',
    color: '#aaa',
  },
  urlInput: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
  },
  loadButton: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  stopButton: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#111',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#666',
  },
  statusActive: {
    color: '#22c55e',
    fontWeight: '500',
  },
  description: {
    fontSize: '10px',
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center' as const,
  },
};

// ═══════════════════════════════════════════════════════════════════
// SkeletonDemo 컴포넌트
// ═══════════════════════════════════════════════════════════════════

export const SkeletonDemo: React.FC = () => {
  // 훅
  const skeleton = useSkeletonPreview();
  
  // 상태
  const [isReady, setIsReady] = useState(false);
  const [currentMotion, setCurrentMotion] = useState<MotionType | null>(null);
  const [assetInfo, setAssetInfo] = useState<{ width: number; height: number } | null>(null);
  const [assetUrl, setAssetUrl] = useState('');
  
  // 설정
  const [speed, setSpeed] = useState(1.0);
  const [intensity, setIntensity] = useState(1.0);
  const [loop, setLoop] = useState(true);

  // ─── 이벤트 핸들러 ───
  const handleReady = useCallback(() => {
    setIsReady(true);
    console.log('[SkeletonDemo] Ready');
  }, []);

  const handleMotionStarted = useCallback((type: MotionType) => {
    setCurrentMotion(type);
  }, []);

  const handleMotionStopped = useCallback(() => {
    setCurrentMotion(null);
  }, []);

  const handleAssetLoaded = useCallback((info: { width: number; height: number }) => {
    setAssetInfo(info);
  }, []);

  // ─── 모션 재생 ───
  const handlePlayMotion = useCallback((type: MotionType) => {
    skeleton.updateConfig({ speed, intensity, loop });
    skeleton.playMotion(type);
  }, [skeleton, speed, intensity, loop]);

  // ─── 모션 정지 ───
  const handleStop = useCallback(() => {
    skeleton.stopMotion();
  }, [skeleton]);

  // ─── 에셋 로드 ───
  const handleLoadAsset = useCallback(() => {
    if (assetUrl.trim()) {
      skeleton.loadAsset(assetUrl.trim());
    }
  }, [skeleton, assetUrl]);

  // ─── 설정 변경 시 실시간 반영 ───
  const handleSpeedChange = useCallback((value: number) => {
    setSpeed(value);
    skeleton.updateConfig({ speed: value });
  }, [skeleton]);

  const handleIntensityChange = useCallback((value: number) => {
    setIntensity(value);
    skeleton.updateConfig({ intensity: value });
  }, [skeleton]);

  const handleLoopChange = useCallback((value: boolean) => {
    setLoop(value);
    skeleton.updateConfig({ loop: value });
  }, [skeleton]);

  // 현재 선택된 모션의 설명
  const currentDescription = currentMotion 
    ? MOTION_BUTTONS.find(b => b.type === currentMotion)?.description 
    : '모션을 선택하세요';

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div>
        <h3 style={styles.title}>🦴 Skeleton Animation Engine</h3>
        <p style={styles.subtitle}>본(Bone) 기반 절차적 애니메이션 시스템</p>
      </div>

      {/* 프리뷰 캔버스 */}
      <div style={styles.previewWrapper}>
        <SkeletonPreview
          ref={skeleton.ref}
          width={460}
          height={350}
          onReady={handleReady}
          onMotionStarted={handleMotionStarted}
          onMotionStopped={handleMotionStopped}
          onAssetLoaded={handleAssetLoaded}
        />
      </div>

      {/* 상태 바 */}
      <div style={styles.statusBar}>
        <span>
          {assetInfo 
            ? `에셋: ${assetInfo.width}×${assetInfo.height}px` 
            : '에셋 없음'
          }
        </span>
        <span style={currentMotion ? styles.statusActive : undefined}>
          {currentMotion 
            ? `▶ ${MOTION_BUTTONS.find(b => b.type === currentMotion)?.label}` 
            : '⏹ 정지'
          }
        </span>
      </div>

      {/* 에셋 로드 */}
      <div style={styles.controlsSection}>
        <span style={styles.label}>에셋 URL</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={assetUrl}
            onChange={(e) => setAssetUrl(e.target.value)}
            placeholder="https://example.com/sprite.png"
            style={styles.urlInput}
          />
          <button onClick={handleLoadAsset} style={styles.loadButton}>
            로드
          </button>
        </div>
      </div>

      {/* 모션 버튼 */}
      <div style={styles.controlsSection}>
        <span style={styles.label}>모션 프리셋</span>
        <div style={styles.buttonGrid}>
          {MOTION_BUTTONS.map((motion) => (
            <button
              key={motion.type}
              onClick={() => handlePlayMotion(motion.type)}
              style={styles.motionButton(currentMotion === motion.type)}
              disabled={!isReady}
            >
              <span style={styles.buttonEmoji}>{motion.emoji}</span>
              <span style={styles.buttonLabel}>{motion.label}</span>
            </button>
          ))}
        </div>
        <p style={styles.description}>{currentDescription}</p>
      </div>

      {/* 파라미터 슬라이더 */}
      <div style={styles.controlsSection}>
        <span style={styles.label}>파라미터</span>
        
        {/* 속도 */}
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>속도</span>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderValue}>{speed.toFixed(2)}x</span>
        </div>

        {/* 강도 */}
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>강도</span>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={intensity}
            onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderValue}>{intensity.toFixed(2)}x</span>
        </div>

        {/* 반복 */}
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => handleLoopChange(e.target.checked)}
            style={styles.checkboxInput}
          />
          <span style={styles.checkboxLabel}>반복 재생</span>
        </label>
      </div>

      {/* 정지 버튼 */}
      <button onClick={handleStop} style={styles.stopButton} disabled={!currentMotion}>
        ⏹ 정지
      </button>
    </div>
  );
};

export default SkeletonDemo;
