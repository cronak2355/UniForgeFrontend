// Hardcoded for now, but ideally env var
// CloudFront Domain (from Terraform)
export const CLOUDFRONT_DOMAIN = "d3268cfwjiozkv.cloudfront.net";

/**
 * Converts an S3 URL or legacy URL to a CloudFront URL.
 */
export function getCloudFrontUrl(url: string | undefined | null): string {
    if (!url) return "";

    // If it's a signed URL (Presigned), do NOT convert to CloudFront
    if (url.includes("?") || url.includes("X-Amz-Credential")) {
        return url;
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
