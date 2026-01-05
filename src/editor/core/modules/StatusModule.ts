/**
 * StatusModule - 수치 상태 관리 모듈
 * 
 * HP, MP, 공격력, 방어력 등 모든 수치 상태를 관리합니다.
 * 
 * 지원 장르:
 * - RPG: HP, MP, 스탯
 * - 디펜스: 타워 체력, 공격력
 * - 탄막: 점수, 잔기(Lives), 폭탄
 * 
 * Unity 호환: serialize() 메서드로 C# 구조와 1:1 매핑
 */

import type { IModule } from "./IModule";
import { serializeForUnity } from "./IModule";

/**
 * 상태 데이터 인터페이스
 */
export interface StatusData {
    /** 현재 체력 */
    hp: number;
    /** 최대 체력 */
    maxHp: number;
    /** 현재 마나 */
    mp: number;
    /** 최대 마나 */
    maxMp: number;
    /** 공격력 */
    attack: number;
    /** 방어력 */
    defense: number;
    /** 이동 속도 */
    speed: number;
    /** 레벨 */
    level: number;
    /** 경험치 */
    exp: number;
    /** 다음 레벨까지 필요 경험치 */
    maxExp: number;
    /** 잔기 (탄막/아케이드용) */
    lives: number;
    /** 점수 */
    score: number;
    /** 확장 가능한 커스텀 스탯 */
    custom: Record<string, number>;
}

/**
 * 상태 변화 이벤트 콜백 타입
 */
export type StatusChangeCallback = (
    statName: keyof StatusData | string,
    oldValue: number,
    newValue: number
) => void;

/**
 * StatusModule 클래스
 * 
 * 게임 엔티티의 모든 수치 상태를 관리하는 모듈입니다.
 * 엔진 독립적으로 설계되어 Phaser, Three.js, Unity에서 동일하게 사용 가능합니다.
 */
export class StatusModule implements IModule {
    readonly type = "Status";
    readonly id: string;

    private data: StatusData;
    private onChange?: StatusChangeCallback;

    constructor(id: string, initialData: Partial<StatusData> = {}) {
        this.id = id;

        // 기본값으로 초기화
        this.data = {
            hp: initialData.hp ?? 100,
            maxHp: initialData.maxHp ?? 100,
            mp: initialData.mp ?? 50,
            maxMp: initialData.maxMp ?? 50,
            attack: initialData.attack ?? 10,
            defense: initialData.defense ?? 5,
            speed: initialData.speed ?? 1,
            level: initialData.level ?? 1,
            exp: initialData.exp ?? 0,
            maxExp: initialData.maxExp ?? 100,
            lives: initialData.lives ?? 3,
            score: initialData.score ?? 0,
            custom: initialData.custom ?? {},
        };
    }

    // ===== Getters =====

    get hp(): number { return this.data.hp; }
    get maxHp(): number { return this.data.maxHp; }
    get mp(): number { return this.data.mp; }
    get maxMp(): number { return this.data.maxMp; }
    get attack(): number { return this.data.attack; }
    get defense(): number { return this.data.defense; }
    get speed(): number { return this.data.speed; }
    get level(): number { return this.data.level; }
    get exp(): number { return this.data.exp; }
    get maxExp(): number { return this.data.maxExp; }
    get lives(): number { return this.data.lives; }
    get score(): number { return this.data.score; }

    /** HP 비율 (0~1) */
    get hpRatio(): number { return this.data.maxHp > 0 ? this.data.hp / this.data.maxHp : 0; }

    /** MP 비율 (0~1) */
    get mpRatio(): number { return this.data.maxMp > 0 ? this.data.mp / this.data.maxMp : 0; }

    /** 경험치 비율 (0~1) */
    get expRatio(): number { return this.data.maxExp > 0 ? this.data.exp / this.data.maxExp : 0; }

    /** 생존 여부 */
    get isAlive(): boolean { return this.data.hp > 0 && this.data.lives > 0; }

    // ===== Setters with Clamping =====

    /**
     * 스탯 변경 콜백 등록
     */
    setOnChange(callback: StatusChangeCallback): void {
        this.onChange = callback;
    }

    /**
     * HP 설정 (0 ~ maxHp 범위로 클램핑)
     */
    setHp(value: number): void {
        const oldValue = this.data.hp;
        this.data.hp = Math.max(0, Math.min(value, this.data.maxHp));
        this.notifyChange("hp", oldValue, this.data.hp);
    }

    /**
     * MP 설정 (0 ~ maxMp 범위로 클램핑)
     */
    setMp(value: number): void {
        const oldValue = this.data.mp;
        this.data.mp = Math.max(0, Math.min(value, this.data.maxMp));
        this.notifyChange("mp", oldValue, this.data.mp);
    }

