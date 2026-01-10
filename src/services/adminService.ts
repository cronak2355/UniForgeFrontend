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
}

export const adminService = new AdminService();
