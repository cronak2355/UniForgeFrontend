import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { RigPart, PartPose, FrameData, Point } from '../services/rigSystem';
import {
  DEFAULT_POSE,
  PART_COLORS,
  getPartBounds,
  renderAnimationFrame,
} from '../services/rigSystem';

interface PartRiggerProps {
  sourceCanvas: HTMLCanvasElement | null;
  pixelSize: number;
  onFramesGenerated: (frames: ImageData[]) => void;
  onClose: () => void;
}

type Tool = 'brush' | 'eraser' | 'move';

export function PartRigger({ sourceCanvas, pixelSize, onFramesGenerated, onClose }: PartRiggerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // 부위
  const [parts, setParts] = useState<RigPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // 프레임
  const [frames, setFrames] = useState<FrameData[]>([{}, {}, {}, {}]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frameCount, setFrameCount] = useState(4);

  // 도구 & 인터랙션
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(4);
  const [isPainting, setIsPainting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [dragStartPose, setDragStartPose] = useState<PartPose>(DEFAULT_POSE);
  const [isRotating, setIsRotating] = useState(false);

  // 미리보기
  const [isPlaying, setIsPlaying] = useState(true);
  const [previewFrame, setPreviewFrame] = useState(0);

  // 새 부위 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPartName, setNewPartName] = useState('');

  // Canvas size - driven by CSS, internal resolution matches pixelSize
  // scale is effectively 1 for internal drawing operations
  const scale = 1;

  const selectedPart = parts.find(p => p.id === selectedPartId);

  // ==================== 새 부위 추가 ====================

  const addPart = () => {
    if (!newPartName.trim()) return;

    const newPart: RigPart = {
      id: `part_${Date.now()}`,
      name: newPartName.trim(),
      color: PART_COLORS[parts.length % PART_COLORS.length],
      pixels: new Set(),
      zIndex: parts.length,
    };

    setParts(prev => [...prev, newPart]);
    setSelectedPartId(newPart.id);
    setNewPartName('');
    setShowAddModal(false);
    setTool('brush');
  };

  const deletePart = (partId: string) => {
    setParts(prev => prev.filter(p => p.id !== partId));
    if (selectedPartId === partId) {
      setSelectedPartId(null);
    }
    // 프레임에서도 제거
    setFrames(prev => prev.map(frame => {
      const newFrame = { ...frame };
      delete newFrame[partId];
      return newFrame;
    }));
  };

  // 부위 순서 변경 (위로 = zIndex 증가 = 나중에 렌더링 = 앞으로)
  const movePartUp = (partId: string) => {
    setParts(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex(p => p.id === partId);
      if (idx === sorted.length - 1) return prev; // 이미 맨 앞

      // 다음 부위와 zIndex 스왑
      const current = sorted[idx];
      const next = sorted[idx + 1];

      return prev.map(p => {
        if (p.id === current.id) return { ...p, zIndex: next.zIndex };
        if (p.id === next.id) return { ...p, zIndex: current.zIndex };
        return p;
      });
    });
  };

  const movePartDown = (partId: string) => {
    setParts(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex(p => p.id === partId);
      if (idx === 0) return prev; // 이미 맨 뒤

      // 이전 부위와 zIndex 스왑
      const current = sorted[idx];
      const prevPart = sorted[idx - 1];

      return prev.map(p => {
        if (p.id === current.id) return { ...p, zIndex: prevPart.zIndex };
        if (p.id === prevPart.id) return { ...p, zIndex: current.zIndex };
        return p;
      });
    });
  };

  // ==================== 캔버스 렌더링 ====================

  const render = useCallback(() => {
    if (!canvasRef.current || !sourceCanvas) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // 원본 이미지
    const ctxScale = canvasRef.current.width / sourceCanvas.width;
    ctx.clearRect(0, 0, pixelSize, pixelSize);
    ctx.drawImage(sourceCanvas, 0, 0, pixelSize, pixelSize);

    // 부위 오버레이 (칠해진 영역)
    parts.forEach(part => {
      const isSelected = part.id === selectedPartId;
      ctx.fillStyle = part.color + (isSelected ? '80' : '40');

      part.pixels.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        ctx.fillRect(x * scale, y * scale, scale, scale);
      });

      // 선택된 부위 중심점 표시
      if (isSelected && part.pixels.size > 0) {
        const bounds = getPartBounds(part.pixels);
        const centerX = (bounds.minX + bounds.maxX + 1) / 2;
        const centerY = (bounds.minY + bounds.maxY + 1) / 2;
        const pose = frames[currentFrame][part.id] || DEFAULT_POSE;

        ctx.beginPath();
        ctx.arc(
          (centerX + pose.x) * scale,
          (centerY + pose.y) * scale,
          6, 0, Math.PI * 2
        );
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = part.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

  }, [sourceCanvas, parts, selectedPartId, frames, currentFrame, scale]);

  useEffect(() => {
    render();
  }, [render]);

  // ==================== 미리보기 렌더링 ====================

  useEffect(() => {
    if (!previewRef.current || !sourceCanvas || parts.length === 0) return;
    const ctx = previewRef.current.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const frameIdx = isPlaying ? previewFrame : currentFrame;
    const rendered = renderAnimationFrame(sourceCanvas, parts, frames[frameIdx] || {}, pixelSize);

    ctx.clearRect(0, 0, pixelSize, pixelSize);

    const temp = document.createElement('canvas');
    temp.width = pixelSize;
    temp.height = pixelSize;

    temp.getContext('2d')!.putImageData(rendered, 0, 0);
    ctx.drawImage(temp, 0, 0, pixelSize, pixelSize);

  }, [sourceCanvas, parts, frames, currentFrame, previewFrame, isPlaying, pixelSize]);

  // 자동 재생
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPreviewFrame(prev => (prev + 1) % frameCount);
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, frameCount]);

  // ==================== 마우스 이벤트 ====================

  const getPixelPos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Calculate the actual rendered size (contained)
    const ratio = rect.width / rect.height;
    const targetRatio = 1; // square

    let actualWidth = rect.width;
    let offsetX = 0;
    let offsetY = 0;

    if (ratio > targetRatio) {
      // Container is wider than content (pillarbox)
      actualWidth = rect.height;
      offsetX = (rect.width - rect.height) / 2;
    } else {
      // Container is taller than content (letterbox)
      actualWidth = rect.width; // Width is full
      offsetY = (rect.height - rect.width) / 2;
    }

    const scale = actualWidth / pixelSize;

    return {
      x: Math.floor((e.clientX - rect.left - offsetX) / scale),
      y: Math.floor((e.clientY - rect.top - offsetY) / scale),
    };
  };

  const getCanvasPos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const ratio = rect.width / rect.height;
    const targetRatio = 1; // square

    let actualWidth = rect.width;
    let offsetX = 0;
    let offsetY = 0;

    if (ratio > targetRatio) {
      actualWidth = rect.height;
      offsetX = (rect.width - rect.height) / 2;
    } else {
      actualWidth = rect.width;
      offsetY = (rect.height - rect.width) / 2;
    }

    const scale = actualWidth / pixelSize; // 1:1 scale relative to pixelSize

    return {
      x: (e.clientX - rect.left - offsetX) / scale,
      y: (e.clientY - rect.top - offsetY) / scale,
    };
  };

  const paintPixels = (pos: Point, add: boolean) => {
    if (!selectedPartId) return;

    // 브러시 범위 계산 (중심 기준 대칭)
    const half = Math.floor(brushSize / 2);

    setParts(prev => prev.map(part => {
      if (part.id !== selectedPartId) return part;

      const newPixels = new Set(part.pixels);

      // 브러시 크기만큼 칠하기
      for (let dy = -half; dy < brushSize - half; dy++) {
        for (let dx = -half; dx < brushSize - half; dx++) {
          const px = pos.x + dx;
          const py = pos.y + dy;
          if (px >= 0 && px < pixelSize && py >= 0 && py < pixelSize) {
            const key = `${px},${py}`;
            if (add) {
              newPixels.add(key);
            } else {
              newPixels.delete(key);
            }
          }
        }
      }

      return { ...part, pixels: newPixels };
    }));

    // brush일 때 다른 부위에서 해당 픽셀 제거
    if (add) {
      const half = Math.floor(brushSize / 2);
      setParts(prev => prev.map(part => {
        if (part.id === selectedPartId) return part;

        const newPixels = new Set(part.pixels);
        for (let dy = -half; dy < brushSize - half; dy++) {
          for (let dx = -half; dx < brushSize - half; dx++) {
            const px = pos.x + dx;
            const py = pos.y + dy;
            if (px >= 0 && px < pixelSize && py >= 0 && py < pixelSize) {
              const key = `${px},${py}`;
              newPixels.delete(key);
            }
          }
        }
        return { ...part, pixels: newPixels };
      }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'brush' || tool === 'eraser') {
      if (!selectedPartId) {
        alert('먼저 부위를 선택하세요!');
        return;
      }
      setIsPainting(true);
      const pos = getPixelPos(e);
      paintPixels(pos, tool === 'brush');
    } else if (tool === 'move' && selectedPartId && selectedPart && selectedPart.pixels.size > 0) {
      setIsDragging(true);
      setIsRotating(e.shiftKey);
      setDragStart(getCanvasPos(e));
      setDragStartPose(frames[currentFrame][selectedPartId] || { ...DEFAULT_POSE });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPainting && (tool === 'brush' || tool === 'eraser')) {
      const pos = getPixelPos(e);
      paintPixels(pos, tool === 'brush');
    } else if (isDragging && selectedPartId && selectedPart) {
      const current = getCanvasPos(e);

      if (isRotating) {
        // 회전 - bounds 중심 기준
        const bounds = getPartBounds(selectedPart.pixels);
        const centerX = (bounds.minX + bounds.maxX + 1) / 2;
        const centerY = (bounds.minY + bounds.maxY + 1) / 2;
        const scaledCenterX = centerX * scale;
        const scaledCenterY = centerY * scale;

        const startAngle = Math.atan2(dragStart.y - scaledCenterY, dragStart.x - scaledCenterX);
        const currentAngle = Math.atan2(current.y - scaledCenterY, current.x - scaledCenterX);
        const deltaAngle = ((currentAngle - startAngle) * 180) / Math.PI;

        updatePose(selectedPartId, {
          ...dragStartPose,
          rotation: dragStartPose.rotation + deltaAngle,
        });
      } else {
        // 이동
        const dx = (current.x - dragStart.x);
        const dy = (current.y - dragStart.y);

        updatePose(selectedPartId, {
          ...dragStartPose,
          x: dragStartPose.x + dx,
          y: dragStartPose.y + dy,
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPainting(false);
    setIsDragging(false);
    setIsRotating(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (tool !== 'move' || !selectedPartId || !selectedPart || selectedPart.pixels.size === 0) return;
    e.preventDefault();

    const currentPose = frames[currentFrame][selectedPartId] || DEFAULT_POSE;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldScale = currentPose.scale;
    const newScale = Math.max(0.1, Math.min(3, oldScale + delta));

    // 마우스 위치 (픽셀 좌표)
    const mousePos = getPixelPos(e);

    // 부위의 원래 중심
    const bounds = getPartBounds(selectedPart.pixels);
    const centerX = (bounds.minX + bounds.maxX + 1) / 2;
    const centerY = (bounds.minY + bounds.maxY + 1) / 2;

    // 현재 변환된 중심 위치
    const currentCenterX = centerX + currentPose.x;
    const currentCenterY = centerY + currentPose.y;

    // 마우스에서 중심까지의 거리
    const relX = mousePos.x - currentCenterX;
    const relY = mousePos.y - currentCenterY;

    // 스케일 비율
    const scaleRatio = newScale / oldScale;

    // 새 위치 계산 (마우스 위치가 고정되도록)
    const newX = currentPose.x + relX * (1 - scaleRatio);
    const newY = currentPose.y + relY * (1 - scaleRatio);

    updatePose(selectedPartId, {
      ...currentPose,
      scale: newScale,
      x: newX,
      y: newY,
    });
  };

  // ==================== Pose 관리 ====================

  const updatePose = (partId: string, pose: PartPose) => {
    setFrames(prev => {
      const newFrames = [...prev];
      newFrames[currentFrame] = {
        ...newFrames[currentFrame],
        [partId]: pose,
      };
      return newFrames;
    });
  };

  const resetPose = () => {
    if (!selectedPartId) return;
    updatePose(selectedPartId, { ...DEFAULT_POSE });
  };

  const copyToAllFrames = () => {
    if (!selectedPartId) return;
    const currentPose = frames[currentFrame][selectedPartId];
    if (!currentPose) return;

    setFrames(prev => prev.map(frame => ({
      ...frame,
      [selectedPartId]: { ...currentPose },
    })));
  };

  // ==================== 프레임 관리 ====================

  const addFrame = () => {
    if (frameCount >= 12) return;
    setFrames(prev => [...prev, {}]);
    setFrameCount(prev => prev + 1);
  };

  const removeFrame = () => {
    if (frameCount <= 2) return;
    setFrames(prev => prev.slice(0, -1));
    setFrameCount(prev => prev - 1);
    if (currentFrame >= frameCount - 1) {
      setCurrentFrame(frameCount - 2);
    }
  };

  // ==================== 내보내기 ====================

  const handleExport = () => {
    if (!sourceCanvas || parts.length === 0) {
      alert('부위를 하나 이상 추가해주세요!');
      return;
    }

    const hasPaintedParts = parts.some(p => p.pixels.size > 0);
    if (!hasPaintedParts) {
      alert('부위에 픽셀을 칠해주세요!');
      return;
    }

    const exportedFrames: ImageData[] = [];
    for (let i = 0; i < frameCount; i++) {
      const rendered = renderAnimationFrame(sourceCanvas, parts, frames[i] || {}, pixelSize);
      exportedFrames.push(rendered);
    }

    onFramesGenerated(exportedFrames);
  };

  // ==================== Render ====================

  return createPortal(
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]">
      {/* 새 부위 추가 모달 */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[10000]">
          <div className="bg-neutral-800 p-5 rounded-lg border border-neutral-600 w-72">
            <h3 className="text-white font-bold mb-3">새 부위 추가</h3>
            <input
              type="text"
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPart()}
              placeholder="부위 이름 (예: 팔, 머리)"
              className="w-full px-3 py-2 bg-neutral-700 text-white rounded border border-neutral-600 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600">
                취소
              </button>
              <button onClick={addPart} className="flex-1 py-2 bg-[#2563eb] text-white rounded hover:bg-[#3b82f6]">
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 w-[95vw] h-[95vh] flex flex-col overflow-hidden">
        {/* Header - 부위 목록 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-[#2563eb] text-white text-sm rounded hover:bg-[#3b82f6]"
          >
            + 새 부위
          </button>

          <div className="h-6 w-px bg-neutral-700" />

          {parts
            .slice()
            .sort((a, b) => b.zIndex - a.zIndex) // zIndex 높은게 앞 (맨 위에 표시)
            .map(part => (
              <div
                key={part.id}
                onClick={() => setSelectedPartId(part.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer ${selectedPartId === part.id
                  ? 'bg-neutral-700 ring-2 ring-white'
                  : 'bg-neutral-800 hover:bg-neutral-700'
                  }`}
              >
                {/* 순서 버튼 */}
                <div className="flex flex-col gap-0.5 mr-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); movePartUp(part.id); }}
                    className="text-[10px] text-neutral-500 hover:text-white leading-none px-0.5"
                    title="앞으로 (위에 표시)"
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); movePartDown(part.id); }}
                    className="text-[10px] text-neutral-500 hover:text-white leading-none px-0.5"
                    title="뒤로 (아래에 표시)"
                  >
                    ▼
                  </button>
                </div>

                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: part.color }} />
                <span className="text-sm text-white">{part.name}</span>
                <span className="text-xs text-neutral-400">({part.pixels.size}px)</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePart(part.id); }}
                  className="text-neutral-500 hover:text-red-400 ml-1"
                >
                  ×
                </button>
              </div>
            ))}

          {parts.length === 0 && (
            <span className="text-neutral-500 text-sm">← 부위를 추가하세요</span>
          )}

          <div className="flex-1" />

          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl px-2">✕</button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr_200px] gap-4">
          {/* Left - 편집 캔버스 (반응형 컨테이너) */}
          <div className="flex flex-col min-h-0 h-full">
            {/* 도구 바 */}
            <div className="flex items-center gap-1 mb-2 h-9">
              <button
                onClick={() => setTool('brush')}
                className={`px-3 py-1 text-xs rounded ${tool === 'brush' ? 'bg-[#2563eb] text-white' : 'bg-neutral-800 text-neutral-400'}`}
              >
                🖌️ 칠하기
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`px-3 py-1 text-xs rounded ${tool === 'eraser' ? 'bg-[#2563eb] text-white' : 'bg-neutral-800 text-neutral-400'}`}
              >
                🧹 지우기
              </button>
              <button
                onClick={() => setTool('move')}
                className={`px-3 py-1 text-xs rounded ${tool === 'move' ? 'bg-[#2563eb] text-white' : 'bg-neutral-800 text-neutral-400'}`}
              >
                ✋ 움직이기
              </button>

              <div className="w-px h-5 bg-neutral-700 mx-1" />

              <span className="text-xs text-neutral-500">브러시:</span>
              <input
                type="range"
                min="1"
                max="32"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-neutral-400 w-6">{brushSize}</span>
            </div>

            <div className="flex-1 min-h-0 relative bg-neutral-950 border border-neutral-700 rounded overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={pixelSize}
                height={pixelSize}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                className="cursor-crosshair w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* 도움말 및 정보 제거됨 (우측 사이드바로 이동) */}
          </div>

          {/* Center - 미리보기 (반응형 컨테이너) */}
          <div className="flex flex-col min-h-0 h-full">
            <div className="flex items-center gap-1 mb-2 h-9">
              <span className="text-xs text-neutral-400">미리보기</span>
              <div className="flex-1" />
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-2 py-0.5 text-xs rounded ${isPlaying ? 'bg-green-600 text-white' : 'bg-neutral-700 text-neutral-300'}`}
              >
                {isPlaying ? '▶ 재생중' : '⏸ 정지'}
              </button>
            </div>
            <div className="flex-1 min-h-0 relative bg-neutral-950 border border-neutral-700 rounded overflow-hidden flex items-center justify-center">
              <canvas
                ref={previewRef}
                width={pixelSize}
                height={pixelSize}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          {/* Right - 프레임 & 프리셋 */}
          <div className="space-y-3 overflow-y-auto">

            {/* 도움말 & 정보 (여기 이동됨) */}
            <div className="bg-neutral-800/50 p-2 rounded">
              <div className="text-xs text-neutral-500 space-y-0.5 mb-2">
                {tool === 'brush' && <div>🖌️ 클릭/드래그로 픽셀 추가</div>}
                {tool === 'eraser' && <div>🧹 클릭/드래그로 픽셀 제거</div>}
                {tool === 'move' && (
                  <>
                    <div>✋ 드래그: 이동</div>
                    <div>🔄 Shift+드래그: 회전</div>
                    <div>🔍 스크롤: 크기 조절</div>
                  </>
                )}
              </div>

              {selectedPart && tool === 'move' && (
                <div className="p-2 bg-neutral-800 rounded text-xs border border-neutral-700">
                  <div className="text-neutral-400 mb-1 font-bold">{selectedPart.name}</div>
                  {(() => {
                    const pose = frames[currentFrame][selectedPart.id] || DEFAULT_POSE;
                    return (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-neutral-300 mb-2">
                        <div>X: {pose.x.toFixed(1)}</div>
                        <div>Y: {pose.y.toFixed(1)}</div>
                        <div>R: {pose.rotation.toFixed(0)}°</div>
                        <div>S: {(pose.scale * 100).toFixed(0)}%</div>
                      </div>
                    );
                  })()}
                  <div className="flex gap-1">
                    <button onClick={resetPose} className="flex-1 py-1 bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600">
                      리셋
                    </button>
                    <button onClick={copyToAllFrames} className="flex-1 py-1 bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600">
                      전체복사
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 프레임 타임라인 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-neutral-400">프레임</span>
                <div className="flex-1" />
                <button onClick={removeFrame} disabled={frameCount <= 2} className="w-6 h-6 bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700 disabled:opacity-50">
                  −
                </button>
                <button onClick={addFrame} disabled={frameCount >= 12} className="w-6 h-6 bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700 disabled:opacity-50">
                  +
                </button>
              </div>

              <div className="flex gap-1">
                {Array.from({ length: frameCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentFrame(i); setTool('move'); }}
                    className={`flex-1 py-2 text-sm rounded transition-all ${currentFrame === i
                      ? 'bg-[#2563eb] text-white'
                      : previewFrame === i && isPlaying
                        ? 'bg-[#2563eb]/50 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* 빠른 프리셋 */}
            <div className="border-t border-neutral-700 pt-3">
              <div className="text-xs text-neutral-400 mb-2">빠른 애니메이션</div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    // 간단한 좌우 흔들기
                    const newFrames = frames.map((_, i) => {
                      const pose: FrameData = {};
                      parts.forEach(part => {
                        const swing = Math.sin((i / frameCount) * Math.PI * 2) * 3;
                        pose[part.id] = { x: swing, y: 0, rotation: swing * 2, scale: 1 };
                      });
                      return pose;
                    });
                    setFrames(newFrames);
                  }}
                  className="py-1.5 bg-neutral-800 text-xs text-neutral-300 rounded hover:bg-neutral-700"
                >
                  🌊 흔들기
                </button>
                <button
                  onClick={() => {
                    // 위아래 바운스
                    const newFrames = frames.map((_, i) => {
                      const pose: FrameData = {};
                      parts.forEach(part => {
                        const bounce = Math.abs(Math.sin((i / frameCount) * Math.PI * 2)) * -3;
                        pose[part.id] = { x: 0, y: bounce, rotation: 0, scale: 1 };
                      });
                      return pose;
                    });
                    setFrames(newFrames);
                  }}
                  className="py-1.5 bg-neutral-800 text-xs text-neutral-300 rounded hover:bg-neutral-700"
                >
                  ⬆️ 바운스
                </button>
                <button
                  onClick={() => {
                    // 회전
                    const newFrames = frames.map((_, i) => {
                      const pose: FrameData = {};
                      parts.forEach(part => {
                        const rot = (i / frameCount) * 360 / 4;
                        pose[part.id] = { x: 0, y: 0, rotation: rot, scale: 1 };
                      });
                      return pose;
                    });
                    setFrames(newFrames);
                  }}
                  className="py-1.5 bg-neutral-800 text-xs text-neutral-300 rounded hover:bg-neutral-700"
                >
                  🔄 회전
                </button>
                <button
                  onClick={() => {
                    // 리셋
                    setFrames(Array.from({ length: frameCount }, () => ({})));
                  }}
                  className="py-1.5 bg-neutral-800 text-xs text-neutral-300 rounded hover:bg-neutral-700"
                >
                  ↩️ 초기화
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-4 border-t border-neutral-700 mt-auto shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700">
            취소
          </button>
          <div className="flex-1" />
          <button
            onClick={handleExport}
            disabled={parts.length === 0 || !parts.some(p => p.pixels.size > 0)}
            className="px-6 py-2 bg-[#2563eb] text-white rounded hover:bg-[#3b82f6] disabled:opacity-50"
          >
            ✨ {frameCount}프레임 생성
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PartRigger;
