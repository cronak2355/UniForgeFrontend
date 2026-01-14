import { apiClient } from './apiClient';

export const likeService = {
    async toggleLike(userId: string, type: string, targetId: string): Promise<boolean> {
        // The backend endpoint is just /likes (POST), and it seems it toggles or sets like.
        // Based on controller: like(userId, type, targetId)
        // Return type inference depends on backend, but usually void or boolean or updated count.
        // Controller returns "likeService.like(...)" which is likely Void or Boolean.
        // Let's assume it returns void or boolean.
        return apiClient.request<boolean>(`/likes?userId=${userId}&type=${type}&targetId=${targetId}`, {
            method: 'POST'
        });
    },

    async getLikeCount(type: string, targetId: string): Promise<number> {
        return apiClient.request<number>(`/likes/count?type=${type}&targetId=${targetId}`);
    }
};
