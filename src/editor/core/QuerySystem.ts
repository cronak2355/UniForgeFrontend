import { RuntimeContext } from "./RuntimeContext";
import { RuntimeEntity } from "./RuntimeEntity";

/**
 * Criteria for selecting entities.
 */
export interface QueryCriteria {
    /** Entity must have ALL of these component types */
    all?: string[];

    /** Entity must have ANY of these component types */
    any?: string[];

    /** Entity must have NONE of these component types */
    none?: string[];
}

/**
 * Result of a query.
 * Contains the Entity and direct references to requested components (optimization).
 * For now, we return RuntimeEntity array to keep it simple, 
 * but in the future we might return a struct with component pointers.
 */
export class QuerySystem {

    /**
     * Select entities from the context based on criteria.
     * 
     * @param context The runtime context to query from.
     * @param criteria The filtering criteria.
     * @returns Array of matching RuntimeEntity objects.
     */
    static select(context: RuntimeContext, criteria: QueryCriteria): RuntimeEntity[] {
        // Optimization: Start with the smallest set if possible
        let candidates: RuntimeEntity[] = [];

        // 1. Initial Candidate Selection
        if (criteria.all && criteria.all.length > 0) {
            // Find the component type with the fewest entities? 
            // For now, just pick the first one in 'all' list.
            const firstType = criteria.all[0];
            const components = context.getAllComponentsOfType(firstType);

            // Map components to entities
            // Note: This relies on component.entityId lookup which is fast
            candidates = [];
            for (const comp of components) {
                const ent = context.entities.get(comp.entityId);
                if (ent && ent.active) {
                    candidates.push(ent);
                }
            }
        } else {
            // If no 'all' filter, start with ALL active entities (Expensive!)
            // Ideally, queries should always have at least one 'all' filter or specific tag.
            candidates = Array.from(context.entities.values()).filter(e => e.active);
        }

        // 2. Filter Candidates
        const result: RuntimeEntity[] = [];

        for (const entity of candidates) {
            if (this.matches(context, entity, criteria)) {
                result.push(entity);
            }
        }

        return result;
    }

    /**
     * Check if a single entity matches criteria
     */
    static matches(context: RuntimeContext, entity: RuntimeEntity, criteria: QueryCriteria): boolean {
        const entityComponents = context.getEntityComponents(entity.id);
        const componentTypes = new Set(entityComponents.map(c => c.type));

        // Check ALL
        if (criteria.all) {
            for (const type of criteria.all) {
                if (!componentTypes.has(type)) return false;
            }
        }

        // Check NONE
        if (criteria.none) {
            for (const type of criteria.none) {
                if (componentTypes.has(type)) return false;
            }
        }

        // Check ANY
        if (criteria.any && criteria.any.length > 0) {
            let found = false;
            for (const type of criteria.any) {
                if (componentTypes.has(type)) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }

        return true;
    }
}
