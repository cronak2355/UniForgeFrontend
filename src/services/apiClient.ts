export class ApiClient {
    private static readonly API_BASE_URL = '/api';

    private getToken(): string | null {
        return localStorage.getItem('token');
    }

    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = this.getToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${ApiClient.API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.indexOf("application/json") !== -1;

        if (!response.ok) {
            if (isJson) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Request failed with status ${response.status}`);
            } else {
                const text = await response.text();
                console.error("Received non-JSON response:", text.substring(0, 500));
                throw new Error(`Server returned unexpected response (Status: ${response.status})`);
            }
        }

        // Handle empty responses (204 No Content) or responses without JSON
        if (response.status === 204 || !contentType) {
            return undefined as T;
        }

        if (!isJson) {
            const text = await response.text();
            // If the response is empty or whitespace only, treat as success
            if (!text || text.trim() === '') {
                return undefined as T;
            }
            console.error("Received HTML/Text instead of JSON (likely server error page):", text.substring(0, 200));
            throw new Error(`서버 응답 오류 (Status: ${response.status}). 관리자에게 문의하세요.`);
        }

        return response.json();
    }
}

export const apiClient = new ApiClient();
