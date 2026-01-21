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
        return {
            success: true,
            image: data.image
        };

    } catch (error) {
        console.error('Animation generation failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export const SagemakerService = {
    generateAsset,
    generateAnimationSheet,
};

export default SagemakerService;
