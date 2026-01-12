// src/AssetsEditor/services/simpleParticleService.ts
// 파티클 텍스처를 Canvas로 동적 생성 (에셋 에디터의 128px 제한과 독립)

export type ParticleSize = 8 | 12 | 16 | 24 | 32 | 48 | 64;
export type ParticleShape = 'circle' | 'square' | 'star' | 'ring' | 'drop';

export interface ParticlePreset {
    id: string;
    shape: ParticleShape;
    size: ParticleSize;
    color: number;  // 0xRRGGBB
    glow?: boolean;
    gradient?: boolean;
}

// ============================================================
// 프리셋 정의
// ============================================================

export const PARTICLE_PRESETS: Record<string, ParticlePreset> = {
    // 전투
    hit_spark: { id: 'hit_spark', shape: 'circle', size: 32, color: 0xFFFFFF, glow: true },
    explosion: { id: 'explosion', shape: 'circle', size: 48, color: 0xFFFFFF, glow: true },
    blood: { id: 'blood', shape: 'drop', size: 16, color: 0xFF0000 },
    heal: { id: 'heal', shape: 'circle', size: 24, color: 0x00FF00, glow: true },
    magic: { id: 'magic', shape: 'star', size: 24, color: 0xCC88FF, glow: true },

    // 환경
    rain: { id: 'rain', shape: 'drop', size: 12, color: 0x88CCFF },
    dust: { id: 'dust', shape: 'circle', size: 16, color: 0xCCBB99, gradient: true },
    fire: { id: 'fire', shape: 'circle', size: 24, color: 0xFFFFFF, glow: true },
    smoke: { id: 'smoke', shape: 'circle', size: 48, color: 0x888888, gradient: true },
    snow: { id: 'snow', shape: 'circle', size: 12, color: 0xFFFFFF },

    // UI
    sparkle: { id: 'sparkle', shape: 'star', size: 24, color: 0xFFFFFF, glow: true },
    level_up: { id: 'level_up', shape: 'star', size: 32, color: 0xFFD700, glow: true },
    coin: { id: 'coin', shape: 'circle', size: 16, color: 0xFFD700 },
    confetti: { id: 'confetti', shape: 'square', size: 12, color: 0xFFFFFF },
};

// ============================================================
// Canvas 생성 함수
// ============================================================

/**
 * 색상 값을 RGB 객체로 변환
 */
function hexToRgb(hex: number): { r: number; g: number; b: number } {
    return {
        r: (hex >> 16) & 0xFF,
        g: (hex >> 8) & 0xFF,
        b: hex & 0xFF,
    };
}

/**
 * 원형 파티클 그리기
 */
function drawCircle(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: { r: number; g: number; b: number },
    options: { glow?: boolean; gradient?: boolean }
): void {
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 1;

    if (options.gradient) {
        // 그라데이션 (연기 등)
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = gradient;
    } else if (options.glow) {
        // 발광 효과
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
        gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * 사각형 파티클 그리기
 */
function drawSquare(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: { r: number; g: number; b: number }
): void {
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    const margin = 1;
    ctx.fillRect(margin, margin, size - margin * 2, size - margin * 2);
}

/**
 * 별 모양 파티클 그리기
 */
function drawStar(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: { r: number; g: number; b: number },
    options: { glow?: boolean }
): void {
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2 - 1;
    const innerRadius = outerRadius * 0.4;
    const spikes = 5;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();

    if (options.glow) {
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
        gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    }
    ctx.fill();
}

/**
 * 링 모양 파티클 그리기
 */
function drawRing(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: { r: number; g: number; b: number }
): void {
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2 - 1;
    const innerRadius = outerRadius * 0.6;

    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true);
    ctx.fill();
}

/**
 * 물방울 모양 파티클 그리기
 */
function drawDrop(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: { r: number; g: number; b: number }
): void {
    const cx = size / 2;
    const topY = size * 0.15;
    const bottomY = size * 0.85;
    const width = size * 0.6;

    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.bezierCurveTo(
        cx + width / 2, size * 0.4,
        cx + width / 2, bottomY,
        cx, bottomY
    );
    ctx.bezierCurveTo(
        cx - width / 2, bottomY,
        cx - width / 2, size * 0.4,
        cx, topY
    );
    ctx.fill();
}

// ============================================================
// 메인 API
// ============================================================

/**
 * 파티클 Canvas 생성
 * @param shape 도형 타입
 * @param size 크기 (8, 16, 32, 64)
 * @param color 색상 (0xRRGGBB)
 * @param options 추가 옵션
 */
export function createParticleCanvas(
    shape: ParticleShape,
    size: ParticleSize,
    color: number,
    options: { glow?: boolean; gradient?: boolean } = {}
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.clearRect(0, 0, size, size);

    const rgb = hexToRgb(color);

    switch (shape) {
        case 'circle':
            drawCircle(ctx, size, rgb, options);
            break;
        case 'square':
            drawSquare(ctx, size, rgb);
            break;
        case 'star':
            drawStar(ctx, size, rgb, options);
            break;
        case 'ring':
            drawRing(ctx, size, rgb);
            break;
        case 'drop':
            drawDrop(ctx, size, rgb);
            break;
    }

    return canvas;
}

/**
 * 프리셋으로 파티클 Canvas 생성
 */
export function createParticleFromPreset(presetId: string): HTMLCanvasElement | null {
    const preset = PARTICLE_PRESETS[presetId];
    if (!preset) {
        console.warn(`[ParticleService] Unknown preset: ${presetId}`);
        return null;
    }

    return createParticleCanvas(preset.shape, preset.size, preset.color, {
        glow: preset.glow,
        gradient: preset.gradient,
    });
}

/**
 * Phaser Scene에 모든 프리셋 텍스처 등록
 */
export function initParticleTextures(scene: Phaser.Scene): void {
    for (const [key, preset] of Object.entries(PARTICLE_PRESETS)) {
        // 이미 등록된 텍스처는 스킵
        if (scene.textures.exists(`particle_${key}`)) continue;

        const canvas = createParticleFromPreset(key);
        if (canvas) {
            scene.textures.addCanvas(`particle_${key}`, canvas);
        }
    }
    console.log('[ParticleService] Particle textures initialized');
}

/**
 * 사용 가능한 프리셋 목록 반환
 */
export function getAvailablePresets(): string[] {
    return Object.keys(PARTICLE_PRESETS);
}
