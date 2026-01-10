import { apiClient } from './apiClient';

export interface LibraryItem {
    id: string;
    userId: string;
    refId: string;
    itemType: string;
    collectionId?: string | null;
    createdAt: string;
}

class LibraryService {
    async getLibrary(): Promise<LibraryItem[]> {
        return apiClient.request<LibraryItem[]>(`/library`);
    }

    async getCollections(): Promise<any[]> {
        return apiClient.request<any[]>('/library/collections');
    }

    async createCollection(name: string): Promise<any> {
        return apiClient.request<any>('/library/collections', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    async moveItemToCollection(itemId: string, collectionId: string | null): Promise<void> {
        return apiClient.request<void>(`/library/items/${itemId}/move`, {
            method: 'PUT',
            body: JSON.stringify({ collectionId }),
        });
    }

    async addToLibrary(refId: string, itemType: string = 'ASSET'): Promise<LibraryItem> {
        return apiClient.request<LibraryItem>('/library', {
            method: 'POST',
            body: JSON.stringify({ refId, itemType }),
        });
    }
}

export const libraryService = new LibraryService();
