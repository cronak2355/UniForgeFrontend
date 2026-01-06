import { Scene } from "./Scene";
import type { GameRule } from "../events/RuleEngine";

export class EmptyScene extends Scene {
    constructor() {
        super("EmptyScene");

        this.rules = [
            {
                event: "KEY_DOWN",
                eventParams: { key: "Space" },
                actions: [
                    {
                        type: "LOG",
                        message: "Space pressed in EmptyScene"
                    }
                ]
            }
        ] satisfies GameRule[];
    }

    protected onEnter() {
        console.log("[EmptyScene] onEnter");
    }

    protected onExit() {
        console.log("[EmptyScene] onExit");
    }
}
