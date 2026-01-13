import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssetsEditor } from '../context/AssetsEditorContext';
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
import type { Frame } from '../engine/FrameManager';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

type TabType = 'ai' | 'animate' | 'export';

export function RightPanel() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const navigate = useNavigate();

  const {
    frames, // Currently active frames
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
    exportAsSpriteSheet,
    animationMap, // New: Frame-Set Map
    activeAnimationName,
    currentAssetId,
    setCurrentAssetId,
    loop,
    currentAssetMetadata,
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
    // Thumbnails for ACTIVE animation
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
    const finalPrompt = StylePresetService.buildPrompt(userPrompt, selectedStyleId, selectedThemeId, selectedMoodId);
    const styleName = visualStyles.find(s => s.id === selectedStyleId)?.name || 'Raw';
    const themeName = themes.find(t => t.id === selectedThemeId)?.name || 'Raw';
    const moodName = moods.find(m => m.id === selectedMoodId)?.name || 'Neutral';

    addChatMessage('user', `✨ ${userPrompt}`);
    addChatMessage('user', `🎨 [${styleName} | ${themeName} | ${moodName}]`);
    setAiPrompt('');

    addJob('AI 이미지 생성', async () => {
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
        const blob = await fetchAssetAsBlob(result.asset_url);
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

  const handleOpenRigger = () => {
    const sourceCanvas = getWorkCanvas();
    if (!sourceCanvas) {
      alert('먼저 캔버스에 그림을 그려주세요!');
      return;
    }
    setShowRigger(true);
  };

  /**
   * 💾 Save to Project (Refactored for Frame-Set Model)
   */
  const performSave = async (): Promise<string | null> => {
    // 1. Flatten all animation frames into a single list
    const masterFrames: Frame[] = []; // We need to mock Frame objects for exporter
    const animMetadata: Record<string, any> = {};
    let currentIndex = 0;

    // Use a deterministic order for keys to ensure stability
    const animNames = Object.keys(animationMap).sort();

    // NOTE: We should include the *Active* animation latest state if it differs from map?
    // The Context ensures `animationMap` is updated before switch, BUT the current frames on screen/engine
    // might have unsaved changes if we don't save them.
    // Ideally we call `saveCurrentAnimationState` before saving.
    // BUT we can't call hook functions inside this async function easily.
    // Assumption: User edits are auto-saved or user expects 'save' to snap active state.
    // WE SHOULD MANUALLY MERGE ACTIVE STATE.

    // Let's create a snapshot of map
    const finalMap = { ...animationMap };

    // Merge active frames into map snapshot
    // But getting `ImageData` from `frames` (which are Frames objects) requires canvas access.
    // `frames` in context is `Frame[]` from state, which references Engine objects.
    // We can assume `animationMap[activeAnimationName]` is slightly stale, and correct it using `frames`.

    // Convert current `frames` to `ImageData[]`
    // We need to access their canvas.
    // Since `frames` state holds `Frame` objects which hold `data` (Uint8ClampedArray), we can rebuild ImageData.
    // `frames` state is synced from engine.

    if (activeAnimationName && frames.length > 0) {
      const activeImages = frames.map(f => new ImageData(new Uint8ClampedArray(f.data), pixelSize, pixelSize));
      finalMap[activeAnimationName] = {
        frames: activeImages,
        fps: fps,
        loop: loop
      };
    }

    // Now flatten
    // If Map is empty (shouldn't happen with default), use active frames
    if (Object.keys(finalMap).length === 0 && frames.length > 0) {
      // Fallback legacy behavior
      const activeImages = frames.map(f => new ImageData(new Uint8ClampedArray(f.data), pixelSize, pixelSize));
      finalMap['default'] = { frames: activeImages, fps: fps, loop: true };
    }


    Object.keys(finalMap).forEach(name => {
      const animData = finalMap[name];
      const range: number[] = [];

      animData.frames.forEach((imgData) => {
        // Create Mock Frame
        const mockFrame: Frame = {
          id: crypto.randomUUID(),
          name: `${name}_${currentIndex}`,
          data: new Uint8ClampedArray(imgData.data.buffer)
        };
        masterFrames.push(mockFrame);
        range.push(currentIndex);
        currentIndex++;
      });

      animMetadata[name] = {
        frames: range,
        fps: animData.fps,
        loop: animData.loop
      };
    });

    if (masterFrames.length === 0) return null;

    setIsLoading(true);
    try {
      console.log("[RightPanel] Generating SpriteSheet for animations:", Object.keys(finalMap));

      // 2. Generate Blob
      const { blob, metadata } = await exportSpriteSheet(
        masterFrames,
        pixelSize,
        'horizontal',
        'webp',
        0.9,
        // Pass the constructed metadata map
        animMetadata
      );

      console.log("[RightPanel] Generated SpriteSheet Blob:", blob.size, metadata);

      // Generate Thumbnail Blob (First frame of active animation)
      let thumbnailBlob: Blob | null = null;
      if (frames.length > 0) {
        try {
          // Find the active frame (or first of the set)
          // Ideally we want the first frame of the *active animation* to be the thumbnail.
          // 'frames' state variable currently holds the active animation's frames (synced via Context)
          const firstFrame = frames[0];
          // Access ImageData. frames is Frame[]? No, Context 'frames' is Frame[].
          // Wait, 'frames' in RightPanel comes from context?
          // "frames" from context are Frame[] (which has id, etc). 
          // We need ImageData. 'engineRef' has it, or we use 'getFrameThumbnail'?
          // 'frames' in context is actually Frame wrapper. 
          // The exportSpriteSheet uses 'masterFrames' which is ImageData[].

          // Let's use the first frame of 'masterFrames' if available, OR reuse the logic I used for masterFrames.
          // But 'masterFrames' is ALL animations flattened.
          // Use 'frames' from scope? In `performSave`, we iterate `animationMap`.
          // The active animation is `activeAnimationName`.
          // We can get its frames from `animationMap[activeAnimationName].frames`.

          // But `animationMap` contains ImageData directly? 
          // Checking context definition... yes, AnimationData is { frames: ImageData[], ... }.
          // Wait, performSave constructs masterFrames from animationMap.

          const activeAnim = animationMap[activeAnimationName];
          const firstImageData = activeAnim?.frames?.[0] || frames[0]?.data; // Fallback? frames is Frame[]?
          // Actually, in AssetsEditorContext, "frames" is Frame[], which likely contains ImageData in '.data'?
          // Let's check Frame interface. 
          // Assuming we can get ImageData from somewhere.
          // Safest: Use `animationMap[activeAnimationName].frames[0]`.

          if (activeAnim && activeAnim.frames.length > 0) {
            const imgData = activeAnim.frames[0];
            const canvas = document.createElement("canvas");
            canvas.width = imgData.width;
            canvas.height = imgData.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.putImageData(imgData, 0, 0);
              thumbnailBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            }
          }
        } catch (e) {
          console.warn("Failed to generate thumbnail blob", e);
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
          gameId: gameId
        }
      });
      return null; // Navigation will handle the next step

    } catch (e) {
      console.error('Failed to generate sprite sheet:', e);
      alert('Failed to generate sprite sheet');
      return null;
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
                <div className="flex flex-col gap-2 mb-2">
                  {/* Style Selectors (Simplified for brevity) */}
                  <div className="flex gap-2">
                    <select className="flex-1 bg-[#1a1a1a] text-xs text-white border border-white/20 rounded p-1" value={selectedStyleId} onChange={e => setSelectedStyleId(e.target.value)}>{visualStyles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    <select className="flex-1 bg-[#1a1a1a] text-xs text-white border border-white/20 rounded p-1" value={selectedThemeId} onChange={e => setSelectedThemeId(e.target.value)}>{themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-white/5 p-0.5 border border-white/5">
                    {(['character', 'object', 'effect'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setAssetType(t)}
                        className={`px-2 py-1 text-[10px] uppercase tracking-wide transition-colors ${assetType === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                      >
                        {t === 'character' ? 'CHAR' : t === 'object' ? 'OBJ' : 'FX'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-blue-500/5 blur opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe asset..."
                      rows={2}
                      className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors resize-none font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleGenerateSingle} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase">Generate</button>
                    <button onClick={handleRefine} className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-xs uppercase">Refine</button>
                    <button onClick={triggerBackgroundRemoval} className="flex-1 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-300 text-xs uppercase">RM BG</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Animation Studio --- */}
          {activeTab === 'animate' && (
            <div className="p-4 space-y-4 overflow-y-auto">
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

                  <button
                    onClick={() => downloadWebP(exportName)}
                    className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 hover:border-green-500/50 transition-all text-xs font-bold uppercase tracking-widest mt-4"
                  >
                    Download Current Frame
                  </button>

                  {frames.length > 0 && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleSaveOnly}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                      >
                        Save
                      </button>

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
