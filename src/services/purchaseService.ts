const API_BASE_URL = 'https://uniforge.kr/api'; // Hardcoded for production

class PurchaseService {
    private getToken(): string | null {
        return localStorage.getItem('token');
    }

    async purchaseAsset(assetVersionId: string): Promise<void> {
        const token = this.getToken();
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }
        const response = await fetch(`${API_BASE_URL}/purchase/asset?assetVersionId=${assetVersionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || '에셋 추가에 실패했습니다.');
        }
    }
}

export const purchaseService = new PurchaseService();
