import { useEffect, useState, useCallback } from "react";
import { EventBus, type GameEvent } from "../core/events/EventBus";

// Damage Number Item
interface Floater {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    life: number; // 0~1
}

export function FloatingText() {
    const [items, setItems] = useState<Floater[]>([]);

    // Move addFloater to useCallback so it can be used inside useEffect
    const addFloater = useCallback((x: number, y: number, text: string, color: string) => {
        setItems(prev => [...prev, {
            id: Math.random().toString(),
            x, y, text, color, life: 1.0
        }]);
    }, []);

    useEffect(() => {
        const handleEvent = (e: GameEvent) => {
            if (e.type === "DAMAGE_DEALT" && e.data) {
                const data = e.data as { x?: number; y?: number; damage?: number; isCritical?: boolean };
                const x = data.x;
                const y = data.y;

                if (x !== undefined && y !== undefined) {
                    addFloater(x, y, `-${data.damage ?? 0}`, data.isCritical ? "#ff0000" : "#ffff00");
                }
            }
        };
        EventBus.on(handleEvent);

        // Animation Loop
        let frameId: number;
        const loop = () => {
            setItems(prev => prev.map(item => ({
                ...item,
                y: item.y - 0.5,
                life: item.life - 0.016 // Slower decay (~60 frames at 60fps = 1 second)
            })).filter(item => item.life > 0));
            frameId = requestAnimationFrame(loop);
        };
        loop();

        return () => {
            EventBus.off(handleEvent);
            cancelAnimationFrame(frameId);
        };
    }, [addFloater]);

    return (
        <div style={{
            position: "absolute",
            top: 0, left: 0, width: "100%", height: "100%",
            pointerEvents: "none",
            overflow: "visible", // Changed from hidden to visible
            zIndex: 9999 // Ensure it's on top
        }}>
            {items.map(item => (
                <div key={item.id} style={{
                    position: "absolute",
                    left: item.x,
                    top: item.y,
                    color: item.color,
                    fontSize: 24,
                    fontWeight: "bold",
                    textShadow: "2px 2px 0 #000, -1px -1px 0 #000",
                    opacity: item.life,
                    transform: `scale(${0.8 + item.life * 0.5})`,
                    whiteSpace: "nowrap"
                }}>
                    {item.text}
                </div>
            ))}
        </div>
    );
}
