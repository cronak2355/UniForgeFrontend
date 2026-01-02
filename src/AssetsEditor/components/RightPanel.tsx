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
    featherAmount,
    setFeatherAmount,
    triggerBackgroundRemoval,
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
   * AI Refine (Image-to-Image)
   * 현재 캔버스 내용을 바탕으로 AI가 다듬기
   */
  const handleRefine = async () => {
    if (!aiPrompt.trim()) return;

    const sourceCanvas = getWorkCanvas();
    if (!sourceCanvas) {
      alert('캔버스 내용을 가져올 수 없습니다.');
      return;
    }

    const base64Image = sourceCanvas.toDataURL('image/png').split(',')[1]; // Remove data:image/png;base64, prefix

    const userPrompt = aiPrompt;
    addChatMessage('user', `✨ Refine: ${userPrompt}`);
    setAiPrompt('');
    setIsLoading(true);

    try {
      const result = await generateAsset({
        prompt: userPrompt,
        asset_type: assetType === 'effect' ? 'object' : assetType,
        width: pixelSize,
        height: pixelSize,
        image: base64Image,
        strength: 0.65, // Default strength for refinement
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'AI Refine Failed');
      }

      if (result.asset_url) {
        const blob = await fetchAssetAsBlob(result.asset_url);
        await loadAIImage(blob);
        addChatMessage('ai', '✨ 리파인 완료!');
      } else {
        throw new Error('No image URL returned');
      }
    } catch (error) {
      console.error('AI Refine Error:', error);
      addChatMessage('ai', `❌ 리파인 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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
    <div className="h-full flex flex-col w-[320px] mr-4 transition-all duration-300 gap-4">

      {/* 1. Preview Block (Floating Top) */}
      <div className="glass-panel p-4 border border-white/10 bg-black/40 shrink-0">
        <div className="flex gap-4">
          {/* Preview Box */}
          <div className="w-24 h-24 border border-white/10 bg-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 4px 4px'
              }}
            />
            {thumbnails[previewFrame] && (
              <img src={thumbnails[previewFrame]!} className="absolute inset-0 w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
            )}
            {/* Mini Controls Overlay */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="text-2xl text-white drop-shadow-lg">{isPlaying ? '⏸' : '▶'}</span>
            </button>
          </div>

          {/* Info & FPS */}
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <div className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-1">Preview</div>
              <div className="text-[10px] text-white/40 font-mono">FRAME {previewFrame + 1} / {frames.length}</div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-wider">
                <span>Speed</span>
                <span className="text-white font-mono">{fps} FPS</span>
              </div>
              <input
                type="range"
                min="1" max="24"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full h-1 bg-white/10 appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Block (Tabs + Content) */}
      <div className="glass-panel border border-white/10 bg-black/40 flex-1 flex flex-col overflow-hidden">
        {/* Tabs Switcher */}
        <div className="flex border-b border-white/5">
          {(['ai', 'animate', 'export'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                    flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2
                    ${activeTab === tab
                  ? 'bg-white/5 text-white border-blue-500'
                  : 'text-white/40 border-transparent hover:text-white hover:bg-white/5'}
                  `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative">

          {/* --- AI Studio --- */}
          {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col">
              {/* Chat Area */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <span className="text-4xl mb-2 grayscale">✨</span>
                    <p className="text-xs uppercase tracking-wide">Generator Ready</p>
                  </div>
                )}
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                              max-w-[85%] px-3 py-2 text-xs leading-relaxed border
                              ${msg.role === 'user'
                        ? 'bg-blue-600/20 text-blue-100 border-blue-500/30'
                        : 'bg-white/5 text-white/80 border-white/10'}
                          `}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 px-3 py-2 text-xs text-white/40 animate-pulse flex gap-2 items-center border border-white/10">
                      <div className="w-1.5 h-1.5 bg-blue-500 animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-blue-500 animate-bounce [animation-delay:0.1s]" />
                      <div className="w-1.5 h-1.5 bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-black/10 border-t border-white/5 space-y-3">

                {/* Controls Row */}
                <div className="flex items-center gap-2">
                  {/* Type Selector */}
                  <div className="flex bg-white/5 p-0.5 border border-white/5">
                    {(['character', 'object'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setAssetType(t)}
                        className={`px-2 py-1 text-[10px] uppercase tracking-wide transition-colors ${assetType === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                        title={t}
                      >
                        {t === 'character' ? 'CHAR' : 'OBJ'}
                      </button>
                    ))}
                  </div>

                  {/* Feather Slider */}
                  <div className="flex-1 flex items-center gap-2 bg-white/5 px-2 py-1 border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase">Feather</span>
                    <input
                      type="range" min="0" max="100" value={featherAmount}
                      onChange={e => setFeatherAmount(Number(e.target.value))}
                      className="flex-1 h-1 bg-white/10"
                    />
                    <span className="text-[10px] text-blue-400 w-4 font-mono">{featherAmount}</span>
                  </div>
                </div>

                {/* Prompt Input (Textarea + Big Button) */}
                <div className="flex flex-col gap-2">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-blue-500/5 blur opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerateSingle();
                        }
                      }}
                      placeholder="Describe asset..."
                      rows={3}
                      className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors resize-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleGenerateSingle}
                      disabled={isLoading || !aiPrompt.trim()}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2 text-white font-bold uppercase tracking-widest text-[10px] border border-blue-400/20 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
                    >
                      <span>Generate</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={handleRefine}
                        disabled={isLoading || !aiPrompt.trim()}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 flex items-center justify-center gap-2 text-white font-bold uppercase tracking-widest text-[10px] border border-purple-400/20 shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
                        title="Refine current canvas with AI"
                      >
                        <span>Refine</span>
                      </button>

                      <button
                        onClick={triggerBackgroundRemoval}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 flex items-center justify-center gap-2 text-white font-bold uppercase tracking-widest text-[10px] border border-teal-400/20 shadow-lg shadow-teal-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
                        title="Auto-remove solid background (Green/White)"
                      >
                        <span>Remove BG</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Animation Tab --- */}
          {activeTab === 'animate' && (
            <div className="p-4 space-y-4 overflow-y-auto">
              <button
                onClick={handleOpenRigger}
                className="w-full py-4 bg-gradient-to-r from-violet-900/50 to-indigo-900/50 border border-indigo-500/30 hover:border-indigo-500/70 flex items-center justify-center gap-2 text-sm font-medium text-white transition-all"
              >
                <span>🦴</span> Auto Rigger
              </button>

              <div>
                <h4 className="text-[10px] uppercase text-white/40 tracking-widest mb-2 font-bold">Presets</h4>
                <div className="grid grid-cols-2 gap-2">
                  {SIMPLE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleGenerateSimpleAnimation(preset.id)}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-3 flex flex-col items-center gap-2 transition-all"
                    >
                      <span className="text-2xl pt-1 grayscale hover:grayscale-0 transition-all">{preset.emoji}</span>
                      <span className="text-[10px] text-white/70 uppercase tracking-wide">{preset.nameKo}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- Export Tab --- */}
          {activeTab === 'export' && (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-white/40 tracking-widest font-bold">Filename</label>
                <input
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none transition-colors font-mono"
                />
              </div>

              <div className="p-4 bg-white/5 space-y-2 border border-white/5">
                <div className="flex justify-between text-xs text-white/60 font-mono">
                  <span>Resolution</span>
                  <span className="text-white">{pixelSize} x {pixelSize}</span>
                </div>
                <div className="flex justify-between text-xs text-white/60 font-mono">
                  <span>Frames</span>
                  <span className="text-white">{frames.length}</span>
                </div>
                <div className="flex justify-between text-xs text-white/60 font-mono">
                  <span>Duration</span>
                  <span className="text-white">{(frames.length / fps).toFixed(1)}s</span>
                </div>
              </div>

              <button
                onClick={() => downloadWebP(exportName)}
                disabled={frames.length === 0}
                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                📥 Export WebP
              </button>
            </div>
          )}

        </div>
      </div>


      {/* 🦴 Rigger Modal (Overlay) */}
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
