const API_BASE_URL = 'https://uniforge.kr/api'; // Hardcoded for production

export interface LibraryItem {
    id: string;
    userId: string;
    refId: string;
    itemType: string;
    collectionId?: string | null;
    createdAt: string;
}

class LibraryService {
    private getToken(): string | null {
        return localStorage.getItem('token');
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = this.getToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            throw new Error('Failed to fetch library');
        }
        return response.json();
    }

    async getLibrary(userId: number): Promise<LibraryItem[]> {
        return this.request<LibraryItem[]>(`/library?userId=${userId}`);
    }

    async getCollections(): Promise<any[]> {
        return this.request<any[]>('/library/collections');
    }

    async createCollection(name: string): Promise<any> {
        return this.request<any>('/library/collections', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    async moveItemToCollection(itemId: string, collectionId: string | null): Promise<void> {
        return this.request<void>(`/library/items/${itemId}/move`, {
            method: 'PUT',
            body: JSON.stringify({ collectionId }),
        });
    }
}

export const libraryService = new LibraryService();
