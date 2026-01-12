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

        // 1. DEV MODE: Local Mock
        if (import.meta.env.DEV || window.location.hostname === 'localhost') {
            console.log("[assetService] Running in DEV mode (Mock Upload)");
            console.log("[assetService] Mock: Create Asset -> Get ID -> Upload -> Register");
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const assetUrl = e.target?.result as string;
                    resolve({
                        id: crypto.randomUUID(), // Mock ID
                        url: assetUrl,
                        name,
                        tag,
                        metadata
                    });
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
        const imageType = "base"; // Use base for the main asset file
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
    }
};
