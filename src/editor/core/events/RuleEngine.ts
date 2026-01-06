import { ActionRegistry, type ActionContext } from "./ActionRegistry";
import { ConditionRegistry } from "./ConditionRegistry";
import type { GameEvent } from "./EventBus";

export interface GameRule {
    event: string;
    eventParams?: Record<string, unknown>;
    conditions?: {
        type: string;
        [key: string]: unknown;
    }[];
    conditionLogic?: "AND" | "OR";
    actions: {
        type: string;
        [key: string]: unknown;
    }[];
}

class RuleEngineClass {
    private rules: GameRule[] = [];

    loadRules(rules: GameRule[]) {
        this.rules = rules;
        console.log(`[RuleEngine] Loaded ${rules.length} rules.`);
    }

    addRule(rule: GameRule) {
        this.rules.push(rule);
    }

    handleEvent(event: GameEvent, ctx: ActionContext, entityRules?: GameRule[]) {
        const entities = ctx.globals?.entities as Map<string, { variables?: Array<{ name: string; value: unknown }> }> | undefined;
        const entity = entities?.get(ctx.entityId);
        const hpValue = entity?.variables?.find((v) => v.name === "hp")?.value;
        if (typeof hpValue === "number" && hpValue <= 0) {
            return;
        }

        if (event.targetId && event.targetId !== ctx.entityId) {
            return;
        }

        const rulesToCheck = entityRules || this.rules;

        const eventAliases: Record<string, string[]> = {
            TICK: ["OnUpdate", "TICK"],
            KEY_DOWN: ["OnSignalReceive", "KEY_DOWN"],
            KEY_UP: ["OnSignalReceive", "KEY_UP"],
            COLLISION_ENTER: ["OnCollision", "COLLISION_ENTER"],
            COLLISION_STAY: ["OnCollision", "COLLISION_STAY"],
            COLLISION_EXIT: ["OnCollision", "COLLISION_EXIT"],
            ENTITY_DIED: ["OnDestroy", "ENTITY_DIED"],
        };

        const allowedEvents = eventAliases[event.type] ?? [event.type];

        const matchingRules = rulesToCheck.filter((rule) => {
            if (!allowedEvents.includes(rule.event)) return false;
            if (rule.eventParams) {
                for (const [key, value] of Object.entries(rule.eventParams)) {
                    if (event.data?.[key] !== value) return false;
                }
            }
            return true;
        });

        if (matchingRules.length === 0) return;

        for (const rule of matchingRules) {
            const logic = rule.conditionLogic ?? "AND";
            let passed = true;
            if (rule.conditions && rule.conditions.length > 0) {
                if (logic === "OR") {
                    passed = false;
                    for (const c of rule.conditions) {
                        const { type, ...params } = c;
                        const result = ConditionRegistry.check(type, ctx, params);
                        if (result) {
                            passed = true;
                            break;
                        }
                    }
                } else {
                    for (const c of rule.conditions) {
                        const { type, ...params } = c;
                        const result = ConditionRegistry.check(type, ctx, params);
                        if (!result) {
                            passed = false;
                            break;
                        }
                    }
                }
            }

            if (!passed) continue;

            for (const action of rule.actions) {
                const { type, ...params } = action;
                ActionRegistry.run(type, ctx, params);
            }
        }
    }
}

export const RuleEngine = new RuleEngineClass();
