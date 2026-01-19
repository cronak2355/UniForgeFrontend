$ErrorActionPreference = "Stop"

$bucketName = "uniforge-assets"
$distributionId = "E2C82OGQQLZ3BB"

Write-Host "Deploying to $bucketName..."
Write-Host "Syncing dist/ to S3 (No delete)..."

# Sync dist content to S3 bucket
aws s3 sync dist/ s3://$bucketName

Write-Host "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*"

Write-Host "Deployment Complete!"
