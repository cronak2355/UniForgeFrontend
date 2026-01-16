// Hardcoded for now, but ideally env var
// CloudFront Domain (from Terraform)
export const CLOUDFRONT_DOMAIN = "d2h4arewwuma9h.cloudfront.net";

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
    // Regex to extract Asset ID from: https://uniforge.kr/uploads/ASSET/{UUID}/...
    const assetIdRegex = /uploads\/ASSET\/([a-f0-9-]+)\//i;
    const match = url.match(assetIdRegex);

    if (match && match[1]) {
        return `/api/assets/s3/${match[1]}?imageType=base`;
    }

    // Default fallback (though we should avoid this for assets)
    if (url.startsWith("https://uniforge.kr/uploads")) {
        // If we couldn't extract ID, still try to route via CloudFront as last resort or keep as is?
        // User wants Proxy. If we can' extract ID, we can't use Proxy.
        return url.replace("https://uniforge.kr", `https://${CLOUDFRONT_DOMAIN}`);
    }

    return url;
}
