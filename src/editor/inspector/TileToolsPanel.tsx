import React from "react";
import { colors } from "../constants/colors";

type ToolType = "" | "drawing" | "erase" | "bucket" | "shape" | "connected_erase";

interface TileToolsPanelProps {
    currentTool: ToolType;
    setTool: (tool: ToolType) => void;
}

export const TileToolsPanel: React.FC<TileToolsPanelProps> = ({ currentTool, setTool }) => {

    const tools: { id: ToolType, label: string, icon: string }[] = [
        { id: "drawing", label: "Brush", icon: "✏️" },
        { id: "erase", label: "Eraser", icon: "🧹" },
        { id: "bucket", label: "Bucket", icon: "🪣" },
        { id: "shape", label: "Shape", icon: "⬜" },
        { id: "connected_erase", label: "Magic Eraser", icon: "✨" },
    ];

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "4px",
            padding: "8px",
            background: colors.bgSecondary,
            borderTop: `1px solid ${colors.borderColor}`,
            borderBottom: `1px solid ${colors.borderColor}`
        }}>
            {tools.map((tool) => {
                const isActive = currentTool === tool.id;
                return (
                    <button
                        key={tool.id}
                        onClick={() => setTool(isActive ? "" : tool.id)}
                        title={tool.label}
                        style={{
                            padding: "8px",
                            fontSize: "16px",
                            background: isActive ? colors.borderAccent : colors.bgTertiary,
                            border: `1px solid ${isActive ? colors.accentLight : colors.borderColor}`,
                            borderRadius: "4px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s"
                        }}
                    >
                        {tool.icon}
                    </button>
                );
            })}
        </div>
    );
};
