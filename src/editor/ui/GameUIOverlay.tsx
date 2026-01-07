import { useEffect, useState } from "react";
import { GameCore } from "../core/GameCore";
import { GameHUD } from "./GameUI";
import { GameLog } from "./GameLog";
import { FloatingText } from "./FloatingText";
import { DialogueBox } from "./DialogueBox";
import { EventBus, type GameEvent } from "../core/events/EventBus";
import { hasRole } from "../core/GameConfig";


interface Props {
    gameCore: GameCore | null;
    showHud?: boolean;
}

export function GameUIOverlay({ gameCore, showHud = true }: Props) {
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
        if (!showHud) return;

        let frameId: number;

        const loop = () => {
            if (gameCore) {
                // hudDisplayRoles에 포함된 역할의 엔티티 찾기
                const hudRoles = gameCore.getGameConfig().hudDisplayRoles;
                const entities = Array.from(gameCore.getAllEntities().values());
                const player = entities.find(e => hasRole(e.role, hudRoles));

                if (player) {
                    const getVar = (name: string, fallback: number) => {
                        const variable = player.variables?.find((v) => v.name === name);
                        return typeof variable?.value === "number" ? variable.value : fallback;
                    };
                    setHp(getVar("hp", 100));
                    setMaxHp(getVar("maxHp", 100));
                    setMp(getVar("mp", 50));
                    setMaxMp(getVar("maxMp", 50));
                    setScore(getVar("score", 0));
                }
            }
            frameId = requestAnimationFrame(loop);
        };
        loop();

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, [gameCore, showHud]);

    useEffect(() => {
        // Dialogue Event
        const handleEvent = (e: GameEvent) => {
            if (e.type === "DIALOGUE_SHOW") {
                setDialogue(e.data?.text as string);
            }
        };
        EventBus.on(handleEvent);

        return () => {
            EventBus.off(handleEvent);
        };
    }, []);

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {showHud && (
                <>
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
                </>
            )}

            {/* 4. Dialogue Layer */}
            {dialogue && (
                <div style={{ pointerEvents: 'auto' }}>
                    <DialogueBox text={dialogue} onClose={() => setDialogue(null)} />
                </div>
            )}
        </div>
    );
}
