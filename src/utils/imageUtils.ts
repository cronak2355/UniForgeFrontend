// Hardcoded for now, but ideally env var
export const CLOUDFRONT_DOMAIN = "d3268cfwjiozkv.cloudfront.net";

/**
 * Converts an S3 URL to a CloudFront URL.
 * It detects standard S3 virtual-hosted-style URLs and replaces the origin with the CloudFront domain.
 */
export function getCloudFrontUrl(url: string | undefined | null): string {
    if (!url) return "";

    // Regex to match: https://[bucket].s3.[region].amazonaws.com
    // Use a flexible pattern to catch region variations.
    const s3Regex = /https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com/;

    // If it's a signed URL (Presigned), do NOT convert to CloudFront,
    // because the signature is bound to the S3 host. Changing host invalidates it.
    if (url.includes("?") || url.includes("X-Amz-Credential")) {
        return url;
    }

    if (s3Regex.test(url)) {
        return url.replace(s3Regex, `https://${CLOUDFRONT_DOMAIN}`);
    }

    return url;
}
