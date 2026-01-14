// src/AssetsEditor/components/AssetsEditorPage.tsx

import { AssetsEditorProvider, useAssetsEditor } from '../context/AssetsEditorContext';
import { useJob } from '../context/JobContext';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Canvas } from './Canvas';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';

// Imports needed for AI
import { useState } from 'react';
import { AiWizardModal } from './AiWizardModal';
import { generateSingleImage } from '../services/AnimationService';
import { assetService } from '../../services/assetService';
import { EditorEntity } from '../../editor/types/Entity'; // Type import

// Floating Glass Layout
function EditorContent() {
  const { pixelSize, loadAIImage } = useAssetsEditor(); // loadAIImage is all we need to load into canvas
  const { registerApplyHandler, unregisterApplyHandler } = useJob();
  const location = useLocation();
  const navigate = useNavigate();

  // AI State
  const [isAiWizardOpen, setIsAiWizardOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleAiGenerate = async (prompt: string, category: string, metadata: any) => {
    setIsGeneratingAi(true);
    console.log("Generating AI Asset:", prompt);
    try {
      const base64Image = await generateSingleImage(prompt, 512, category.toLowerCase());
      const res = await fetch(`data:image/png;base64,${base64Image}`);
      const blob = await res.blob();

      // Load directly into Editor Canvas
      loadAIImage(blob);

      // Optional: Upload asset or just let user save it?
      // For consistency with EditorLayout, we might want to upload it too, 
      // BUT in Pixel Editor, we usually work on a canvas then save. 
      // Let's just load it to canvas for now as 'loadAIImage' does.

    } catch (e) {
      console.error("AI Generation Failed:", e);
      alert("AI Generation Failed: " + (e instanceof Error ? e.message : 'Unknown'));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 글로벌 Apply Handler 등록 (이 컴포넌트가 마운트 되어 있을 때만 동작)
  useEffect(() => {
    registerApplyHandler((blob) => loadAIImage(blob));

    // Check for pending job result from navigation
    if (location.state && location.state.pendingJobResult) {
      // We have a pending result to apply
      const result = location.state.pendingJobResult;
      console.log("Applying pending job result from navigation");

      // Clear state so it doesn't re-apply on refresh
      navigate(location.pathname, { replace: true, state: {} });

      // Apply
      // Result is Blob (from JobContext addJob return) or whatever
      // In RightPanel generateSingle/Refine, we return 'blob'.
      // So 'result' is Blob.
      loadAIImage(result);
    }

    return () => unregisterApplyHandler();
  }, [loadAIImage, registerApplyHandler, unregisterApplyHandler, location, navigate]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-grid-pattern relative flex items-center justify-center">

      {/* Background Glow (Subtle) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-blue-900/10 pointer-events-none" />

      {/* AI Wizard Modal */}
      <AiWizardModal
        isOpen={isAiWizardOpen}
        onClose={() => setIsAiWizardOpen(false)}
        onGenerate={handleAiGenerate}
      />

      {/* Header (Top Floating) */}
      <header className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel px-6 py-2 rounded-full flex items-center gap-6 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="UniForge Logo" width="20" height="20" className="object-contain" />
          <span className="text-white font-bold tracking-tight text-sm">UniForge</span>
        </div>

        <div className="w-px h-3 bg-white/10" />

        <div className="w-px h-3 bg-white/10" />

        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-xs uppercase tracking-wider">Asset Editor</span>
          <span className="text-blue-400 text-xs font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
            {pixelSize}px
          </span>
        </div>
      </header>

      {/* Main Stage (Canvas) */}
      <div className="relative z-10 p-10 flex items-center justify-center w-full h-full">
        <Canvas />
      </div>

      {/* Floating Left Panel */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40">
        <LeftPanel onOpenAiWizard={() => setIsAiWizardOpen(true)} />
      </div>

      {/* Floating Right Panel */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 h-[85vh]">
        <RightPanel />
      </div>

    </div>
  );
}

export default function AssetsEditorPage() {
  return (
    <AssetsEditorProvider>
      <EditorContent />
    </AssetsEditorProvider>
  );
}


