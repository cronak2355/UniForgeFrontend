import { useState, useEffect, useRef } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';
import {
  generateSimpleAnimation,
  SIMPLE_PRESETS,
  type SimpleAnimationType
} from '../services/simpleAnimationService';
import { PartRigger } from './PartRigger';
import { generateAsset, fetchAssetAsBlob } from '../services/SagemakerService';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

type TabType = 'ai' | 'animate' | 'export';

export function RightPanel() {
  const {
    frames,
    currentFrameIndex,
    getFrameThumbnail,
    isPlaying,
    setIsPlaying,
    fps,
    setFps,
    downloadWebP,
    isLoading,
    setIsLoading,
    loadAIImage,
    pixelSize,
    addFrame,
    selectFrame,
    applyImageData,
    getWorkCanvas,
    bgRemovalTolerance,
    setBgRemovalTolerance,
  } = useAssetsEditor();

  // ==================== State ====================
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [previewFrame, setPreviewFrame] = useState(0);
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const intervalRef = useRef<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [assetType, setAssetType] = useState<'character' | 'object' | 'effect'>('character');

  // Export State
  const [exportName, setExportName] = useState('sprite');

  // 🦴 리깅 모달 상태
  const [showRigger, setShowRigger] = useState(false);

  // ==================== Animation Preview ====================

  useEffect(() => {
    const newThumbnails = frames.map((_, index) => getFrameThumbnail(index));
    setThumbnails(newThumbnails);
  }, [frames, getFrameThumbnail, currentFrameIndex]);

  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      intervalRef.current = window.setInterval(() => {
        setPreviewFrame((prev) => (prev + 1) % frames.length);
      }, 1000 / fps);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPreviewFrame(currentFrameIndex);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, fps, frames.length, currentFrameIndex]);

  useEffect(() => {
    if (!isPlaying) {
      setPreviewFrame(currentFrameIndex);
    }
  }, [currentFrameIndex, isPlaying]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ==================== Utility ====================

  const addChatMessage = (role: 'user' | 'ai', content: string) => {
    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: new Date() }
    ]);
  };

  const base64ToBlob = (base64DataUrl: string): Promise<Blob> => {
    return fetch(base64DataUrl).then(res => res.blob());
  };

  /**
   * 스프라이트 시트를 프레임별로 분할
   * @param img - 로드된 Image 객체 (예: 512x128)
   * @param frameCount - 프레임 개수 (기본 4)
   * @returns ImageData 배열
   */
  const splitSpriteSheet = (
    img: HTMLImageElement,
    frameCount: number = 4
  ): ImageData[] => {
    const frameWidth = Math.floor(img.width / frameCount);
    const frameHeight = img.height;
    const frames: ImageData[] = [];

    for (let i = 0; i < frameCount; i++) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = frameWidth;
      tempCanvas.height = frameHeight;
      const ctx = tempCanvas.getContext('2d');

      if (ctx) {
        // 픽셀아트 보존 설정
        ctx.imageSmoothingEnabled = false;

        // 스프라이트 시트에서 i번째 프레임 추출
        ctx.drawImage(
          img,
          i * frameWidth, 0,      // source x, y
          frameWidth, frameHeight, // source width, height
          0, 0,                    // dest x, y
          frameWidth, frameHeight  // dest width, height
        );

        frames.push(ctx.getImageData(0, 0, frameWidth, frameHeight));
      }
    }

    return frames;
  };

  /**
   * ImageData 배열을 에디터 프레임에 적용
   */
  const applyFramesToEditor = async (frameDataList: ImageData[]) => {
    for (let i = 0; i < frameDataList.length; i++) {
      if (i === 0) {
        // 첫 프레임: 현재 프레임(0번)에 적용
        selectFrame(0);
        await new Promise(r => setTimeout(r, 30));
        applyImageData(frameDataList[i]);
      } else {
        // 나머지 프레임: 새 프레임 추가 후 적용
        addFrame();
        await new Promise(r => setTimeout(r, 50)); // React 상태 업데이트 대기
        selectFrame(i);
        await new Promise(r => setTimeout(r, 30));
        applyImageData(frameDataList[i]);
      }
    }

    // 완료 후 첫 프레임으로 돌아가기
    selectFrame(0);
  };

  // ==================== Handlers ====================

  /**
   * AI 애니메이션 생성 (SageMaker 연동 - 4프레임 스프라이트 시트)
   */
  const handleGenerateAIAnimation = async () => {
    if (!aiPrompt.trim()) return;

    const userPrompt = aiPrompt;
    addChatMessage('user', `🎬 ${userPrompt}`);
    setAiPrompt('');
    setIsLoading(true);

    try {
      // TODO: SageMaker에서 스프라이트 시트 생성 지원 시 구현
      // 현재는 단일 이미지 생성 후 로컬 애니메이션 적용
      const result = await generateAsset({
        prompt: userPrompt,
        asset_type: assetType === 'effect' ? 'object' : assetType,
        width: pixelSize,
        height: pixelSize,
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'AI 생성 실패');
      }

      if (result.asset_url) {
        const blob = await fetchAssetAsBlob(result.asset_url);
        await loadAIImage(blob);
        addChatMessage('ai', '✨ 이미지 생성 완료! Animate 탭에서 애니메이션을 추가하세요.');
      } else {
        throw new Error('이미지 URL이 없습니다');
      }

    } catch (error) {
      console.error('AI Animation Error:', error);
      addChatMessage('ai', `❌ 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * AI 단일 이미지 생성 (SageMaker 연동)
   */
  const handleGenerateSingle = async () => {
    if (!aiPrompt.trim()) return;

    const userPrompt = aiPrompt;
    addChatMessage('user', `✨ ${userPrompt}`);
    setAiPrompt('');
    setIsLoading(true);

    try {
      // SageMaker API 호출
      const result = await generateAsset({
        prompt: userPrompt,
        asset_type: assetType === 'effect' ? 'object' : assetType,
        width: pixelSize,
        height: pixelSize,
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'AI 생성 실패');
      }

      if (result.asset_url) {
        // S3에서 이미지 가져오기
        const blob = await fetchAssetAsBlob(result.asset_url);
        await loadAIImage(blob);
        addChatMessage('ai', '✨ 이미지 생성 완료!');
      } else {
        throw new Error('이미지 URL이 없습니다');
      }
    } catch (error) {
      console.error('AI Single Error:', error);
      addChatMessage('ai', `❌ 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 간단 애니메이션 생성 (로컬 변형)
   */
  const handleGenerateSimpleAnimation = async (animationType: SimpleAnimationType) => {
    const sourceCanvas = getWorkCanvas();
    if (!sourceCanvas) {
      alert('먼저 캔버스에 그림을 그려주세요!');
      return;
    }

    setIsLoading(true);
    try {
      const generatedFrames = generateSimpleAnimation(sourceCanvas, animationType, pixelSize);

      for (let i = 0; i < generatedFrames.length; i++) {
        if (i === 0) {
          applyImageData(generatedFrames[i]);
        } else {
          addFrame();
          await new Promise(r => setTimeout(r, 50));
          selectFrame(i);
          applyImageData(generatedFrames[i]);
        }
      }

      selectFrame(0);
      setIsPlaying(true);
    } catch (error) {
      console.error('Simple Animation Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🦴 리깅 시스템에서 생성된 프레임 적용
   */
  const handleRigFramesGenerated = async (rigFrames: ImageData[]) => {
    setShowRigger(false);
    setIsLoading(true);

    try {
      for (let i = 0; i < rigFrames.length; i++) {
        if (i === 0) {
          selectFrame(0);
          await new Promise(r => setTimeout(r, 30));
          applyImageData(rigFrames[i]);
        } else {
          addFrame();
          await new Promise(r => setTimeout(r, 50));
          selectFrame(i);
          await new Promise(r => setTimeout(r, 30));
          applyImageData(rigFrames[i]);
        }
      }

      selectFrame(0);
      setIsPlaying(true);
      addChatMessage('ai', `🦴 리깅 애니메이션 ${rigFrames.length}프레임 적용 완료!`);
    } catch (error) {
      console.error('Rig Apply Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🦴 리깅 모달 열기
   */
  const handleOpenRigger = () => {
    const sourceCanvas = getWorkCanvas();
    if (!sourceCanvas) {
      alert('먼저 캔버스에 그림을 그려주세요!');
      return;
    }
    setShowRigger(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateSingle();
    }
  };

  // ==================== Render ====================

  return (
    <div className="w-[260px] bg-black border-l border-neutral-800 flex flex-col">
      {/* Preview Section */}
      <div className="p-3 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-500">Preview</span>
          <span className="text-[10px] text-neutral-600">
            Frame {previewFrame + 1}/{frames.length}
          </span>
        </div>

        {/* Preview Canvas */}
        <div
          className="w-full aspect-square mb-3 border border-neutral-800 bg-[#1a1a1a] flex items-center justify-center"
          style={{ imageRendering: 'pixelated' }}
        >
          {thumbnails[previewFrame] ? (
            <img
              src={thumbnails[previewFrame]!}
              alt={`Frame ${previewFrame + 1}`}
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <span className="text-neutral-600 text-xs">No frame</span>
          )}
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={frames.length <= 1}
          className={`w-full py-1.5 text-xs transition-colors ${isPlaying
            ? 'bg-[#2563eb] text-white'
            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-700'
            } ${frames.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        {/* FPS Control */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-neutral-500">FPS:</span>
          <input
            type="range"
            min="1"
            max="24"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            className="flex-1 h-1 bg-neutral-800 rounded appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-neutral-400 w-6 text-right">{fps}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        {(['ai', 'animate', 'export'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs transition-colors ${activeTab === tab
              ? 'text-white border-b-2 border-[#2563eb]'
              : 'text-neutral-500 hover:text-neutral-300'
              }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ==================== AI Tab ==================== */}
        {activeTab === 'ai' && (
          <>
            {/* Chat Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-2 space-y-2"
            >
              {chatMessages.length === 0 && (
                <div className="text-neutral-600 text-xs text-center py-4">
                  프롬프트를 입력하고<br />AI 이미지를 생성하세요
                </div>
              )}
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`text-xs p-2 rounded ${msg.role === 'user'
                    ? 'bg-[#2563eb]/20 ml-4 text-blue-200'
                    : 'bg-neutral-900 mr-4 text-neutral-300'
                    }`}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="text-xs p-2 bg-neutral-900 mr-4 text-neutral-400 animate-pulse">
                  생성 중...
                </div>
              )}
            </div>

            {/* Input Section */}
            <div className="p-2 border-t border-neutral-800 space-y-2">
              {/* Background Removal Tolerance Slider */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-neutral-500 whitespace-nowrap">배경 제거 강도</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bgRemovalTolerance}
                  onChange={(e) => setBgRemovalTolerance(Number(e.target.value))}
                  className="flex-1 h-1 bg-neutral-800 rounded appearance-none cursor-pointer"
                  title="배경 제거 민감도 조절 (높을수록 많이 지워짐)"
                />
                <span className="text-[10px] text-neutral-400 w-5 text-right">{bgRemovalTolerance}</span>
              </div>
              {/* Asset Type Selector */}
              <div className="flex gap-1">
                {(['character', 'object', 'effect'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAssetType(type)}
                    className={`flex-1 py-1 text-[10px] rounded transition-colors ${assetType === type
                      ? 'bg-[#2563eb] text-white'
                      : 'bg-neutral-900 text-neutral-500 hover:text-neutral-300'
                      }`}
                  >
                    {type === 'character' ? '👤' : type === 'object' ? '📦' : '✨'} {type}
                  </button>
                ))}
              </div>

              {/* Prompt Input */}
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: 파란 슬라임 몬스터"
                disabled={isLoading}
                className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white outline-none focus:border-neutral-700 disabled:opacity-50"
              />

              {/* Generate Buttons */}
              <div className="flex gap-1">
                <button
                  onClick={handleGenerateSingle}
                  disabled={isLoading || !aiPrompt.trim()}
                  className="flex-1 py-1.5 bg-neutral-800 text-white text-xs hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ✨ 단일
                </button>
                <button
                  onClick={handleGenerateAIAnimation}
                  disabled={isLoading || !aiPrompt.trim()}
                  className="flex-1 py-1.5 bg-[#2563eb] text-white text-xs hover:bg-[#3b82f6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  🎬 애니메이션
                </button>
              </div>
            </div>
          </>
        )}

        {/* ==================== Animate Tab ==================== */}
        {activeTab === 'animate' && (
          <div className="p-3 space-y-3">
            {/* 🦴 리깅 버튼 (프리미엄 기능) */}
            <button
              onClick={handleOpenRigger}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm rounded font-medium hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all"
            >
              🦴 부위별 리깅 애니메이션
            </button>

            <div className="border-t border-neutral-800 pt-3">
              <p className="text-[10px] text-neutral-500 mb-2">
                간단 변형 (현재 프레임 기반)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SIMPLE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleGenerateSimpleAnimation(preset.id)}
                    disabled={isLoading}
                    className="py-3 bg-neutral-900 border border-neutral-800 text-xs flex flex-col items-center gap-1 hover:border-neutral-700 disabled:opacity-50 transition-colors"
                  >
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-neutral-400">{preset.nameKo}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== Export Tab ==================== */}
        {activeTab === 'export' && (
          <div className="p-3 space-y-3">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">
                파일 이름
              </label>
              <input
                type="text"
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                placeholder="sprite"
                className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white outline-none focus:border-neutral-700"
              />
            </div>

            <button
              onClick={() => downloadWebP(exportName)}
              disabled={frames.length === 0}
              className="w-full py-2 bg-neutral-900 text-xs border border-neutral-800 hover:border-neutral-700 disabled:opacity-50 transition-colors"
            >
              📥 WebP 다운로드
            </button>

            <div className="text-[10px] text-neutral-600 space-y-1">
              <p>• {frames.length}개 프레임</p>
              <p>• {pixelSize}x{pixelSize}px</p>
              <p>• {fps} FPS</p>
            </div>
          </div>
        )}
      </div>

      {/* 🦴 리깅 모달 */}
      {showRigger && (
        <PartRigger
          sourceCanvas={getWorkCanvas()}
          pixelSize={pixelSize}
          onFramesGenerated={handleRigFramesGenerated}
          onClose={() => setShowRigger(false)}
        />
      )}
    </div>
  );
}

export default RightPanel;
