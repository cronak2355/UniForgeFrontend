import boto3
import os

# Construct path safely
user_home = os.path.expanduser('~')
base_path = os.path.join(user_home, ".gemini", "antigravity", "brain", "a857ed2d-a1f1-4098-ac5f-2ebc19bd3027")

bucket = "uniforge-assets"
target_key = "presets/green_warrior.png"
source_file = "uploaded_image_1768966849067.png"

try:
    s3 = boto3.client('s3', region_name='ap-northeast-2')
    local_path = os.path.join(base_path, source_file)
    
    print(f"Uploading {source_file} to s3://{bucket}/{target_key}...")
    
    # ContentType을 image/png로 명시
    s3.upload_file(local_path, bucket, target_key, ExtraArgs={'ContentType': 'image/png'})
    print("Success: Image updated.")
    
except Exception as e:
    print(f"Error: {e}")
