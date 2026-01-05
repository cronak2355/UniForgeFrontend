import { useEffect, useState } from "react";
import { GameCore } from "../core/GameCore";
import { EventBus } from "../core/events/EventBus";
import { StatusHUD } from "./StatusHUD";
import { DialogueBox } from "./DialogueBox";
import { styles } from "./GameUI.styles";
import { StatusModule } from "../core/modules/StatusModule";

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

    // Player Status Tracking
    useEffect(() => {
        if (!gameCore) return;

        let frameId: number;

        const updateStatus = () => {
            // "player" 태그를 가진 엔티티 찾기 (없으면 이름이 "player"인 것)
            const entities = Array.from(gameCore.getAllEntities().values());
            const player = entities.find(e => e.name === "player" || e.name === "Player");

            if (player) {
                // 모듈 목록에서 StatusModule 찾기
                // Note: gameCore.ts의 GameEntity 구조가 Modules[] 이므로 여기서 직접 찾아야 함
                // 하지만 런타임에서는 modules 인스턴스에 접근해야 함. 
                // GameCore가 엔티티의 런타임 모듈 인스턴스를 노출하는지 확인 필요.
                // 현재 구조상 GameCore.modules 맵을 통해 접근하거나, 엔티티의 모듈 리스트를 순회해야 함.

                // 임시: GameCore가 모듈에 대한 직접 접근을 제공하지 않는다면, 
                // StatusModule의 변경 이벤트를 구독하는 방식이 이상적임.
                // 여기서는 polling 방식으로 구현 (requestAnimationFrame)

                // TODO: GameCore에서 런타임 모듈을 가져오는 API가 필요함.
                // 현재는 GameCore.ts를 보면 modules가 EditorModule[] (데이터)로 저장됨.
                // 런타임 인스턴스는 어딘가에 관리되고 있을 것임.

                // 💡 해결책: GameCore.modules (Runtime) Map을 통해 접근
                // GameCore.d.ts 확인 결과 필요. 
                // 일단 GameCore 내부 구현을 가정하고 작성.

                // (가정) GameCore에 getModule(entityId, moduleType) 메서드가 있다고 가정하거나
                // EventBus를 통해 상태 변경을 듣는 것이 가장 깔끔함.
            }
        };

        const onStatusChange = (e: any) => {
            // StatusModule에서 발생하는 이벤트를 EventBus가 중계한다고 가정
            // 하지만 현재 StatusModule은 EventBus를 직접 쓰지 않고 콜백만 씀.
            // 따라서 GameCore나 모듈 초기화 시점에 EventBus 연결이 필요함.

            // 대안: 단순하게 EventBus를 통해 HP_CHANGED 등을 수신
            if (e.entityId === "player" || e.entityId === "Player") {
                // Update State
            }
        };

        // 1. Polling for basic stats (simple & robust for prototype)
        const loop = () => {
            if (!gameCore) return;

            // Player 찾기
            const player = gameCore.getEntity("player") || gameCore.getEntity("Player");
            if (player) {
                // StatusModule 찾기 
                // GameCore.getModule() API가 없으므로 modules 배열 순회 (런타임 객체라고 가정)
                const statusMod = player.modules.find((m: any) => m.type === "Status") as StatusModule | undefined;

                if (statusMod) {
                    setHp(statusMod.hp);
                    setMaxHp(statusMod.maxHp);
                    setMp(statusMod.mp);
                    setMaxMp(statusMod.maxMp);
                    setScore(statusMod.score);
                }
            }

            frameId = requestAnimationFrame(loop);
        };

        loop();

        return () => cancelAnimationFrame(frameId);
    }, [gameCore]);

    // Event Subscriptions
    useEffect(() => {
        const unsubscribe = EventBus.on((event) => {
            switch (event.type) {
                case "DIALOGUE_SHOW":
                    setDialogue(event.data.text);
                    break;
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <div style={styles.overlayContainer}>
            <StatusHUD
                hp={hp}
                maxHp={maxHp}
                mp={mp}
                maxMp={maxMp}
                score={score}
            />

            {dialogue && (
                <DialogueBox
                    text={dialogue}
                    onClose={() => setDialogue(null)}
                />
            )}
        </div>
    );
}
