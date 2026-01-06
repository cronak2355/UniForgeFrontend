/**
 * Scene 전용 상태 저장소
 * - Rule / Condition / Action에서 접근 가능
 * - JSON export 대상
 */
export class SceneState {
    variables: Record<string, unknown> = {};
    flags: Record<string, boolean> = {};

    getVar<T = unknown>(key: string): T | undefined {
        return this.variables[key] as T;
    }

    setVar(key: string, value: unknown) {
        this.variables[key] = value;
    }

    getFlag(key: string): boolean {
        return this.flags[key] ?? false;
    }

    setFlag(key: string, value: boolean) {
        this.flags[key] = value;
    }

    reset() {
        this.variables = {};
        this.flags = {};
    }
}
