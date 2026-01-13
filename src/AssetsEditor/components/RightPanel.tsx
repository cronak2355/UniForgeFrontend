import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssetsEditor } from '../context/AssetsEditorContext';
import type { Frame } from '../engine/FrameManager';
import {
  generateSimpleAnimation,
  SIMPLE_PRESETS,
  type SimpleAnimationType
} from '../services/simpleAnimationService';
import { AnimationManager } from './AnimationManager';
import { PartRigger } from './PartRigger';
import { useJob } from '../context/JobContext';
import { StylePresetService } from '../services/StylePresetService';
import { generateAsset, fetchAssetAsBlob } from '../services/SagemakerService';
import { exportSpriteSheet } from '../services/SpriteSheetExporter';
import { assetService } from '../../services/assetService';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

type TabType = 'ai' | 'animate' | 'export';

export function RightPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');

  const {
    frames,
    currentFrameIndex,
    getFrameThumbnail,
    isPlaying,
    setIsPlaying,
    fps,
    setFps,
    loop,
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
    exportAsSpriteSheet,
    animationMap,
    activeAnimationName,
    currentAssetMetadata,
    currentAssetId,
    setCurrentAssetId,
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
  const [motionType, setMotionType] = useState('explode');

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

  // Job Context
  const { addJob } = useJob();

  // Style Presets State (3D Granularity)
  const [visualStyles] = useState(StylePresetService.getVisualStyles());
  const [themes] = useState(StylePresetService.getThemes());
  const [moods] = useState(StylePresetService.getMoods());

  const [selectedStyleId, setSelectedStyleId] = useState('pixel_art');
  const [selectedThemeId, setSelectedThemeId] = useState('fantasy');
  const [selectedMoodId, setSelectedMoodId] = useState('neutral');

  // ==================== Handlers ====================

  /**
   * AI 단일 이미지 생성 (Background Job)
   */
  const handleGenerateSingle = async () => {
    if (!aiPrompt.trim()) return;

    const userPrompt = aiPrompt;

    // 스타일/테마/무드 적용
    const finalPrompt = StylePresetService.buildPrompt(userPrompt, selectedStyleId, selectedThemeId, selectedMoodId);

    // UI 표시용 이름 찾기
    const styleName = visualStyles.find(s => s.id === selectedStyleId)?.name || 'Raw';
    const themeName = themes.find(t => t.id === selectedThemeId)?.name || 'Raw';
    const moodName = moods.find(m => m.id === selectedMoodId)?.name || 'Neutral';

    // 채팅창에는 사용자 입력만 표시 + 요약
    addChatMessage('user', `✨ ${userPrompt}`);
    addChatMessage('user', `🎨 [${styleName} | ${themeName} | ${moodName}]`);
    setAiPrompt('');

    // 백그라운드 작업 추가
    addJob('AI 이미지 생성', async () => {
      // SageMaker API 호출
      const result = await generateAsset({
        prompt: finalPrompt, // Enriched prompt
        asset_type: assetType === 'effect' ? 'object' : assetType,
        width: pixelSize,
        height: pixelSize,
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'AI 생성 실패');
      }

      if (result.asset_url) {
        // Blob 반환 (JobNotification이 받아서 loadAIImage 호출)
        const blob = await fetchAssetAsBlob(result.asset_url);

        // Convert to Base64 (DataURL) for reliable history state transfer
        const base64Url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        addChatMessage('ai', '✨ 백그라운드 생성 완료! 결과를 확인하세요.');
        return base64Url;
      } else {
        throw new Error('이미지 URL이 없습니다');
      }
    });

    // UI 차단 없음 (isLoading 제거)
  };

  /**
   * AI Refine (Background Job)
   */
  const handleRefine = async () => {
    if (!aiPrompt.trim()) return;

    const sourceCanvas = getWorkCanvas();
    if (!sourceCanvas) {
      alert('캔버스 내용을 가져올 수 없습니다.');
      return;
    }

    const base64Image = sourceCanvas.toDataURL('image/png').split(',')[1];
    const userPrompt = aiPrompt;

    // 스타일/테마/무드 적용
    const finalPrompt = StylePresetService.buildPrompt(userPrompt, selectedStyleId, selectedThemeId, selectedMoodId);

    addChatMessage('user', `✨ Refine: ${userPrompt} [${selectedThemeId}]`);
    setAiPrompt('');

    addJob('AI 리파인 작업', async () => {
      const result = await generateAsset({
        prompt: finalPrompt,
        asset_type: assetType === 'effect' ? 'object' : assetType,
        width: pixelSize,
        height: pixelSize,
        image: base64Image,
        strength: 0.65,
      });

      if (!result.success) {
        throw new Error(result.error || result.message || 'AI Refine Failed');
      }

      if (result.asset_url) {
        const blob = await fetchAssetAsBlob(result.asset_url);
        addChatMessage('ai', '✨ 리파인 완료! 결과를 적용해보세요.');
        return blob;
      } else {
        throw new Error('No image URL returned');
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateSingle();
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

    // 로컬 작업은 빠르므로 isLoading으로 UI 막지 않거나, 최소한으로 사용
    // 여기서는 통일성을 위해 addJob을 쓰지 않고 바로 실행 (빠름)
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

  /**
   * 💾 Save to Project
   */
  /**
   * 💾 Save Logic (Shared)
   */
  const performSave = async (): Promise<string | null> => {
    // If we have frames, we proceed. Even if only 1 frame.
    if (frames.length === 0 && Object.keys(animationMap).length === 0) return null;

    setIsLoading(true);
    try {
      // 1. Flatten all animations into Master Frames & Metadata
      const masterFrames: Frame[] = [];
      const animMetadata: Record<string, any> = {};

      // Clone map
      const finalMap = { ...animationMap };

      // Sync current active frames (from editor state) into the map
      // 'frames' are Frame[] (wrappers). We need ImageData.
      if (activeAnimationName && frames.length > 0) {
        const currentImages = frames.map(f => new ImageData(new Uint8ClampedArray(f.data), pixelSize, pixelSize));
        finalMap[activeAnimationName] = {
          frames: currentImages,
          fps: fps,
          loop: loop
        };
      }

      // Fallback: If map empty but frames exist (e.g. single frame, no name)
      if (Object.keys(finalMap).length === 0 && frames.length > 0) {
        const currentImages = frames.map(f => new ImageData(new Uint8ClampedArray(f.data), pixelSize, pixelSize));
        // Treat as default animation
        finalMap['default'] = { frames: currentImages, fps: fps, loop: loop };
      }

      let currentIndex = 0;
      Object.keys(finalMap).sort().forEach(name => {
        const data = finalMap[name];
        const range: number[] = [];
        data.frames.forEach((img, idx) => {
          masterFrames.push({
            id: crypto.randomUUID(),
            name: `${name}_${idx}`,
            data: img.data
          });
          range.push(currentIndex);
          currentIndex++;
        });
        animMetadata[name] = { frames: range, fps: data.fps, loop: data.loop };
      });

      if (masterFrames.length === 0) return null;

      // 2. Generate Blob
      const { blob, metadata: sheetMetadata } = await exportSpriteSheet(
        masterFrames,
        pixelSize,
        'horizontal',
        'webp',
        0.9,
        // Pass the constructed metadata map
        animMetadata
      );

      const metadata = {
        ...sheetMetadata,
        motionType: assetType === 'effect' ? motionType : undefined
      };

      // Generate Thumbnail Blob (First frame of the exported sprite sheet - global first frame)
      let thumbnailBlob: Blob | null = null;
      if (masterFrames.length > 0) {
        try {
          const firstFrame = masterFrames[0]; // Global first frame
          const canvas = document.createElement("canvas");
          canvas.width = pixelSize;
          canvas.height = pixelSize;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const imgData = new ImageData(new Uint8ClampedArray(firstFrame.data), pixelSize, pixelSize);
            ctx.putImageData(imgData, 0, 0);
            thumbnailBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          }
        } catch (err) {
          console.warn("Failed to generate thumbnail:", err);
        }
      }

      // Redirect to Create Asset Page for Metadata Input
      navigate('/create-asset', {
        state: {
          assetBlob: blob,
          thumbnailBlob: thumbnailBlob,
          assetName: exportName || currentAssetMetadata?.name || 'New Asset',
          description: currentAssetMetadata?.description, // Pass original description (or handle inside CreateAssetPage)
          initialData: currentAssetMetadata ? {
            name: currentAssetMetadata.name,
            description: currentAssetMetadata.description,
            tag: currentAssetMetadata.genre, // Map genre to tag
            isPublic: currentAssetMetadata.isPublic
          } : undefined,
          metadata: metadata,
          returnToEditor: true,
          gameId: gameId,
          assetId: currentAssetId
        }
      });
      return null; // Navigation will handle the next step

    } catch (e) {
      console.error(e);
      alert("Failed to save: " + String(e));
      return null; // Fail
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOnly = async () => {
    const savedId = await performSave();
    if (savedId) {
      if (!currentAssetId) {
        setCurrentAssetId(savedId);
      }
      alert("Saved successfully!");
    }
  };

  const handleSaveAndExit = async () => {
    const savedId = await performSave();
    if (savedId) {
      if (gameId) {
        window.location.href = `/editor/${gameId}?newAssetId=${savedId}`;
      } else {
        window.location.href = '/editor';
      }
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

                {/* Style & Concept Settings (3-Step Granularity) */}
                <div className="flex flex-col gap-2 mb-2">

                  {/* 1. Visual Style Selector */}
                  <div className="flex justify-between items-center bg-white/5 px-2 py-1 border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest w-12">Style</span>
                    <select
                      className="bg-[#1a1a1a] text-xs text-white border border-white/20 rounded-md px-2 py-1 outline-none focus:border-blue-500/50 appearance-none flex-1 font-mono"
                      value={selectedStyleId}
                      onChange={(e) => setSelectedStyleId(e.target.value)}
                    >
                      {visualStyles.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#1a1a1a] text-white py-1">{s.name}</option>
                      ))}
                      <option value="" className="bg-[#1a1a1a] text-white/50">(None)</option>
                    </select>
                  </div>

                  {/* 2. Theme Selector */}
                  <div className="flex justify-between items-center bg-white/5 px-2 py-1 border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest w-12">Theme</span>
                    <select
                      className="bg-[#1a1a1a] text-xs text-white border border-white/20 rounded-md px-2 py-1 outline-none focus:border-blue-500/50 appearance-none flex-1 font-mono"
                      value={selectedThemeId}
                      onChange={(e) => setSelectedThemeId(e.target.value)}
                    >
                      {themes.map(t => (
                        <option key={t.id} value={t.id} className="bg-[#1a1a1a] text-white py-1">{t.name}</option>
                      ))}
                      <option value="" className="bg-[#1a1a1a] text-white/50">(None)</option>
                    </select>
                  </div>

                  {/* 3. Mood Selector */}
                  <div className="flex justify-between items-center bg-white/5 px-2 py-1 border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest w-12">Mood</span>
                    <select
                      className="bg-[#1a1a1a] text-xs text-white border border-white/20 rounded-md px-2 py-1 outline-none focus:border-blue-500/50 appearance-none flex-1 font-mono"
                      value={selectedMoodId}
                      onChange={(e) => setSelectedMoodId(e.target.value)}
                    >
                      {moods.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#1a1a1a] text-white py-1">{m.name}</option>
                      ))}
                      <option value="" className="bg-[#1a1a1a] text-white/50">(None)</option>
                    </select>
                  </div>

                </div>

                {/* Controls Row */}
                <div className="flex items-center gap-2">
                  {/* Type Selector */}
                  <div className="flex bg-white/5 p-0.5 border border-white/5">
                    {(['character', 'object', 'effect'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setAssetType(t)}
                        className={`px-2 py-1 text-[10px] uppercase tracking-wide transition-colors ${assetType === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                        title={t}
                      >
                        {t === 'character' ? 'CHAR' : t === 'object' ? 'OBJ' : 'FX'}
                      </button>
                    ))}
                  </div>

                  {/* Feather Slider */}
                  <div className="flex-1 flex items-center gap-2 bg-white/5 px-2 py-1 border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase">Feather / Tol</span>
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
                      onKeyDown={handleKeyDown}
                      placeholder="Describe asset..."
                      rows={3}
                      className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors resize-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleGenerateSingle}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] border border-white/10 relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>✨ Generate Asset</span>
                      </span>
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={handleRefine}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] uppercase tracking-widest transition-colors border border-white/5"
                      >
                        Refine Selected
                      </button>
                      <button
                        onClick={triggerBackgroundRemoval}
                        className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 text-[10px] uppercase tracking-widest transition-colors border border-red-500/10 hover:border-red-500/30"
                      >
                        Remove BG
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Animation Studio --- */}
          {activeTab === 'animate' && (
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Animation Manager */}
              <AnimationManager />

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wide">Simple Animation</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SIMPLE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleGenerateSimpleAnimation(p.id)}
                      className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 hover:bg-blue-600/20 hover:border-blue-500/50 transition-all group"
                    >
                      <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{p.emoji}</span>
                      <span className="text-[10px] text-white/60 group-hover:text-white uppercase">{p.nameKo}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Rigger Button */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wide">Advanced</h3>
                <button
                  onClick={handleOpenRigger}
                  className="w-full py-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-white/10 hover:border-purple-500/50 text-white/80 hover:text-white transition-all flex items-center justify-center gap-2 group"
                >
                  <span className="text-lg">🦴</span>
                  <span className="text-xs font-bold uppercase tracking-widest">Auto Rigger</span>
                </button>
              </div>

            </div>
          )}

          {/* --- Export --- */}
          {activeTab === 'export' && (
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wide">Export Settings</h3>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase">File Name</label>
                    <input
                      type="text"
                      value={exportName}
                      onChange={(e) => setExportName(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500/50 font-mono"
                    />
                  </div>

                  {/* Asset Type Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 uppercase">Asset Type</label>
                    <div className="flex bg-white/5 p-1 border border-white/10 rounded">
                      {(['character', 'object', 'effect'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setAssetType(t)}
                          className={`flex-1 px-2 py-2 text-xs font-bold uppercase tracking-wide transition-all rounded ${assetType === t
                            ? t === 'effect'
                              ? 'bg-purple-600 text-white'
                              : 'bg-blue-600 text-white'
                            : 'text-white/40 hover:text-white hover:bg-white/10'
                            }`}
                        >
                          {t === 'character' ? '👤 Character' : t === 'object' ? '🧱 Tile' : '✨ Particle'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-white/30 mt-1">
                      {assetType === 'effect' && '파티클 효과로 저장됩니다. PlayParticle 액션에서 사용 가능.'}
                      {assetType === 'character' && '캐릭터/스프라이트로 저장됩니다.'}
                      {assetType === 'object' && '타일/오브젝트로 저장됩니다.'}
                    </p>
                  </div>

                  {/* Motion Type Selector (Only for Effect) */}
                  {assetType === 'effect' && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-[10px] text-purple-400 uppercase font-bold tracking-widest">Motion Type</label>
                      <select
                        className="w-full bg-[#1a1a1a] text-xs text-white border border-purple-500/30 rounded px-2 py-1.5 outline-none focus:border-purple-500 font-mono appearance-none"
                        onChange={(e) => setMotionType(e.target.value)}
                        value={motionType}
                        id="motion-type-select"
                      >
                        <option value="explode">💥 Explode (폭발/타격)</option>
                        <option value="rise">⬆️ Rise (연기/영혼)</option>
                        <option value="fall">⬇️ Fall (피/파편)</option>
                        <option value="spew">🌊 Spew (분출/브레스)</option>
                        <option value="orbit">🔄 Orbit (오라/회전)</option>
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => downloadWebP(exportName)}
                    className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 hover:border-green-500/50 transition-all text-xs font-bold uppercase tracking-widest mt-4"
                  >
                    Download Current Frame (.webp)
                  </button>

                  {frames.length > 1 && (
                    <button
                      onClick={() => exportAsSpriteSheet({ layout: 'horizontal', format: 'webp' })}
                      disabled={isLoading}
                      className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 transition-all text-xs font-bold uppercase tracking-widest mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📦 Export Sprite Sheet ({frames.length} frames)
                    </button>
                  )}

                  {frames.length > 0 && (
                    <div className="flex gap-2 mt-4">
                      {/* Save Only (Stay) */}
                      <button
                        onClick={handleSaveOnly}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                      >
                        Save
                      </button>

                      {/* Save to Project (Redirect) */}
                      <button
                        onClick={handleSaveAndExit}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/40 border border-white/20 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50 group"
                      >
                        Save to Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 🦴 Rigger Modal (Floating) */}
      {showRigger && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-10">
          <div className="bg-[#1a1a1a] border border-white/10 shadow-2xl rounded-lg w-full max-w-5xl h-full max-h-[90vh] overflow-hidden flex flex-col relative">
            <button
              onClick={() => setShowRigger(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white z-10"
            >
              ✕
            </button>
            <PartRigger
              sourceCanvas={getWorkCanvas()}
              pixelSize={pixelSize}
              onClose={() => setShowRigger(false)}
              onFramesGenerated={handleRigFramesGenerated}
            />
          </div>
        </div>
      )}

    </div>
  );
}
