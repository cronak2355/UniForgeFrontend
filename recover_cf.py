import subprocess
import json
import sys

DIST_ID = "E2C82OGQQLZ3BB"
BUCKET_NAME = "uniforge-assets"

def run_command(cmd):
    print(f"Running: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {cmd}")
        print(f"Stderr: {e.stderr}")
        sys.exit(1)

def main():
    print("Starting recovery...")

    # 1. Create OAI
    print("Creating new OAI...")
    oai_cmd = f'aws cloudfront create-cloud-front-origin-access-identity --cloud-front-origin-access-identity-config CallerReference=recovery-{DIST_ID},Comment="Recovery-OAI-for-{BUCKET_NAME}"'
    oai_json_str = run_command(oai_cmd)
    oai_data = json.loads(oai_json_str)
    oai_id = oai_data['CloudFrontOriginAccessIdentity']['Id']
    print(f"Created OAI: {oai_id}")

    # 2. Get Distribution Config
    print("Fetching CloudFront Config...")
    getConfigCmd = f"aws cloudfront get-distribution-config --id {DIST_ID}"
    config_json_str = run_command(getConfigCmd)
    config_data = json.loads(config_json_str)
    
    etag = config_data['ETag']
    distribution_config = config_data['DistributionConfig']

    # 3. Modify Config
    print("Modifying Config...")
    origins = distribution_config.get('Origins', {}).get('Items', [])
    updated = False
    for origin in origins:
        # Check if it is an S3 origin (by domain name pattern or Id)
        print(f"Checking Origin: {origin['Id']} - {origin['DomainName']}")
        
        # We want to force it to point to uniforge-assets if it looks like the main S3 origin
        # The legacy one is likely the one with 'assets-' or 'S3-'
        if 's3.ap-northeast-2.amazonaws.com' in origin['DomainName']:
            print(f"Found S3 Origin to update: {origin['Id']}")
            
            # 1. Update Domain Name to the CORRECT bucket
            new_domain = f"{BUCKET_NAME}.s3.ap-northeast-2.amazonaws.com"
            print(f"Updating DomainName from {origin['DomainName']} to {new_domain}")
            origin['DomainName'] = new_domain
            
            # 2. Set OAI
            if 'S3OriginConfig' not in origin:
                origin['S3OriginConfig'] = {}
            
            origin['S3OriginConfig']['OriginAccessIdentity'] = f"origin-access-identity/cloudfront/{oai_id}"
            
            # 3. Clear OAC to avoid conflicts
            if 'OriginAccessControlId' in origin:
                 print("Clearing OriginAccessControlId to avoid conflict.")
                 origin['OriginAccessControlId'] = ""
                 # Some versions/configs might require removing the key entirely or setting to empty string.
                 # Usually empty string is fine, but let's check field definition.
                 # Actually, for S3OriginConfig, OAI is inside it. OAC is a top-level property of the origin (since 2022).
            
            updated = True
    
    if not updated:
        print("Error: Could not find any S3 origin to update.")
        sys.exit(1)

    # Save to file
    with open('dist-config.json', 'w', encoding='utf-8') as f:
        json.dump(distribution_config, f)

    # 4. Update Distribution
    print("Updating CloudFront Distribution...")
    update_cmd = f"aws cloudfront update-distribution --id {DIST_ID} --if-match {etag} --distribution-config file://dist-config.json"
    
    # Run manually to catch full stderr
    try:
        proc = subprocess.run(update_cmd, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8')
        print("CloudFront Updated.")
    except subprocess.CalledProcessError as e:
        print("FAILED to update distribution!")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        sys.exit(1)

    # 5. Update S3 Bucket Policy
    print("Updating S3 Bucket Policy...")
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudFrontOAI",
                "Effect": "Allow",
                "Principal": {
                    "AWS": f"arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity {oai_id}"
                },
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{BUCKET_NAME}/*"
            }
        ]
    }
    
    policy_json = json.dumps(policy)
    # Escape quotes for Windows shell if needed, but writing to file is safer for 'put-bucket-policy'
    with open('bucket-policy.json', 'w', encoding='utf-8') as f:
        json.dump(policy, f)
        
    policy_cmd = f"aws s3api put-bucket-policy --bucket {BUCKET_NAME} --policy file://bucket-policy.json"
    run_command(policy_cmd)
    print("S3 Policy Updated.")

    print("SUCCESS: Recovery Complete.")

if __name__ == "__main__":
    main()
