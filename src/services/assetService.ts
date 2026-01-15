import { apiClient } from './apiClient';

export interface UploadedAssetData {
    id: string;
    url: string;
    name: string;
    tag: string;
    metadata?: Record<string, unknown>;
}

export const assetService = {
    async uploadAsset(
        file: File | Blob,
        name: string,
        tag: string,
        token: string | null,
        metadata?: Record<string, unknown>,
        isPublic: boolean = true
    ): Promise<UploadedAssetData> {
        const contentType = file.type || "application/octet-stream";

        // 1. DEV MODE: Local Mock (localStorage 저장)

        // 1. DEV MODE: Mock Logic Removed - Always use Real API
        /* 
        if (import.meta.env.DEV || window.location.hostname === 'localhost') {
           // Mock logic removed to force real S3 tests
        } 
        */

        // 2. PROD/API MODE: Full Chain via apiClient

        // Step A: Create Asset Entity

        const assetEntity = await apiClient.request<{ id: string; name: string }>('/assets', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                description: metadata ? JSON.stringify(metadata) : "Uploaded from Asset Editor",
                genre: tag, // Map tag to genre
                isPublic: isPublic,
                price: 0
            })
        });

        const assetId = assetEntity.id;
        const versionId = "1"; // Default version for now

        // Step B: Get Upload URL
        const imageType = "base";
        const params = new URLSearchParams({
            contentType,
            imageType,
        });

        // This endpoint returns a map { uploadUrl: ..., s3Key: ... }
        const presignData = await apiClient.request<{ uploadUrl?: string; presignedUrl?: string; url?: string; s3Key?: string; key?: string }>(
            `/assets/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(versionId)}/upload-url?${params.toString()}`
        );

        const uploadUrl = presignData.uploadUrl || presignData.presignedUrl || presignData.url;
        if (!uploadUrl) {
            throw new Error("Upload URL missing in response.");
        }

        // Step C: Upload to S3 (Direct fetch required as this is S3, not our API)
        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: file,
        });

        if (!uploadRes.ok) {
            throw new Error("Upload to S3 failed.");
        }

        const extractS3Key = (url: string) => {
            try {
                const parsed = new URL(url);
                const key = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
                return key || null;
            } catch {
                return null;
            }
        };

        const s3Key = presignData.s3Key || presignData.key || extractS3Key(uploadUrl);
        if (!s3Key) {
            throw new Error("S3 key missing in response.");
        }

        // Step D: Register Image
        await apiClient.request('/images', {
            method: 'POST',
            body: JSON.stringify({
                ownerType: "ASSET",
                ownerId: assetId,
                imageType,
                s3Key,
                contentType,
            })
        });

        // Step E: Update Asset with the Proxy URL
        const finalAssetUrl = `/api/assets/s3/${encodeURIComponent(assetId)}?imageType=${encodeURIComponent(imageType)}`;

        try {
            await apiClient.request(`/assets/${assetId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    imageUrl: finalAssetUrl
                })
            });
        } catch (e) {
            console.warn("Failed to patch asset with image URL, but upload succeeded.", e);
        }

        console.log(`[assetService] Asset Created & Uploaded: ${assetId}, URL: ${finalAssetUrl}`);

        return {
            id: assetId,
            url: finalAssetUrl,
            name: assetEntity.name,
            tag: tag,
            metadata: metadata
        };
    },

    async updateAsset(
        assetId: string,
        file: File | Blob,
        metadata: Record<string, unknown>,
        token: string | null
    ): Promise<{ id: string; url: string }> {
        // 1. Get Upload URL
        const versionId = Date.now().toString();
        const contentType = file.type || "application/octet-stream";
        const imageType = "base";
        const params = new URLSearchParams({
            contentType,
            imageType,
        });

        const presignData = await apiClient.request<{ uploadUrl?: string; presignedUrl?: string; url?: string; s3Key?: string; key?: string }>(
            `/assets/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(versionId)}/upload-url?${params.toString()}`
        );

        const uploadUrl = presignData.uploadUrl || presignData.presignedUrl || presignData.url;
        if (!uploadUrl) {
            throw new Error("Upload URL missing in response.");
        }

        // 2. Upload to S3 (Direct fetch)
        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: file,
        });

        if (!uploadRes.ok) {
            throw new Error(`S3 Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        const extractS3Key = (url: string) => {
            try {
                const parsed = new URL(url);
                const key = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
                return key || null;
            } catch {
                return null;
            }
        };

        const s3Key = presignData.s3Key || presignData.key || extractS3Key(uploadUrl);
        if (!s3Key) {
            throw new Error("S3 key missing in response.");
        }

        // 3. Register Image in DB
        await apiClient.request('/images', {
            method: 'POST',
            body: JSON.stringify({
                ownerType: "ASSET",
                ownerId: assetId,
                imageType,
                s3Key,
                contentType,
            })
        });

        // 4. Update Metadata AND Image URL
        const finalAssetUrl = `/api/assets/s3/${encodeURIComponent(assetId)}?imageType=${encodeURIComponent(imageType)}`;

        const updateBody: Record<string, unknown> = {
            imageUrl: finalAssetUrl
        };
        if (metadata) {
            updateBody.description = JSON.stringify(metadata);
        }

        // CHANGED: PUT -> PATCH to match backend controller
        await apiClient.request(`/assets/${encodeURIComponent(assetId)}`, {
            method: "PATCH",
            body: JSON.stringify(updateBody)
        });

        console.log(`[assetService] Asset Updated: ${assetId}`);
        return { id: assetId, url: finalAssetUrl };
    },

    async getAsset(assetId: string): Promise<unknown> {
        return apiClient.request(`/assets/${assetId}`);
    },

    /**
     * localStorage에서 로컬 에셋 목록 가져오기 (DEV 모드용)
     */
    getLocalAssets(): UploadedAssetData[] {
        const LOCAL_ASSETS_KEY = 'uniforge_local_assets';
        try {
            return JSON.parse(localStorage.getItem(LOCAL_ASSETS_KEY) || '[]');
        } catch {
            return [];
        }
    },

    /**
     * localStorage의 로컬 에셋 삭제 (DEV 모드용)
     */
    clearLocalAssets(): void {
        const LOCAL_ASSETS_KEY = 'uniforge_local_assets';
        localStorage.removeItem(LOCAL_ASSETS_KEY);
        console.log("[assetService] Local assets cleared");
    },

    async deleteAsset(assetId: string, token: string | null): Promise<void> {
        // 1. DEV MODE: Local Mock

        // 1. DEV MODE: Mock Logic Removed
        /*
        if (import.meta.env.DEV || window.location.hostname === 'localhost') {
             // Mock logic removed
        }
        */

        // 2. PROD/API MODE
        await apiClient.request(`/assets/${assetId}`, {
            method: "DELETE"
        });

        console.log(`[assetService] Asset Deleted: ${assetId}`);
    }
};
