# 🎬 프레임 애니메이션 시스템

## 📐 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FrameManager                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  frames: Frame[]                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ Frame 1 │  │ Frame 2 │  │ Frame 3 │  │ Frame 4 │  ← 최대 4개     │
│  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │                 │
│  │ │pixels│ │  │ │pixels│ │  │ │pixels│ │  │ │pixels│ │                 │
│  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │                 │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                 │
│       ▲                                                              │
│       │                                                              │
│  currentFrameIndex = 0                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PixelEngine                                  │
│  - 현재 프레임의 pixelBuffer 직접 접근                               │
│  - 프레임 전환 시 자동 렌더링                                        │
│  - 히스토리는 프레임별 독립 (프레임 전환 시 클리어)                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AnimationPreview                                │
│  - 실시간 애니메이션 미리보기                                        │
│  - FPS 조절 (1~24)                                                   │
│  - Play/Pause 컨트롤                                                 │
│  - 타임라인 표시                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 파일 구조

```
AssetsEditor/
├── engine/
│   ├── FrameManager.ts      ← 프레임 관리 (추가/삭제/복제/선택)
│   ├── HistoryManager.ts    ← Undo/Redo
│   └── PixelEngine.ts       ← 드로잉 엔진 (프레임 통합)
├── context/
│   └── AssetsEditorContext.tsx  ← React 상태 & 이벤트
├── components/
│   ├── AssetsEditor.tsx     ← 메인 컴포넌트
│   ├── LeftToolbar.tsx      ← 프레임 목록 + 도구
│   ├── Canvas.tsx           ← 캔버스
│   ├── RightSidebar.tsx     ← AI + Export
│   └── AnimationPreview.tsx ← 애니메이션 미리보기
└── index.ts
```

---

## 🎯 Frame 타입

```typescript
interface Frame {
  id: string;                    // UUID
  name: string;                  // "Frame 1", "Frame 2", ...
  data: Uint8ClampedArray;       // 픽셀 데이터 (resolution × resolution × 4)
}
```

---

## 🔧 FrameManager API

| 메서드 | 설명 |
|--------|------|
| `addFrame()` | 새 프레임 추가 (최대 4개) |
| `deleteFrame(index)` | 프레임 삭제 (최소 1개 유지) |
| `duplicateFrame(index)` | 프레임 복제 (다음 위치에 삽입) |
| `selectFrame(index)` | 현재 프레임 선택 |
| `moveFrame(from, to)` | 프레임 순서 변경 |
| `renameFrame(index, name)` | 프레임 이름 변경 |
| `generateThumbnail(index, size)` | 썸네일 Base64 생성 |
| `getCurrentFrameData()` | 현재 프레임의 픽셀 배열 |
| `getAllFrames()` | 모든 프레임 반환 |
| `changeResolution(newRes)` | 해상도 변경 (모든 프레임 리셋) |

---

## 🖼️ 프레임 관리 UI (LeftToolbar)

```
┌─────────────────────┐
│  Frames      1/4    │  ← 현재/최대
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ [썸네일] Frame 1│ │  ← 현재 선택 (파란 테두리)
│ │         64×64   │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ [썸네일] Frame 2│ │
│ │         64×64   │ │
│ └─────────────────┘ │
├─────────────────────┤
│   [+ Add frame]     │  ← 4개 도달 시 비활성화
└─────────────────────┘
```

### 프레임 호버 액션
- **📋 복제**: 현재 프레임 복사
- **🗑 삭제**: 프레임 삭제 (1개 남으면 비활성화)

---

## 🎬 애니메이션 미리보기 (AnimationPreview)

```
┌─────────────────────────┐
│ Animation Preview  1/4  │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │                   │  │
│  │   [프레임 미리보기] │  │  ← 재생 중: 자동 전환
│  │                   │  │     정지 시: 현재 프레임
│  └───────────────────┘  │
├─────────────────────────┤
│    [▶ Play] / [⏸ Pause] │
├─────────────────────────┤
│  FPS   ──●──────  8     │  ← 1~24 조절 가능
├─────────────────────────┤
│  Timeline               │
│  ██░░░░  (프레임 위치)  │
└─────────────────────────┘
```

### 재생 로직
```typescript
useEffect(() => {
  if (isPlaying && frames.length > 1) {
    intervalRef.current = setInterval(() => {
      setPreviewFrame((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);
  }
  return () => clearInterval(intervalRef.current);
}, [isPlaying, fps, frames.length]);
```

---

## 🔄 프레임 전환 흐름

```
사용자 클릭: Frame 2
      │
      ▼
selectFrame(1)
      │
      ├── FrameManager.selectFrame(1)
      │       └── currentFrameIndex = 1
      │
      ├── PixelEngine.render()
      │       └── 현재 프레임 데이터로 캔버스 갱신
      │
      └── syncFrameState()
              └── React 상태 업데이트 → UI 리렌더
```

---

## 📤 Export 옵션

### 단일 프레임 (WebP)
```typescript
downloadWebP(filename)
// → sprite.webp
```

### 애니메이션 (GIF) - 추후 구현
```typescript
handleExportGif()
// → sprite.gif (모든 프레임 포함)
```

### 애니메이션 데이터 접근
```typescript
const { frames, resolution } = engine.getAnimationData();
// frames: ImageData[]
// 각 프레임을 순회하며 GIF 인코더에 전달
```

---

## ⌨️ 단축키

| 단축키 | 동작 |
|--------|------|
| `P` | Pen 도구 |
| `E` | Eraser 도구 |
| `O` | Eyedropper |
| `B` | Fill (Bucket) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Space` | Play/Pause (예정) |
| `←` / `→` | 이전/다음 프레임 (예정) |

---

## 🎮 사용 예시

### 걷기 애니메이션 만들기

1. **Frame 1**: 기본 자세 그리기
2. **Frame 1 복제** → Frame 2 생성
3. **Frame 2**: 왼발 앞으로
4. **Frame 2 복제** → Frame 3 생성  
5. **Frame 3**: 기본 자세 (Frame 1과 동일)
6. **Frame 3 복제** → Frame 4 생성
7. **Frame 4**: 오른발 앞으로
8. **Play** 버튼으로 미리보기
9. **FPS 조절**로 속도 맞추기
10. **Export GIF**로 내보내기

---

## 🧠 메모리 관리

### 프레임당 메모리
- 32×32: `32 × 32 × 4 = 4KB`
- 64×64: `64 × 64 × 4 = 16KB`
- 128×128: `128 × 128 × 4 = 64KB`

### 최대 사용량 (4프레임)
- 32px: ~16KB
- 64px: ~64KB
- 128px: ~256KB

### 해상도 변경 시
- 모든 프레임 데이터 리셋
- 히스토리 클리어
- 프레임 1개로 초기화

---

## 🚀 향후 확장

1. **Onion Skin**: 이전/다음 프레임 반투명 오버레이
2. **프레임 드래그 정렬**: 순서 변경
3. **복사/붙여넣기**: 프레임 간 영역 복사
4. **GIF 내보내기**: gif.js 라이브러리 통합
5. **스프라이트시트**: 모든 프레임을 하나의 PNG로
