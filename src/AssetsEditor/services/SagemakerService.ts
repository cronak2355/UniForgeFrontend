// src/AssetsEditor/services/SagemakerService.ts
// AI Asset Generation Service (connected to UniforgeBackend)

import { authService } from '../../services/authService';

export interface GenerateAssetRequest {
    prompt: string;
    width?: number;
    height?: number;
    // Parameters below are reserved for future backend updates
    style_preset?: string;
    seed?: number;
}

export interface GenerateAssetResponse {
    success: boolean;
    image?: string; // Base64
    error?: string;
}

function getAuthHeaders() {
    const token = authService.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
}

export async function generateAsset(request: GenerateAssetRequest): Promise<GenerateAssetResponse> {
    try {
        const response = await fetch(`/api/AIgenerate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                prompt: request.prompt,
                size: request.width || 512,
                // Pass other params if backend supports them in future
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || 'Server error');
            } catch (e) {
                throw new Error(`API failed: ${response.status} ${errorText}`);
            }
        }

        const data = await response.json();

        // Backend returns { "image": "base64...", "seed": ... }
        return {
            success: true,
            image: data.image
        };

    } catch (error) {
        console.error('Asset generation failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Generate animation sheet: receives 4 separate images, stitches them client-side
 */
export async function generateAnimationSheet(prompt: string, imageBase64: string): Promise<GenerateAssetResponse> {
    try {
        const response = await fetch(`/api/generate-animation-sheet`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                prompt,
                image: imageBase64
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Animation API failed: ${errorText}`);
        }

        const data = await response.json();

        // New: Backend returns { "images": [...4 base64 strings...] }
        const images: string[] = data.images;

        if (!images || images.length === 0) {
            throw new Error('No images returned from server');
        }

        // Stitch images into sprite sheet using Canvas (dynamic based on frame count)
        const stitchedImage = await stitchImagesClientSide(images);

        return {
            success: true,
            image: stitchedImage
        };

    } catch (error) {
        console.error('Animation generation failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Client-side image stitching: combines multiple base64 images horizontally
 */
async function stitchImagesClientSide(base64Images: string[]): Promise<string> {
    const frameCount = base64Images.length;
    const frameSize = 512;
    const totalWidth = frameSize * frameCount;

    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = frameSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not create canvas context');

    // Load and draw each image
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load frame ${i}`));
            img.src = `data:image/png;base64,${base64Images[i]}`;
        });
        ctx.drawImage(img, i * frameSize, 0, frameSize, frameSize);
    }

    // Return as base64 (without data: prefix)
    return canvas.toDataURL('image/png').split(',')[1];
}

export const SagemakerService = {
    generateAsset,
    generateAnimationSheet,
};

export default SagemakerService;
