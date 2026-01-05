# Phaser + React Bridge 아키텍처

## 개요

React UI와 Phaser 게임 엔진 간의 통신을 위한 브릿지 아키텍처입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                     React 컴포넌트                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  AnimationPreview.tsx                                │    │
│  │  - 모션 버튼들                                        │    │
│  │  - 속도/강도 슬라이더                                 │    │
│  │  - URL 입력                                          │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│                          │ usePhaserCanvas() 훅              │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PhaserCanvas.tsx (React 래퍼)                       │    │
│  │  - Phaser.Game 인스턴스 관리                         │    │
│  │  - useRef / useEffect로 생명주기 관리                │    │
│  │  - useImperativeHandle로 메서드 노출                 │    │
│  └───────────────────────┬─────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ EventBus (양방향)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Phaser 엔진                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  MainScene.ts                                        │    │
│  │  - 스프라이트 렌더링                                  │    │
│  │  - 외부 에셋 로딩                                     │    │
│  │  - 체커보드 배경                                      │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  MotionController.ts                                 │    │
│  │  - Idle (Sine wave)                                  │    │
│  │  - Walk (Rotation + Bounce)                          │    │
│  │  - Jump (Tween sequence)                             │    │
│  │  - Attack (Tween sequence)                           │    │
│  │  - Hurt (Shake + Flash)                              │    │
│  │  - Spin (Scale X flip)                               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 파일 구조

```
phaser/
├── index.ts                    # Export 모음
├── EventBus.ts                 # 통신 브릿지 (싱글톤)
├── PhaserCanvas.tsx            # React 래퍼 컴포넌트
├── scenes/
│   └── MainScene.ts            # 메인 씬
└── controllers/
    └── MotionController.ts     # 절차적 애니메이션
```

## 데이터 흐름

### 1. React → Phaser (명령)

```tsx
// React 컴포넌트에서
const { canvasRef, playMotion } = usePhaserCanvas();

// 버튼 클릭 시
playMotion('walk');

// 내부적으로
EventBus.emit('motion:play', { type: 'walk' });

// MainScene에서 수신
EventBus.on('motion:play', (data) => {
  this.motionController.play(data.type);
});
```

### 2. Phaser → React (이벤트)

```tsx
// MainScene에서 발행
EventBus.emit('motion:started', { type: 'walk' });

// React에서 수신
EventBus.on('motion:started', (data) => {
  onMotionStarted?.(data.type);
});
```

### 3. 설정 실시간 반영

```tsx
// React 슬라이더
<input
  type="range"
  value={speed}
  onChange={(e) => {
    setSpeed(e.target.value);
    canvasRef.current?.updateConfig({ speed: e.target.value });
  }}
/>

// EventBus 전달
EventBus.emit('config:update', { speed: 1.5 });

// MotionController에서 수신
updateConfig(config: Partial<MotionConfig>): void {
  this.config = { ...this.config, ...config };
}
```

## 이벤트 목록

### React → Phaser

| 이벤트 | 페이로드 | 설명 |
|--------|----------|------|
| `motion:play` | `{ type: MotionType }` | 모션 재생 |
| `motion:stop` | - | 모션 정지 |
| `asset:load` | `{ url: string, key: string }` | 에셋 로드 |
| `asset:clear` | - | 에셋 클리어 |
| `config:update` | `Partial<MotionConfig>` | 설정 업데이트 |
| `preview:zoom` | `{ scale: number }` | 줌 변경 |

### Phaser → React

| 이벤트 | 페이로드 | 설명 |
|--------|----------|------|
| `phaser:ready` | `{ scene: Phaser.Scene }` | 초기화 완료 |
| `motion:started` | `{ type: MotionType }` | 모션 시작됨 |
| `motion:completed` | `{ type: MotionType }` | 모션 완료됨 |
| `asset:loaded` | `{ key, width, height }` | 에셋 로드 완료 |
| `asset:error` | `{ key, error }` | 에셋 로드 실패 |

## 모션 구현 방식

### Sine Wave 기반 (연속)
- **Idle**: Y offset + ScaleY 변화
- **Walk**: Rotation + Y bounce

```ts
// 매 프레임 update()에서
const time = this.scene.time.now * 0.003 * speed;
const yOffset = Math.sin(time) * 3 * intensity;
sprite.y = baseY + yOffset;
```

### Tween Sequence 기반 (단계별)
- **Jump**: 웅크림 → 도약 → 정점 → 착지
- **Attack**: 준비 → 뒤로 → 찌르기 → 복귀
- **Hurt**: 밀림 → 떨림 → 복귀

```ts
// 순차 Tween
const squat = this.scene.tweens.add({
  targets: sprite,
  scaleY: 0.7,
  duration: 100,
  onComplete: () => {
    const leap = this.scene.tweens.add({
      targets: sprite,
      y: baseY - 50,
      duration: 150,
      // ...
    });
  }
});
```

## 픽셀아트 설정

```ts
// Phaser 설정
const config = {
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  render: {
    pixelArt: true,
    antialias: false,
  },
};

// 텍스처 필터
sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
```

## 사용 예시

```tsx
import { PhaserCanvas, usePhaserCanvas } from './phaser';

function MyComponent() {
  const { canvasRef, playMotion, loadAsset } = usePhaserCanvas();

  return (
    <div>
      <PhaserCanvas
        ref={canvasRef}
        width={400}
        height={400}
        onAssetLoaded={(info) => console.log('Loaded:', info)}
      />
      
      <button onClick={() => playMotion('walk')}>
        걷기
      </button>
      
      <button onClick={() => loadAsset('https://example.com/sprite.png')}>
        에셋 로드
      </button>
    </div>
  );
}
```

## 확장 포인트

1. **새 모션 추가**: `MotionController`에 새 메서드 추가
2. **새 이벤트 추가**: `EventBus.ts`의 `EventTypes` 인터페이스 확장
3. **새 씬 추가**: `scenes/` 폴더에 새 씬 클래스 추가
4. **에셋 프리로드**: `MainScene.preload()`에 추가
