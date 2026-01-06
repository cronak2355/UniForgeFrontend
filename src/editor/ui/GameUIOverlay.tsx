import { useEffect, useState } from "react";
import { GameCore } from "../core/GameCore";
import { GameHUD } from "./GameUI";
import { GameLog } from "./GameLog";
import { FloatingText } from "./FloatingText";
import { DialogueBox } from "./DialogueBox";
import { EventBus, type GameEvent } from "../core/events/EventBus";


interface Props {
    gameCore: GameCore | null;
}

export function GameUIOverlay({ gameCore }: Props) {
    // HUD State
    const [hp, setHp] = useState(100);
    const [maxHp, setMaxHp] = useState(100);
    const [mp, setMp] = useState(50);
    const [maxMp, setMaxMp] = useState(50);
    const [score, setScore] = useState(0);

    // Dialogue State
    const [dialogue, setDialogue] = useState<string | null>(null);

    // Polling / Event Subscription
    useEffect(() => {
        let frameId: number;

        const loop = () => {
            if (gameCore) {
                // Find Player Entity
                const entities = Array.from(gameCore.getAllEntities().values());
                const player = entities.find(e => e.name.toLowerCase() === "player" || e.name.toLowerCase().includes("player"));

                if (player) {
                    // Get runtime StatusModule (not static editor data)
                    const status = gameCore.getStatusModule(player.id);
                    if (status) {
                        setHp(status.hp);
                        setMaxHp(status.maxHp);
                        setMp(status.mp);
                        setMaxMp(status.maxMp);
                        setScore(status.score);
                    }
                }
            }
            frameId = requestAnimationFrame(loop);
        };
        loop();

        // Dialogue Event
        const handleEvent = (e: GameEvent) => {
            if (e.type === "DIALOGUE_SHOW") {
                setDialogue(e.data?.text as string);
            }
        };
        EventBus.on(handleEvent);

        return () => {
            cancelAnimationFrame(frameId);
            EventBus.off(handleEvent);
        };
    }, [gameCore]);

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* 1. HUD Layer */}
            <GameHUD
                playerHp={hp}
                playerMaxHp={maxHp}
                playerMp={mp}
                playerMaxMp={maxMp}
                playerName="Player"
                playerLevel={1}
                score={score}
                style={{ pointerEvents: 'auto' }}
            />

            {/* 2. Log Layer */}
            <GameLog />

            {/* 3. Floating Text Layer (Damage Numbers) */}
            <FloatingText />

            {/* 4. Dialogue Layer */}
            {dialogue && (
                <div style={{ pointerEvents: 'auto' }}>
                    <DialogueBox text={dialogue} onClose={() => setDialogue(null)} />
                </div>
            )}
        </div>
    );
}
