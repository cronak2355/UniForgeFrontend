# 🦴 Skeleton Animation Engine

단일 PNG 이미지로 Unity 스타일 Bone 애니메이션을 구현하는 절차적 애니메이션 엔진

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    React UI Layer                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SkeletonDemo.tsx                                    │   │
│  │  - 모션 버튼 (6종)                                   │   │
│  │  - 파라미터 슬라이더 (Speed, Intensity)              │   │
│  │  - 에셋 로드                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼ useSkeletonPreview()             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SkeletonPreview.tsx (React-Phaser Bridge)           │   │
│  │  - Phaser.Game 인스턴스 관리                         │   │
│  │  - EventBus 통신                                    │   │
│  │  - useImperativeHandle API 노출                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ EventBus
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Phaser Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SkeletonScene.ts                                    │   │
│  │  - 체커보드 배경                                     │   │
│  │  - VFX (Flash, Shake, Slash)                        │   │
│  │  - 에셋 로딩 & 스케일링                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BoneSystem.ts                                       │   │
│  │  ┌───────────────────────────────────────────┐      │   │
│  │  │  Root Container                           │      │   │
│  │  │    └─ Legs (pivot: bottom)               │      │   │
│  │  │         └─ Body (pivot: bottom)          │      │   │
│  │  │              └─ Head (pivot: bottom)     │      │   │
│  │  └───────────────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SkeletonController.ts                               │   │
│  │  - 6대 모션 프리셋                                   │   │
│  │  - Tween / Sine 애니메이션                          │   │
│  │  - VFX 콜백                                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 본(Bone) 계층 구조

### Virtual Slicing (가상 분할)

단일 이미지를 3등분하여 각 부위로 취급:

```
┌──────────────┐  0%
│              │
│    HEAD      │  ← cropStart: 0, cropEnd: 0.30
│              │
├──────────────┤  30%
│              │
│    BODY      │  ← cropStart: 0.30, cropEnd: 0.60
│              │
├──────────────┤  60%
│              │
│    LEGS      │  ← cropStart: 0.60, cropEnd: 1.0
│              │
└──────────────┘  100%
```

### 계층 관계 (Parent-Child)

```typescript
// 자식은 부모의 변형을 상속받음
Root
 └─ Legs (기준점: 발 아래)
     └─ Body (기준점: 허리 아래)
         └─ Head (기준점: 목 아래)
```

### 피벗(Pivot) 설정

각 본의 회전/스케일 기준점:
- **Head**: pivotY = 1 (목, 하단)
- **Body**: pivotY = 1 (허리, 하단)  
- **Legs**: pivotY = 1 (발, 하단)

## 6대 모션 프리셋

### 1. Idle (숨쉬기) 😌

**원리**: Sine 파형 기반 Squash & Stretch

```
시간 ─────────────────────────────────────►
      ╭─────╮       ╭─────╮       ╭─────╮
      │     │       │     │       │     │
   ───╯     ╰───────╯     ╰───────╯     ╰───
      늘어남        줄어듦        늘어남
```

**수학적 파라미터**:
- 기본 주기: 2초 (0.5Hz)
- Head Y offset: `sin(t) × 2px`
- Body scaleY: `1 + sin(t) × 0.03`
- Body scaleX: `1 - sin(t) × 0.015` (역보상)

---

### 2. Walk (걷기) 🚶

**원리**: 기울기(Leaning) + 하체 반동 뒤뚱거림

```
          ↙ 기울기          ↘ 기울기
        ┌───┐             ┌───┐
        │ ╲ │             │ ╱ │
        └─┬─┘             └─┬─┘
          │← 반동           │→ 반동
```

**수학적 파라미터**:
- 걸음 주기: 0.5초 (2Hz)
- Body 기울기: `sin(t) × 12°`
- Legs 반동: `-sin(t) × 8°`
- Head 지연: `sin(t - π/6)` (30° 위상 지연)

---

### 3. Jump (점프) 🦘

**원리**: Anticipation → 도약 → 착지 반동

```
Phase 1      Phase 2      Phase 3      Phase 4      Phase 5
웅크림        도약          체공          하강         착지 반동
  ▼           ▲            ●            ▼            ⚫
 ███         ┃ ┃          ▏ ▕          ┃ ┃          ▔▔▔
 ▔▔▔         ▏ ▕           │            ▏ ▕          ═══
              │                          │        (바운스)
```

**타이밍**:
| Phase | Duration | Easing |
|-------|----------|--------|
| Anticipation | 200ms | easeInBack |
| Takeoff | 150ms | easeOutExpo |
| Air | 300ms | Sine.easeInOut |
| Fall | 200ms | Quad.easeIn |
| Land | 250ms | easeOutBounce |

---

### 4. Attack (공격) ⚔️

**원리**: 상체 회전 + 잔상 + 화면 흔들림 + 검기 VFX

```
Phase 1: Windup (준비)       Phase 2: Strike (공격)
    ←────                        ────────→
   ╱                                      ╲
  ╱  힘 응축                      급격한 찌르기 ╲
 ╱                                          ╲
─────────────────          ─────────────────────→
                                    💥 Impact!
```

