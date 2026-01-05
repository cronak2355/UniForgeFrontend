// src/AssetsEditor/services/SagemakerService.ts
// SageMaker AI Asset Generation Service

const API_BASE_URL = 'https://2v95dezrbk.execute-api.ap-northeast-2.amazonaws.com/dev';

export interface GenerateAssetRequest {
    prompt: string;
    negative_prompt?: string;
    asset_type: 'character' | 'object' | 'tile' | 'effect';
    width?: number;
    height?: number;
    image?: string; // Base64 encoded image
    strength?: number; // 0.0 to 1.0 (Refine strength)
    mode?: 'text-to-image' | 'image-to-image' | 'remove_background';
}

export interface GenerateAssetResponse {
    success: boolean;
    asset_url?: string;
    image?: string; // Base64 for direct return
    asset_id?: string;
    asset_type?: string;
    prompt?: string;
    message?: string;
    error?: string;
}

export interface EndpointStatusResponse {
    status: 'InService' | 'Creating' | 'Updating' | 'Failed' | 'OutOfService' | 'Deleting' | 'Unknown';
    message?: string;
}

/**
 * SageMaker 엔드포인트 상태 확인
 */
export async function checkEndpointStatus(): Promise<EndpointStatusResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/endpoint-status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    } catch (error) {
        console.error('Endpoint status check failed:', error);
        return { status: 'Unknown', message: 'Failed to check endpoint status' };
    }
}

export async function generateAsset(request: GenerateAssetRequest): Promise<GenerateAssetResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/generate-asset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: request.prompt,
                negative_prompt: request.negative_prompt || 'blurry, low quality, distorted',
                asset_type: request.asset_type,
                width: request.width || 512,
                height: request.height || 512,
                image: request.image,
                strength: request.strength,
                mode: request.mode,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('Asset generation failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * S3 URL에서 이미지를 Blob으로 가져오기
 */
export async function fetchAssetAsBlob(assetUrl: string): Promise<Blob> {
    const response = await fetch(assetUrl);
    if (!response.ok) {
        throw new Error('Failed to fetch asset from S3');
    }
    return await response.blob();
}

export const SagemakerService = {
    checkEndpointStatus,
    generateAsset,
    fetchAssetAsBlob,
};

export default SagemakerService;
