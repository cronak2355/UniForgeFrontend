import { useEffect, useState, useRef } from "react";
import { EventBus, type GameEvent } from "../core/events/EventBus";

interface LogMessage {
    id: string;
    text: string;
    type: "info" | "combat" | "system";
    timestamp: number;
}

export function GameLog() {
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Mock Logs for demo start
        addLog("게임이 시작되었습니다.", "system");

        const handleEvent = (e: GameEvent) => {
            const data = e.data as Record<string, unknown> | undefined;
            if (!data) return;

            if (e.type === "LOG") {
                addLog(data.text as string, (data.kind as "info" | "combat" | "system") || "info");
            }
            // For demo: Listen to known events and log them
            if (e.type === "GAME_START") addLog("전투가 시작되었습니다!", "system");
            if (e.type === "DAMAGE_DEALT") {
                // e.data: { targetId, damage }
                const isPlayer = (data.targetId as string)?.includes("player");
                const text = isPlayer
                    ? `플레이어가 ${data.damage} 피해를 입었습니다!`
                    : `적이 ${data.damage} 피해를 입었습니다!`;
                addLog(text, "combat");
            }
        };
        EventBus.on(handleEvent);

        return () => EventBus.off(handleEvent);
    }, []);

    const addLog = (text: string, type: "info" | "combat" | "system") => {
        setLogs(prev => {
            const next = [...prev, { id: Date.now().toString() + Math.random(), text, type, timestamp: Date.now() }];
            if (next.length > 20) next.shift(); // Keep last 20
            return next;
        });
    };

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            width: 300,
            height: 150,
            background: "rgba(0,0,0,0.6)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            padding: 8,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: 12,
            color: "#eee",
            pointerEvents: "none"
        }}>
            {logs.map(log => (
                <div key={log.id} style={{
                    marginBottom: 4,
                    color: log.type === "combat" ? "#ff6b6b" : log.type === "system" ? "#ffd43b" : "#eee"
                }}>
                    <span style={{ opacity: 0.5, marginRight: 6 }}>
                        [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}]
                    </span>
                    {log.text}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}
