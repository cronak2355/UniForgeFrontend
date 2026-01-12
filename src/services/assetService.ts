export interface UploadedAssetData {
    id: string;
    url: string;
    name: string;
    tag: string;
    metadata?: any;
}

export const assetService = {
    async uploadAsset(
        file: File | Blob,
        name: string,
        tag: string,
        token: string | null,
        metadata?: any
    ): Promise<UploadedAssetData> {
        const contentType = file.type || "application/octet-stream";

        // 1. DEV MODE: Local Mock (localStorage 저장)
        if (import.meta.env.DEV || window.location.hostname === 'localhost') {
            console.log("[assetService] Running in DEV mode (Mock Upload with localStorage)");
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const assetUrl = e.target?.result as string;
                    const newAsset: UploadedAssetData = {
                        id: crypto.randomUUID(),
                        url: assetUrl,
                        name,
                        tag,
                        metadata
                    };

                    // localStorage에 저장
                    const LOCAL_ASSETS_KEY = 'uniforge_local_assets';
                    const existingAssets = JSON.parse(localStorage.getItem(LOCAL_ASSETS_KEY) || '[]');
                    existingAssets.push(newAsset);
                    localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify(existingAssets));
                    console.log(`[assetService] Saved to localStorage: ${newAsset.name} (${newAsset.tag})`);

                    resolve(newAsset);
                };
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });
        }

        // 2. PROD MODE: Full Chain

        // Step A: Create Asset Entity to get a real ID
        const createRes = await fetch("https://uniforge.kr/api/assets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                name: name,
                description: metadata ? JSON.stringify(metadata) : "Uploaded from Asset Editor",
                genre: tag, // Map tag to genre
                isPublic: true,
                price: 0
            }),
        });

        if (!createRes.ok) {
            const msg = await createRes.text();
            throw new Error(`Failed to create asset entity: ${msg}`);
        }

        const assetEntity = await createRes.json();
        const assetId = assetEntity.id;
        const versionId = "1"; // Default version for now

        // Step B: Get Upload URL
        const imageType = "preview"; // Default image type for main asset logic
        const params = new URLSearchParams({
            contentType,
            imageType,
        });

        const requestUrl = `https://uniforge.kr/api/assets/${encodeURIComponent(assetId)}/versions/${encodeURIComponent(versionId)}/upload-url?${params.toString()}`;

        const presignRes = await fetch(requestUrl, {
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        if (!presignRes.ok) {
            const message = await presignRes.text();
            throw new Error(message || "Failed to get upload URL.");
        }

        const presignData = await presignRes.json();
        const uploadUrl = presignData.uploadUrl || presignData.presignedUrl || presignData.url;
        if (!uploadUrl) {
            throw new Error("Upload URL missing in response.");
        }

        // Step C: Upload to S3
        const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: file,
        });

        if (!uploadRes.ok) {
            throw new Error("Upload failed.");
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
        const imageRes = await fetch("https://uniforge.kr/api/images", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                ownerType: "ASSET",
                ownerId: assetId,
                imageType,
                s3Key,
                contentType,
            }),
        });

        if (!imageRes.ok) {
            const message = await imageRes.text();
            throw new Error(message || "Failed to register image.");
        }

        // Step E: Update Asset with the Proxy URL
        // The backend proxy endpoint for S3 images
        const finalAssetUrl = `https://uniforge.kr/api/assets/s3/${encodeURIComponent(assetId)}?imageType=${encodeURIComponent(imageType)}`;

        const patchRes = await fetch(`https://uniforge.kr/api/assets/${assetId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                imageUrl: finalAssetUrl
            })
        });

        if (!patchRes.ok) {
            console.warn("Failed to patch asset with image URL, but upload succeeded.");
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
    }
};
