const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.uniforge.kr';

export interface User {
    id: string;
    email: string;
    name: string;
    provider: 'LOCAL' | 'GOOGLE';
    profileImage: string | null;
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
    private getToken(): string | null {
        return localStorage.getItem('token');
    }

    private setToken(token: string): void {
        localStorage.setItem('token', token);
    }

    private removeToken(): void {
        localStorage.removeItem('token');
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
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
            const error = await response.json().catch(() => ({ message: '오류가 발생했습니다' }));
            throw new Error(error.message);
        }

        return response.json();
    }

    async signup(data: SignupRequest): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.setToken(response.token);
        return response;
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.setToken(response.token);
        return response;
    }

    async getCurrentUser(): Promise<User | null> {
        const token = this.getToken();
        if (!token) return null;

        try {
            return await this.request<User>('/api/auth/me');
        } catch {
            this.removeToken();
            return null;
        }
    }

    logout(): void {
        this.removeToken();
    }

    isAuthenticated(): boolean {
        return this.getToken() !== null;
    }

    handleOAuthCallback(token: string): void {
        this.setToken(token);
    }

    getGoogleLoginUrl(): string {
        return `${API_BASE_URL}/oauth2/authorization/google`;
    }
}

export const authService = new AuthService();
