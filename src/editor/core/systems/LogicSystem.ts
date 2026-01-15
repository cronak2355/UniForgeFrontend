import { System } from "../ExecutionPipeline";
import { RuntimeContext } from "../RuntimeContext";
import { ModuleRuntime } from "../flow/ModuleRuntime";
import { ActionRegistry, type ActionContext } from "../events/ActionRegistry";
import { ConditionRegistry } from "../events/ConditionRegistry";
import type { LogicComponent } from "../../types/Component";

import type { GameCore } from "../GameCore";

export class LogicSystem implements System {
    name = "LogicSystem";
    private moduleRuntime: ModuleRuntime;
    private gameCore?: GameCore;

    // Performance monitoring
    private frameCount = 0;
    private accFrameTime = 0;

    constructor(moduleRuntime: ModuleRuntime) {
        this.moduleRuntime = moduleRuntime;
    }

    setGameCore(core: GameCore) {
        this.gameCore = core;
    }

    onUpdate(context: RuntimeContext, dt: number) {
        const frameStart = performance.now();

        // 1. Execute Logic Components (OnUpdate/TICK)
        const logicComponents = context.getAllComponentsOfType("Logic");
        // console.log(`[LogicSystem] Update. Components: ${logicComponents.length}`);

        if (logicComponents.length === 0 && context.entities.size > 0) {
            // console.warn(`[LogicSystem] No Logic components found! (Entities: ${context.entities.size})`);
        }

        let processedCount = 0;

        for (const comp of logicComponents) {
            const logicData = comp.data as LogicComponent | undefined;
            if (!logicData) continue;

            // Filter: OnUpdate or TICK only
            if (logicData.event !== "OnUpdate" && logicData.event !== "TICK") continue;

            // Check entity exists and is alive
            const entity = context.entities.get(comp.entityId);
            if (!entity || !entity.active) continue;

            const hpVar = context.getEntityVariable(comp.entityId, "hp");
            if (typeof hpVar === "number" && hpVar <= 0) continue;

            // Build ActionContext
            const ctx: ActionContext = {
                entityId: comp.entityId,
                eventData: { dt },
                input: context.getInput(),
                entityContext: context.getEntityContext(comp.entityId),
                globals: {
                    entities: context.entities,
                    renderer: this.gameCore?.getRenderer(),
                    gameCore: this.gameCore,
                }
            };

            // Check conditions
            const conditions = logicData.conditions ?? [];
            const logic = logicData.conditionLogic ?? "AND";

            if (logic === "BRANCH") {
                let handled = false;
                for (const c of conditions) {
                    if (ConditionRegistry.check(c.type, ctx, c)) {
                        for (const action of (c.then ?? [])) {
                            const { type, ...params } = action;
                            ActionRegistry.run(type, ctx, params);
                        }
                        handled = true;
                        break;
                    }
                }
                if (!handled) {
                    for (const action of (logicData.elseActions ?? [])) {
                        const { type, ...params } = action;
                        ActionRegistry.run(type, ctx, params);
                    }
                }
                processedCount++;
                continue;
            }

            let pass = true;

            if (conditions.length > 0) {
                if (logic === "OR") {
                    pass = conditions.some(c => ConditionRegistry.check(c.type, ctx, c));
                } else {
                    pass = conditions.every(c => ConditionRegistry.check(c.type, ctx, c));
                }
            }

            processedCount++;

            // Execute Actions or ElseActions based on condition result
            const actionsToRun = pass
                ? (logicData.actions ?? [])
                : (logicData.elseActions ?? []);

            for (const action of actionsToRun) {
                const { type, ...params } = action;
                ActionRegistry.run(type, ctx, params);
            }
        }

        // 2. Delegate Module logic execution
        const results = this.moduleRuntime.update(0, dt);
        for (const result of results) {
            if (result.status === "failed") {
                // console.warn("[LogicSystem] Module execution failed", result);
            }
        }

        // 3. Performance Reporting
        const frameDuration = performance.now() - frameStart;
        this.accFrameTime += frameDuration;
        this.frameCount++;

        const REPORT_INTERVAL = 300;
        if (this.frameCount >= REPORT_INTERVAL) {
            const avgTime = this.accFrameTime / this.frameCount;
            // console.log(`[LogicSystem] Performance Report (Avg over ${this.frameCount} frames):`);
            // console.log(` - Avg Logic Update Time: ${avgTime.toFixed(4)} ms`);
            // console.log(` - Logic Components Executed: ${processedCount}`);

            this.accFrameTime = 0;
            this.frameCount = 0;
        }
    }
}
