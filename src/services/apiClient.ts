export class ApiClient {
    private static readonly API_BASE_URL = 'https://uniforge.kr/api';

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

        if (!isJson) {
            const text = await response.text();
            console.error("Received HTML/Text instead of JSON (Soft 404):", text.substring(0, 200));
            throw new Error('API 응답이 올바르지 않습니다 (HTML 반환됨). 서버 구성을 확인해주세요.');
        }

        return response.json();
    }
}

export const apiClient = new ApiClient();
