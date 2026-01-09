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

        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.indexOf("application/json") !== -1;

        if (!response.ok) {
            if (isJson) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch library');
            } else {
                const text = await response.text();
                console.error("Received non-JSON response:", text.substring(0, 500));
                throw new Error(`Server returned unexpected response (Status: ${response.status})`);
            }
        }

        if (!isJson) {
            const text = await response.text();
            console.error("Received HTML/Text instead of JSON (Soft 404):", text.substring(0, 200));
            throw new Error('API 응답이 올바르지 않습니다 (HTML 반환됨). 서버 구성을 확인해주세요.');
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

    async addToLibrary(refId: string, itemType: string = 'ASSET'): Promise<LibraryItem> {
        return this.request<LibraryItem>('/library', {
            method: 'POST',
            body: JSON.stringify({ refId, itemType }),
        });
    }
}

export const libraryService = new LibraryService();
