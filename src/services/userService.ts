import { apiClient } from './apiClient';

export interface UserInfo {
    id: string;
    name: string;
    email?: string;
    profileImage?: string;
}

// Cache for user info to avoid repeated API calls
const userCache: Map<string, UserInfo | null> = new Map();

class UserService {
    async getUserById(userId: string): Promise<UserInfo | null> {
        // Check cache first
        if (userCache.has(userId)) {
            return userCache.get(userId) || null;
        }

        try {
            const user = await apiClient.request<UserInfo>(`/users/${userId}`);
            userCache.set(userId, user);
            return user;
        } catch (error) {
            console.warn(`Failed to fetch user ${userId}:`, error);
            userCache.set(userId, null);
            return null;
        }
    }

    async getUsersByIds(userIds: string[]): Promise<Map<string, UserInfo | null>> {
        const result = new Map<string, UserInfo | null>();
        const idsToFetch: string[] = [];

        // Check cache for each ID
        for (const id of userIds) {
            if (userCache.has(id)) {
                result.set(id, userCache.get(id) || null);
            } else {
                idsToFetch.push(id);
            }
        }

        // Fetch remaining IDs
        if (idsToFetch.length > 0) {
            await Promise.all(
                idsToFetch.map(async (id) => {
                    const user = await this.getUserById(id);
                    result.set(id, user);
                })
            );
        }

        return result;
    }

    clearCache() {
        userCache.clear();
    }
}

export const userService = new UserService();
