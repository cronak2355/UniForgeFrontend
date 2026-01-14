import { apiClient } from './apiClient';

const API_BASE_URL = 'https://uniforge.kr'; // Kept for Google OAuth URL

export interface User {
    id: string;
    email: string;
    name: string;
    provider: 'LOCAL' | 'GOOGLE';
    profileImage: string | null;
    role: 'USER' | 'ADMIN';
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    email: string;
    password: string;
    name: string;
}

class AuthService {
    private setToken(token: string): void {
        localStorage.setItem('token', token);
    }

    private removeToken(): void {
        localStorage.removeItem('token');
    }

    async signup(data: SignupRequest): Promise<AuthResponse> {
        // apiClient base is /api, so we just pass /auth/signup
        const response = await apiClient.request<AuthResponse>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.setToken(response.token);
        return response;
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await apiClient.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.setToken(response.token);
        return response;
    }

    async getCurrentUser(): Promise<User | null> {
        if (!this.isAuthenticated()) return null;

        try {
            return await apiClient.request<User>('/auth/me');
        } catch {
            this.removeToken();
            return null;
        }
    }

    logout(): void {
        this.removeToken();
    }

    isAuthenticated(): boolean {
        return localStorage.getItem('token') !== null;
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    handleOAuthCallback(token: string): void {
        this.setToken(token);
    }

    getGoogleLoginUrl(): string {
        return `${API_BASE_URL}/api/oauth2/authorization/google`;
    }
}

export const authService = new AuthService();
