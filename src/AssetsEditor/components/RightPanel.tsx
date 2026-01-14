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
import { exportSpriteSheet } from '../services/SpriteSheetExporter';
import { assetService } from '../../services/assetService';


type TabType = 'animate' | 'export';

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
    pixelSize,
    addFrame,
    selectFrame,
    applyImageData,
    getWorkCanvas,
    exportAsSpriteSheet,
    animationMap,
    activeAnimationName,
    currentAssetId,
    setCurrentAssetId,
  } = useAssetsEditor();
  const animations = Object.entries(animationMap).map(([name, data]) => ({
    name,
    frames: data.frames,
    fps: data.fps,
    loop: data.loop,
  }));

  // ==================== State ====================
  const [activeTab, setActiveTab] = useState<TabType>('animate');
  const [previewFrame, setPreviewFrame] = useState(0);
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const intervalRef = useRef<number | null>(null);


  // Export State
  const [exportName, setExportName] = useState('sprite');

  // 🦴 리깅 모달 상태
  const [showRigger, setShowRigger] = useState(false);

  // Asset/Motion Type State (Restored for Export)
  const [assetType, setAssetType] = useState<'character' | 'object' | 'effect'>('character');
  const [motionType, setMotionType] = useState('explode');

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


  // ==================== Utility ====================

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


  // ==================== Handlers ====================


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // AI generation removed
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
      // addChatMessage('ai', `🦴 리깅 애니메이션 ${rigFrames.length}프레임 적용 완료!`); // Removed AI chat message
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

      const token = localStorage.getItem("token");
      const assetName = exportName.trim() || 'animation_sprite';
      const tag = assetType === 'character' ? 'Character' : assetType === 'effect' ? 'Particle' : 'Tile';
      let savedId = currentAssetId;

      console.log("[AssetsEditor] Uploading asset", { assetName, tag, metadata, currentAssetId });
      if (currentAssetId) {
        await assetService.updateAsset(currentAssetId, blob, metadata, token);
      } else {
        const result = await assetService.uploadAsset(blob, assetName, tag, token, metadata);
        savedId = result.id;
      }

      return savedId;
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
    console.log("[AssetsEditor] Saving asset", { assetType, exportName });
    const savedId = await performSave();
    if (savedId) {
      const targetPath = gameId ? `/editor/${gameId}` : '/editor';
      console.log("[AssetsEditor] Navigating to editor with new asset", { savedId, targetPath });
      navigate(`${targetPath}?newAssetId=${savedId}`);
    } else {
      console.warn("[AssetsEditor] Save returned no asset ID");
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
          {(['animate', 'export'] as TabType[]).map((tab) => (
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
