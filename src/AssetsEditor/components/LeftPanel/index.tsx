// src/AssetsEditor/components/LeftPanel/index.tsx

import { FramesSection } from './FramesSection';
import { ToolsSection } from './ToolsSection';
import { PaletteSection } from './PaletteSection';
import './LeftPanel.css';

export function LeftPanel() {
    return (
        <div className="left-panel-container">
            <FramesSection />
            <ToolsSection />
            <PaletteSection />
        </div>
    );
}

// Re-export sub-components for individual use
export { FramesSection } from './FramesSection';
export { ToolsSection } from './ToolsSection';
export { PaletteSection } from './PaletteSection';
