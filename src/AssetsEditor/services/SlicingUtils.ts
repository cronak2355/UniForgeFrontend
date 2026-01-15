export interface SlicingResult {
    isSpriteSheet: boolean;
    frames: ImageData[];
    frameCount: number;
}

/**
 * Detects if an image is a spritesheet and slices it into frames
 * Uses heuristic: horizontal strip with square frames (width > height && width % height === 0)
 */
export async function detectAndSliceSpritesheet(
    file: File | Blob,
    targetSize: number
): Promise<SlicingResult> {
    const img = await createImageBitmap(file);
    const { width, height } = img;

    // Heuristic detection: horizontal strip with square frames
    const isSpriteSheet = width > height && width % height === 0 && width / height > 1;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    if (!isSpriteSheet) {
        // Single image - resize to target
        canvas.width = targetSize;
        canvas.height = targetSize;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, targetSize, targetSize);
        return {
            isSpriteSheet: false,
            frames: [ctx.getImageData(0, 0, targetSize, targetSize)],
            frameCount: 1
        };
    }

    // Multi-frame sprite sheet (horizontal strip)
    const frameCount = Math.floor(width / height);
    const frameSize = height; // Assuming square frames
    const frames: ImageData[] = [];

    for (let i = 0; i < frameCount; i++) {
        // Extract frame from spritesheet
        canvas.width = frameSize;
        canvas.height = frameSize;
        ctx.clearRect(0, 0, frameSize, frameSize);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, i * frameSize, 0, frameSize, frameSize, 0, 0, frameSize, frameSize);

        // Resize to targetSize if needed
        if (frameSize !== targetSize) {
            const resizeCanvas = document.createElement('canvas');
            resizeCanvas.width = targetSize;
            resizeCanvas.height = targetSize;
            const resizeCtx = resizeCanvas.getContext('2d');
            if (!resizeCtx) throw new Error('Failed to get resize canvas context');
            resizeCtx.imageSmoothingEnabled = false;
            resizeCtx.drawImage(canvas, 0, 0, targetSize, targetSize);
            frames.push(resizeCtx.getImageData(0, 0, targetSize, targetSize));
        } else {
            frames.push(ctx.getImageData(0, 0, frameSize, frameSize));
        }
    }

    return { isSpriteSheet: true, frames, frameCount };
}

/**
 * Parse spritesheet using saved metadata (for loading existing assets)
 */
export async function parseSpritesheetFromMetadata(
    blob: Blob,
    metadata: any,
    targetSize: number
): Promise<{ frames: ImageData[]; animationMap: Record<string, any> }> {
    // If no metadata, fallback to auto-detection
    if (!metadata?.animations || Object.keys(metadata.animations).length === 0) {
        const result = await detectAndSliceSpritesheet(blob, targetSize);
        return {
            frames: result.frames,
            animationMap: {
                default: { frames: result.frames, fps: 8, loop: true }
            }
        };
    }

    // Parse using metadata
    const animations = metadata.animations;
    const totalFrames = metadata.totalFrames ||
        Object.values(animations).reduce((sum: number, anim: any) =>
            sum + (anim.frames?.length || 0), 0);

    if (totalFrames === 0) {
        // Fallback if metadata is malformed
        const result = await detectAndSliceSpritesheet(blob, targetSize);
        return {
            frames: result.frames,
            animationMap: {
                default: { frames: result.frames, fps: 8, loop: true }
            }
        };
    }

    const img = await createImageBitmap(blob);
    const frameWidth = img.width / totalFrames;
    const frames: ImageData[] = [];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Extract all frames
    for (let i = 0; i < totalFrames; i++) {
        canvas.width = frameWidth;
        canvas.height = img.height;
        ctx.clearRect(0, 0, frameWidth, img.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, i * frameWidth, 0, frameWidth, img.height, 0, 0, frameWidth, img.height);

        // Resize to targetSize
        const resizeCanvas = document.createElement('canvas');
        resizeCanvas.width = targetSize;
        resizeCanvas.height = targetSize;
        const resizeCtx = resizeCanvas.getContext('2d');
        if (!resizeCtx) throw new Error('Failed to get resize canvas context');
        resizeCtx.imageSmoothingEnabled = false;
        resizeCtx.drawImage(canvas, 0, 0, targetSize, targetSize);

        frames.push(resizeCtx.getImageData(0, 0, targetSize, targetSize));
    }

    // Reconstruct animation map from metadata
    const animationMap: Record<string, any> = {};
    for (const [name, animData] of Object.entries(animations)) {
        const anim = animData as any;
        const frameIndices = anim.frames || [];
        animationMap[name] = {
            frames: frameIndices.map((idx: number) => frames[idx] || frames[0]),
            fps: anim.fps || 8,
            loop: anim.loop !== false
        };
    }

    return { frames, animationMap };
}
