// Hardcoded for now, but ideally env var
// CloudFront Domain (from Terraform)
export const CLOUDFRONT_DOMAIN = "d3268cfwjiozkv.cloudfront.net";

/**
 * Converts an S3 URL or legacy URL to a CloudFront URL.
 */
export function getCloudFrontUrl(url: string | undefined | null): string {
    if (!url) return "";

    // If it's a signed URL (Presigned), do NOT convert to CloudFront
    if (url.includes("?") && url.includes("X-Amz-Credential")) {
        return url;
    }

    // 0. Handle absolute API URLs (Fix for uniforge.kr/api/... CORS issue)
    // Always force relative path for API calls to leverage Vite Proxy or Same-Origin
    if (url.includes("/api/assets/s3/") || url.includes("/api/games/s3/")) {
        const idx = url.indexOf("/api/");
        if (idx !== -1) {
            return url.substring(idx);
        }
    }

    // 1. Handle S3 URLs
    const s3Regex = /https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com/;
    if (s3Regex.test(url)) {
        return url.replace(s3Regex, `https://${CLOUDFRONT_DOMAIN}`);
    }

    // 2. Handle specific legacy/wrong domain (uniforge.kr) AND Standardize to Proxy URL
    // If we detect an Asset ID in the URL, prefer using the Proxy API for security & consistency
    const assetIdRegex = /uploads\/ASSET\/([a-f0-9-]+)\//i;
    const gameIdRegex = /uploads\/GAME\/([a-f0-9-]+)\//i;

    const assetMatch = url.match(assetIdRegex);
    const gameMatch = url.match(gameIdRegex);

    if (assetMatch && assetMatch[1]) {
        return `/api/assets/s3/${assetMatch[1]}?imageType=base`;
    }

    if (gameMatch && gameMatch[1]) {
        return `/api/games/s3/${gameMatch[1]}?imageType=thumbnail`;
    }

    // Default fallback
    if (url.startsWith("https://uniforge.kr/uploads") || url.includes("cloudfront.net/uploads")) {
        return url.replace(/https:\/\/[^/]+/, `https://${CLOUDFRONT_DOMAIN}`);
    }

    return url;
}

/**
 * Resolves audio URLs to direct CloudFront URLs.
 * Phaser's Web Audio API requires direct access to audio files, not proxy URLs.
 * 
 * @param url - Original URL (may be proxy URL like /api/assets/s3/{id})
 * @param assetId - Optional asset ID if known
 * @returns Direct CloudFront URL for audio file
 */
export function resolveAudioUrl(url: string | undefined | null, assetId?: string): string {
    if (!url) return "";

    // If already a direct CloudFront URL, return as-is
    if (url.includes(CLOUDFRONT_DOMAIN)) {
        return url;
    }

    // If it's a signed URL (Presigned), return as-is
    if (url.includes("?") && url.includes("X-Amz-Credential")) {
        return url;
    }

    // Extract asset ID from proxy URL pattern: /api/assets/s3/{id}
    const proxyMatch = url.match(/\/api\/assets\/s3\/([a-f0-9-]+)/i);
    const extractedId = proxyMatch?.[1] || assetId;

    if (extractedId) {
        // For now, we need to fetch the actual S3 key from the asset metadata
        // As a workaround, return the proxy URL and let the browser handle it
        // This requires the backend to set proper CORS headers for audio
        return url;
    }

    // If it's an S3 URL, convert to CloudFront
    const s3Regex = /https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com/;
    if (s3Regex.test(url)) {
        return url.replace(s3Regex, `https://${CLOUDFRONT_DOMAIN}`);
    }

    return url;
}
