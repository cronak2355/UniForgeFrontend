const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.uniforge.kr';

export interface LibraryItem {
    id: number;
    assetId: number;
    assetName: string;
    purchaseDate: string;
}

class LibraryService {
    private getToken(): string | null {
        return localStorage.getItem('token');
    }

    private async request<T>(endpoint: string): Promise<T> {
        const token = this.getToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
        if (!response.ok) {
            throw new Error('Failed to fetch library');
        }
        return response.json();
    }

    async getLibrary(userId: number): Promise<LibraryItem[]> {
        return this.request<LibraryItem[]>(`/library?userId=${userId}`);
    }
}

export const libraryService = new LibraryService();
