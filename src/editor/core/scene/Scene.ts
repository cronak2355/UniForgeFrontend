import { RuleEngine, type GameRule } from "../events/RuleEngine";
import { EventBus, type GameEvent } from "../events/EventBus";
import type { ActionContext } from "../events/ActionRegistry";
import { SceneState } from "./SceneState";

export abstract class Scene {
    readonly name: string;
    protected rules: GameRule[] = [];
    protected state: SceneState = new SceneState();

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Scene 진입 시 호출
     */
    enter() {
        console.log(`[Scene] Enter: ${this.name}`);

        this.state.reset();
        RuleEngine.loadRules(this.rules);

        EventBus.on(this.handleEvent);
        this.onEnter();
    }

    /**
     * Scene 종료 시 호출
     */
    exit() {
        console.log(`[Scene] Exit: ${this.name}`);

        EventBus.off(this.handleEvent);
        this.onExit();
    }

    /**
     * Scene 고유 로직 (옵션)
     */
    protected onEnter() { }
    protected onExit() { }

    /**
     * Event -> RuleEngine 연결
     */
    private handleEvent = (event: GameEvent) => {
        const ctx: ActionContext = {
            entityId: "scene",
            modules: {},
            eventData: event.data ?? {},
            globals: {
                sceneState: this.state,
                sceneName: this.name
            }
        };

        RuleEngine.handleEvent(event, ctx);
    };
}