**수학적 파라미터**:
- Windup 회전: `-25°`
- Strike 회전: `+20°` (총 45° 회전)
- Strike 속도: 80ms (빠르게!)
- Impact에서 화면 흔들림 발동

---

### 5. Hit (피격) 💥

**원리**: 고주파 진동 + 화이트 플래시 + 밀림

```
        ← 밀림
    ╲╱╲╱╲╱╲╱    고주파 진동 (30Hz)
    ╱╲╱╲╱╲╱╲    진폭 감쇠: e^(-3t)
```

**수학적 파라미터**:
- 진동 주파수: 30Hz
- 감쇠 함수: `e^(-progress × 3)`
- 밀림 거리: `-15px`
- 알파 깜빡임: `0.4 ~ 1.0`

---

### 6. Rotate (회전) 🔄

**원리**: X축 스케일로 3D 회전 시뮬레이션 + 원심력

```
정면        옆면         뒷면        옆면        정면
┌───┐      │   │      ┌───┐      │   │      ┌───┐
│   │  →   │   │  →   │ ← │  →   │   │  →   │   │
└───┘      │   │      └───┘      │   │      └───┘
scaleX=1   scaleX≈0   scaleX=-1  scaleX≈0   scaleX=1
```

**수학적 파라미터**:
- scaleX: `cos(θ)` → -1 ~ 1
- 원심력 늘어짐: `|sin(θ)| × 0.15`

## 파라미터 시스템

### MotionConfig

```typescript
interface MotionConfig {
  speed: number;       // 0.25 ~ 2.0 (기본 1.0)
  intensity: number;   // 0.25 ~ 2.0 (기본 1.0)
  loop: boolean;       // 반복 여부
}
```

### 실시간 반영

React에서 슬라이더 조작 시 즉시 반영:

```typescript
// React
<input onChange={(e) => skeleton.updateConfig({ speed: e.target.value })} />

// ↓ EventBus

// Phaser
skeletonController.updateConfig({ speed: newValue });
```

## Easing 함수

물리 기반 탄성 함수들:

| 함수 | 용도 | 특성 |
|------|------|------|
| `easeOutElastic` | 공격 복귀 | 탄성 진동 후 안정 |
| `easeOutBounce` | 착지 반동 | 공 튀기듯 바운스 |
| `easeInBack` | 점프 웅크림 | 뒤로 당겼다 발사 |
| `easeOutExpo` | 빠른 가속 | 폭발적 시작 |
| `easeInOutSine` | 부드러운 전환 | 자연스러운 곡선 |

## VFX 시스템

### 콜백 인터페이스

```typescript
interface VFXCallbacks {
  onScreenShake?: (intensity: number) => void;
  onFlash?: (color: number, duration: number) => void;
  onGhost?: (alpha: number) => void;
  onSlashVFX?: (angle: number) => void;
}
```

### 사용 예시

```typescript
// 공격 모션에서 자동 호출
this.vfxCallbacks.onScreenShake?.(0.8);  // 화면 흔들림
this.vfxCallbacks.onSlashVFX?.(20);      // 검기 이펙트
```

## 사용 방법

### 1. 기본 사용

```tsx
import { SkeletonDemo } from './AssetsEditor/components/SkeletonDemo';

function App() {
  return <SkeletonDemo />;
}
```

### 2. 프로그래매틱 사용

```tsx
import { useSkeletonPreview, SkeletonPreview } from './AssetsEditor/phaser/skeleton';

function MyComponent() {
  const skeleton = useSkeletonPreview();
  
  useEffect(() => {
    // 에셋 로드
    skeleton.loadAsset('https://example.com/character.png');
    
    // 설정
    skeleton.updateConfig({ speed: 1.5, intensity: 1.2, loop: true });
    
    // 모션 재생
    skeleton.playMotion('attack');
  }, []);
  
  return <SkeletonPreview ref={skeleton.ref} width={400} height={400} />;
}
```

### 3. ImageData에서 로드

```tsx
// Canvas에서 픽셀 데이터 가져오기
const imageData = ctx.getImageData(0, 0, width, height);

// 스켈레톤에 로드
skeleton.loadFromImageData(imageData);
```

## 파일 구조

```
phaser/skeleton/
├── BoneSystem.ts        # 본 계층 시스템
├── SkeletonController.ts # 6대 모션 엔진
├── SkeletonScene.ts     # Phaser 씬
├── SkeletonPreview.tsx  # React 브릿지
└── index.ts             # 내보내기

components/
└── SkeletonDemo.tsx     # 데모 UI
```

## 의존성

```json
{
  "phaser": "^3.70.0"
}
```

## 확장 포인트

1. **새 모션 추가**: `SkeletonController`에 메서드 추가
2. **본 분할 커스터마이징**: `DEFAULT_BONE_CONFIG` 수정
3. **VFX 추가**: `VFXCallbacks` 인터페이스 확장
4. **파라미터 추가**: `MotionConfig` 인터페이스 확장
