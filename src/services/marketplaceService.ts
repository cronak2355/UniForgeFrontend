const API_BASE_URL = 'https://uniforge.kr/api'; // Hardcoded for production

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
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch data');
            } else {
                const text = await response.text();
                console.error("Received non-JSON response:", text.substring(0, 500)); // Log first 500 chars
                throw new Error(`Server returned unexpected response (Status: ${response.status})`);
            }
        }
        return response.json();
    }

    async getAssets(authorId?: string, sort: string = 'latest'): Promise<Asset[]> {
        const params = new URLSearchParams();
        if (authorId) params.append('authorId', authorId);
        if (sort) params.append('sort', sort);
        return this.request<Asset[]>(`/assets?${params.toString()}`);
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



export const marketplaceService = new MarketplaceService();
