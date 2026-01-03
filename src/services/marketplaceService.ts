const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.uniforge.kr';

export interface Asset {
    id: number;
    authorId: number;
    name: string;
    description: string | null;
    price: number;
    createdAt: string;
    // Helper fields for UI (to be populated or mapped)
    image?: string;
    author?: string;
    rating?: number;
    type?: string;
    genre?: string;
}

export interface Game {
    gameId: number;
    title: string;
    s3RootPath: string;
}

class MarketplaceService {
    private async request<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        return response.json();
    }

    async getAssets(): Promise<Asset[]> {
        return this.request<Asset[]>('/assets');
    }

    async getAssetById(assetId: number): Promise<Asset> {
        return this.request<Asset>(`/assets/${assetId}`);
    }

    async getAssetVersions(assetId: number): Promise<AssetVersion[]> {
        return this.request<AssetVersion[]>(`/assets/${assetId}/versions`);
    }

    async getGames(): Promise<Game[]> {
        return this.request<Game[]>('/marketplace/games');
    }
}

export interface AssetVersion {
    id: number;
    s3RootPath: string;
    status: string;
    createdAt: string;
}

export const marketplaceService = new MarketplaceService();
