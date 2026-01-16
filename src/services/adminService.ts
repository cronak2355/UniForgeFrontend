import { apiClient } from './apiClient';

export interface AdminStats {
    totalUsers: number;
    totalAssets: number;
    totalGames: number;
    adminCount: number;
}

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
    provider: string;
    profileImage: string | null;
    createdAt: string;
    assetCount: number;
    gameCount: number;
}

export interface AdminAsset {
    id: string;
    name: string;
    description: string | null;
    price: number;
    authorId: string;
    authorName: string;
    imageUrl: string | null;
    isPublic: boolean;
    genre: string | null;
    createdAt: string;
}

export interface AdminGame {
    gameId: string;
    title: string;
    description?: string;
    authorId: string;
    // authorName is not in GameSummaryDTO but we might want it. 
    // For now base on what GameSummaryDTO provides or fetch separate?
    // GameSummaryDTO has authorName? Let's check DTO.
    // DTO has authorId, but maybe author's name is not joined.
    // Let's assume basic info for now.
    isPublic: boolean;
    createdAt: string;
    thumbnailUrl?: string;
}

class AdminService {
    async getStats(): Promise<AdminStats> {
        return apiClient.request<AdminStats>('/admin/stats');
    }

    async getUsers(role?: string, search?: string): Promise<AdminUser[]> {
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        if (search) params.append('search', search);
        const query = params.toString();
        return apiClient.request<AdminUser[]>(`/admin/users${query ? '?' + query : ''}`);
    }

    async getUser(userId: string): Promise<AdminUser> {
        return apiClient.request<AdminUser>(`/admin/users/${userId}`);
    }

    async updateUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<AdminUser> {
        return apiClient.request<AdminUser>(`/admin/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    }

    async getAssets(authorId?: string, search?: string): Promise<AdminAsset[]> {
        const params = new URLSearchParams();
        if (authorId) params.append('authorId', authorId);
        if (search) params.append('search', search);
        const query = params.toString();
        return apiClient.request<AdminAsset[]>(`/admin/assets${query ? '?' + query : ''}`);
    }

    async deleteAsset(assetId: string): Promise<{ success: boolean; message: string; deletedId: string }> {
        return apiClient.request(`/admin/assets/${assetId}`, {
            method: 'DELETE'
        });
    }

    async deleteAllAssets(): Promise<{ success: boolean; message: string }> {
        return apiClient.request('/admin/assets/all', {
            method: 'DELETE'
        });
    }

    async cleanupLibrary(email: string): Promise<string> {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/system/library-cleanup?email=${email}`, {
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to cleanup library: ${response.statusText}`);
        }

        return response.text();
    }

    async getGames(): Promise<AdminGame[]> {
        // Admin endpoint: /games/all
        return apiClient.request<AdminGame[]>('/games/all');
    }

    async deleteGame(gameId: string): Promise<void> {
        return apiClient.request(`/games/${gameId}`, {
            method: 'DELETE'
        });
    }

    async deleteAllGames(): Promise<void> {
        return apiClient.request('/games/all', {
            method: 'DELETE'
        });
    }
}

export const adminService = new AdminService();
