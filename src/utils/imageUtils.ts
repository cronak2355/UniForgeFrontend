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

    // 2. Handle specific legacy/wrong domain (uniforge.kr) being used as CDN
    // This fixes assets that were saved with "https://uniforge.kr/uploads/..."
    if (url.startsWith("https://uniforge.kr/uploads")) {
        return url.replace("https://uniforge.kr", `https://${CLOUDFRONT_DOMAIN}`);
    }

    return url;
}
