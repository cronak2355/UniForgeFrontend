export const CLOUDFRONT_DOMAIN = "d3268cfwjiozkv.cloudfront.net";
export const S3_DOMAIN = "unifor-uploaded-assets.s3.ap-northeast-2.amazonaws.com";

/**
 * Converts an S3 URL to a CloudFront URL.
 * If the URL is already CloudFront or not S3, returns it as is.
 */
export function getCloudFrontUrl(url: string | undefined | null): string {
    if (!url) return "";

    if (url.includes(S3_DOMAIN)) {
        return url.replace(S3_DOMAIN, CLOUDFRONT_DOMAIN);
    }

    // Also handle case where protocol might be http vs https or missing
    // But usually simple string replacement is enough if the path matches.

    return url;
}
