const API_BASE_URL = 'https://uniforge.kr'; // import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
}

export interface AssetVersion {
    id: string;
    assetId: string;
    s3RootPath: string | null;
    status: string;
    createdAt: string;
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

    async getAssetById(assetId: string): Promise<Asset> {
        return this.request<Asset>(`/assets/${assetId}`);
    }

    async getAssetVersions(assetId: string): Promise<AssetVersion[]> {
        return this.request<AssetVersion[]>(`/assets/${assetId}/versions`);
    }

    async getGames(): Promise<Game[]> {
        return this.request<Game[]>('/marketplace/games');
    }
}

export const marketplaceService = new MarketplaceService();
