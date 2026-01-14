import { FramesSection } from './FramesSection';
import { ToolsSection } from './ToolsSection';
import { PaletteSection } from './PaletteSection';
import './LeftPanel.css';
import { useAssetsEditor } from '../../context/AssetsEditorContext';

type Props = {
    onOpenAiWizard?: () => void;
};

export function LeftPanel({ onOpenAiWizard }: Props) {
    const { loadAIImage } = useAssetsEditor();

    return (
        <div className="left-panel-container">
            {/* Import Button */}
            <div className="left-panel-section" style={{ padding: '0.5rem' }}>
                <label className="export-btn" style={{ margin: 0, justifyContent: 'center' }}>
                    <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) loadAIImage(file);
                            e.target.value = '';
                        }}
                    />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Import Image
                </label>
            </div>

            <FramesSection />
            <ToolsSection />
            <PaletteSection onOpenAiWizard={onOpenAiWizard} />
        </div>
    );
}

// Re-export sub-components for individual use
export { FramesSection } from './FramesSection';
export { ToolsSection } from './ToolsSection';
export { PaletteSection } from './PaletteSection';
