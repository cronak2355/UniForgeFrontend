/**
 * IModule - 모든 모듈의 기본 인터페이스
 * 
 * 모든 게임 컴포넌트(Status, Kinetic, Narrative, Combat 등)는
 * 이 인터페이스를 구현해야 합니다.
 * 
 * Unity 호환: serialize() 메서드를 통해 C# 구조와 1:1 매핑되는 JSON 출력
 */

/**
 * 3D 확장성을 위한 벡터 타입
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

/**
 * 모듈 기본 인터페이스
 */
export interface IModule {
    /** 모듈 타입 (Status, Kinetic, Narrative, Combat 등) */
    readonly type: string;

    /** 고유 식별자 */
    readonly id: string;

    /**
     * 프레임 업데이트
     * @param dt 델타 타임 (초 단위)
     */
    update(dt: number): void;

    /**
     * Unity 호환 직렬화
     * C# 명명 규칙(PascalCase)으로 변환된 JSON 반환
     */
    serialize(): Record<string, unknown>;

    /**
     * 리소스 정리
     */
    destroy(): void;
}

/**
 * 모듈 팩토리 타입
 */
export type ModuleFactory<T extends IModule> = (id: string, data?: Partial<T>) => T;

/**
 * Vector3 유틸리티 함수들
 */
export const Vec3 = {
    /** 영벡터 생성 */
    zero(): Vector3 {
        return { x: 0, y: 0, z: 0 };
    },

    /** 벡터 생성 */
    create(x: number, y: number, z: number = 0): Vector3 {
        return { x, y, z };
    },

    /** 벡터 복사 */
    clone(v: Vector3): Vector3 {
        return { x: v.x, y: v.y, z: v.z };
    },

    /** 벡터 덧셈 */
    add(a: Vector3, b: Vector3): Vector3 {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    },

    /** 벡터 뺄셈 */
    sub(a: Vector3, b: Vector3): Vector3 {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },

    /** 스칼라 곱 */
    scale(v: Vector3, s: number): Vector3 {
        return { x: v.x * s, y: v.y * s, z: v.z * s };
    },

    /** 벡터 크기(길이) */
    magnitude(v: Vector3): number {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    },

    /** 정규화 (단위 벡터) */
    normalize(v: Vector3): Vector3 {
        const mag = Vec3.magnitude(v);
        if (mag === 0) return Vec3.zero();
        return Vec3.scale(v, 1 / mag);
    },

    /** 두 점 사이 거리 */
    distance(a: Vector3, b: Vector3): number {
        return Vec3.magnitude(Vec3.sub(b, a));
    },

    /** 선형 보간 */
    lerp(a: Vector3, b: Vector3, t: number): Vector3 {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t,
        };
    },
};

/**
 * camelCase를 PascalCase로 변환 (Unity 호환)
 */
export function toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 객체의 모든 키를 PascalCase로 변환
 */
export function serializeForUnity(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        const pascalKey = toPascalCase(key);

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result[pascalKey] = serializeForUnity(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
            result[pascalKey] = value.map(item =>
                typeof item === 'object' && item !== null
                    ? serializeForUnity(item as Record<string, unknown>)
                    : item
            );
        } else {
            result[pascalKey] = value;
        }
    }

    return result;
}
