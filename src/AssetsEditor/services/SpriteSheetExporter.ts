// src/AssetsEditor/services/SpriteSheetExporter.ts

import type { Frame } from '../engine/FrameManager';

// 브라우저 호환성을 위한 안전한 최대 캔버스 크기
const MAX_CANVAS_SIZE = 8192;

export type SpriteSheetLayout = 'horizontal' | 'vertical' | 'grid';
export type ExportFormat = 'webp' | 'png';

export interface SpriteSheetMetadata {
    format: 'spritesheet';
    version: string;
    image: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    columns: number;
    rows: number;
    animations: {
        default: {
            frames: number[];
            fps: number;
            loop: boolean;
        };
    };
}

export interface ExportResult {
    blob: Blob;
    metadata: SpriteSheetMetadata;
    filename: string;
    warning?: string;  // 레이아웃 변경 경고
}

/**
 * 프레임 배열을 스프라이트 시트로 내보내기
 */
export async function exportSpriteSheet(
    frames: Frame[],
    resolution: number,
    layout: SpriteSheetLayout = 'horizontal',
    format: ExportFormat = 'webp',
    quality: number = 0.9
): Promise<ExportResult> {
    if (frames.length === 0) {
        throw new Error('No frames to export');
    }

    // 레이아웃에 따른 캔버스 크기 계산 (자동 폴백 포함)
    const { columns, rows, width, height, layoutOverridden } = calculateLayout(frames.length, resolution, layout);

    // 캔버스 생성
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create canvas context');
    }

    // 각 프레임을 캔버스에 그리기
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = col * resolution;
        const y = row * resolution;

        // 프레임 데이터를 ImageData로 변환
        const imageData = new ImageData(
            new Uint8ClampedArray(frame.data),
            resolution,
            resolution
        );
        ctx.putImageData(imageData, x, y);
    }

    // Blob 생성
    const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (b) => {
                if (b) resolve(b);
                else reject(new Error('Failed to create blob'));
            },
            mimeType,
            quality
        );
    });

    // 메타데이터 생성
    const timestamp = Date.now();
    const filename = `spritesheet_${timestamp}.${format}`;
    const metadata: SpriteSheetMetadata = {
        format: 'spritesheet',
        version: '1.0',
        image: filename,
        frameWidth: resolution,
        frameHeight: resolution,
        frameCount: frames.length,
        columns,
        rows,
        animations: {
            default: {
                frames: Array.from({ length: frames.length }, (_, i) => i),
                fps: 12,
                loop: true,
            },
        },
    };

    // 경고 메시지 생성
    const warning = layoutOverridden
        ? `이미지 크기가 너무 커서 Grid 레이아웃으로 자동 변환되었습니다. (${columns}x${rows})`
        : undefined;

    return { blob, metadata, filename, warning };
}

/**
 * 레이아웃에 따른 캔버스 크기 계산
 * 최대 크기 초과 시 자동으로 grid 레이아웃으로 폴백
 */
function calculateLayout(
    frameCount: number,
    resolution: number,
    layout: SpriteSheetLayout
): { columns: number; rows: number; width: number; height: number; layoutOverridden: boolean } {
    let columns: number;
    let rows: number;
    let layoutOverridden = false;

    // 먼저 요청된 레이아웃으로 계산
    switch (layout) {
        case 'horizontal':
            columns = frameCount;
            rows = 1;
            break;
        case 'vertical':
            columns = 1;
            rows = frameCount;
            break;
        case 'grid':
        default:
            columns = Math.ceil(Math.sqrt(frameCount));
            rows = Math.ceil(frameCount / columns);
            break;
    }

    let width = columns * resolution;
    let height = rows * resolution;

    // 최대 크기 초과 시 grid로 자동 폴백
    if ((width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) && layout !== 'grid') {
        columns = Math.ceil(Math.sqrt(frameCount));
        rows = Math.ceil(frameCount / columns);
        width = columns * resolution;
        height = rows * resolution;
        layoutOverridden = true;
    }

    return {
        columns,
        rows,
        width,
        height,
        layoutOverridden,
    };
}

/**
 * 다운로드 트리거
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 메타데이터 JSON 다운로드
 */
export function downloadMetadata(metadata: SpriteSheetMetadata): void {
    const json = JSON.stringify(metadata, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = metadata.image.replace(/\.(webp|png)$/, '.json');
    downloadBlob(blob, filename);
}
