import { apiClient } from './apiClient';

export interface Asset {
    id: string;
    authorId: string;
    name: string;
    description: string | null;
    price: number;
    createdAt: string;
    imageUrl?: string | null;
    // Helper fields for UI (to be populated or mapped)
    image?: string;
    author?: string;
    rating?: number;
    type?: string;
    genre?: string;
    tags?: string;
    assetType?: string;
}

export interface AssetVersion {
    id: string;
    assetId: string;
    s3RootPath: string | null;
    status: string;
    createdAt: string;
}

export interface Game {
    gameId: string;
    title: string;
    s3RootPath: string;
}

class MarketplaceService {
    async getAssets(authorId?: string, sort: string = 'latest'): Promise<Asset[]> {
        const params = new URLSearchParams();
        if (authorId) params.append('authorId', authorId);
        if (sort) params.append('sort', sort);
        return apiClient.request<Asset[]>(`/assets?${params.toString()}`);
    }

    async getAssetById(assetId: string): Promise<Asset> {
        return apiClient.request<Asset>(`/assets/${assetId}`);
    }

    async getAssetVersions(assetId: string): Promise<AssetVersion[]> {
        return apiClient.request<AssetVersion[]>(`/assets/${assetId}/versions`);
    }

    async getGames(): Promise<Game[]> {
        return apiClient.request<Game[]>('/games/public');
    }

    async createAsset(data: {
        name: string;
        price: number;
        description: string | null;
        isPublic?: boolean;
        genre?: string;
        tags?: string;
        assetType?: string;
    }): Promise<Asset> {

        return apiClient.request<Asset>('/assets', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getPresignedUrlForImage(ownerId: string, contentType: string): Promise<{ uploadUrl: string; s3Key: string }> {
        return apiClient.request<{ uploadUrl: string; s3Key: string }>(`/uploads/presign/image?ownerType=ASSET&ownerId=${ownerId}&imageType=thumbnail&contentType=${encodeURIComponent(contentType)}`, {
            method: 'POST'
        });
    }

    async registerImageResource(data: {
        ownerType: string;
        ownerId: string;
        imageType: string;
        s3Key: string;
        isActive: boolean;
    }): Promise<any> {
        return apiClient.request('/images', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateAsset(assetId: string, data: Partial<Asset>): Promise<Asset> {
        return apiClient.request<Asset>(`/assets/${assetId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async createVersion(assetId: string): Promise<AssetVersion> {
        return apiClient.request<AssetVersion>(`/assets/${assetId}/versions`, {
            method: 'POST',
            body: JSON.stringify({ s3RootPath: 'pending' })
        });
    }

    async getUploadUrl(assetId: string, versionId: string, fileName: string, contentType: string): Promise<{ uploadUrl: string; s3Key?: string }> {
        return apiClient.request<{ uploadUrl: string; s3Key?: string }>(`/assets/${assetId}/versions/${versionId}/upload-url?fileName=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(contentType)}`);
    }

    async publishVersion(versionId: string): Promise<void> {
        return apiClient.request<void>(`/assets/versions/${versionId}/publish`, { method: 'POST' });
    }
}

export const marketplaceService = new MarketplaceService();