    /**
     * 피해 적용 (방어력 고려)
     * @param damage 원시 피해량
     * @returns 실제 적용된 피해량
     */
    takeDamage(damage: number): number {
        const actualDamage = Math.max(1, damage - this.data.defense);
        this.setHp(this.data.hp - actualDamage);
        return actualDamage;
    }

    /**
     * 회복
     * @param amount 회복량
     */
    heal(amount: number): void {
        this.setHp(this.data.hp + amount);
    }

    /**
     * MP 소모
     * @param amount 소모량
     * @returns 성공 여부
     */
    useMp(amount: number): boolean {
        if (this.data.mp < amount) return false;
        this.setMp(this.data.mp - amount);
        return true;
    }

    /**
     * MP 회복
     */
    restoreMp(amount: number): void {
        this.setMp(this.data.mp + amount);
    }

    /**
     * 경험치 획득 및 레벨업 체크
     * @param amount 획득 경험치
     * @returns 레벨업 여부
     */
    gainExp(amount: number): boolean {
        const oldExp = this.data.exp;
        this.data.exp += amount;

        let leveledUp = false;
        while (this.data.exp >= this.data.maxExp) {
            this.data.exp -= this.data.maxExp;
            this.levelUp();
            leveledUp = true;
        }

        this.notifyChange("exp", oldExp, this.data.exp);
        return leveledUp;
    }

    /**
     * 레벨업 처리
     */
    private levelUp(): void {
        const oldLevel = this.data.level;
        this.data.level++;
        this.data.maxExp = Math.floor(this.data.maxExp * 1.5);

        // 스탯 성장 (기본)
        this.data.maxHp += 10;
        this.data.hp = this.data.maxHp;
        this.data.maxMp += 5;
        this.data.mp = this.data.maxMp;
        this.data.attack += 2;
        this.data.defense += 1;

        this.notifyChange("level", oldLevel, this.data.level);
    }

    /**
     * 점수 추가 (탄막/아케이드용)
     */
    addScore(points: number): void {
        const oldScore = this.data.score;
        this.data.score += points;
        this.notifyChange("score", oldScore, this.data.score);
    }

    /**
     * 잔기 감소 (탄막/아케이드용)
     * @returns 게임 오버 여부
     */
    loseLife(): boolean {
        const oldLives = this.data.lives;
        this.data.lives = Math.max(0, this.data.lives - 1);
        this.notifyChange("lives", oldLives, this.data.lives);
        return this.data.lives <= 0;
    }

    /**
     * 커스텀 스탯 조회
     */
    getCustom(key: string): number {
        return this.data.custom[key] ?? 0;
    }

    /**
     * 커스텀 스탯 설정
     */
    setCustom(key: string, value: number): void {
        const oldValue = this.data.custom[key] ?? 0;
        this.data.custom[key] = value;
        this.notifyChange(key, oldValue, value);
    }

    /**
     * 변경 알림 (내부용)
     */
    private notifyChange(statName: keyof StatusData | string, oldValue: number, newValue: number): void {
        if (this.onChange && oldValue !== newValue) {
            this.onChange(statName, oldValue, newValue);
        }
    }

    // ===== IModule 구현 =====

    /**
     * 프레임 업데이트 (자동 회복 등 구현 가능)
     */
    update(_dt: number): void {
        // 필요 시 자동 회복, 독 데미지 등 구현
    }

    /**
     * Unity 호환 직렬화
     */
    serialize(): Record<string, unknown> {
        return serializeForUnity({
            type: this.type,
            id: this.id,
            ...this.data,
        });
    }

    /**
     * 역직렬화 (정적 팩토리)
     */
    static deserialize(data: Record<string, unknown>): StatusModule {
        return new StatusModule(data.Id as string ?? data.id as string, {
            hp: data.Hp as number ?? data.hp as number,
            maxHp: data.MaxHp as number ?? data.maxHp as number,
            mp: data.Mp as number ?? data.mp as number,
            maxMp: data.MaxMp as number ?? data.maxMp as number,
            attack: data.Attack as number ?? data.attack as number,
            defense: data.Defense as number ?? data.defense as number,
            speed: data.Speed as number ?? data.speed as number,
            level: data.Level as number ?? data.level as number,
            exp: data.Exp as number ?? data.exp as number,
            maxExp: data.MaxExp as number ?? data.maxExp as number,
            lives: data.Lives as number ?? data.lives as number,
            score: data.Score as number ?? data.score as number,
            custom: (data.Custom ?? data.custom ?? {}) as Record<string, number>,
        });
    }

    /**
     * 리소스 정리
     */
    destroy(): void {
        this.onChange = undefined;
    }
}
