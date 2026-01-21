import boto3
import os

# Construct path safely
user_home = os.path.expanduser('~')
base_path = os.path.join(user_home, ".gemini", "antigravity", "brain", "a857ed2d-a1f1-4098-ac5f-2ebc19bd3027")

bucket = "uniforge-assets"
prefix = "game-assets"

files = [
    ("uploaded_image_0_1768966084275.png", "wizard_idle.png"),
    ("uploaded_image_1_1768966084275.png", "wizard_walk.png"),
    ("uploaded_image_2_1768966084275.png", "boss_idle.png"),
    ("uploaded_image_3_1768966084275.png", "boss_walk.png"),
    ("uploaded_image_4_1768966084275.png", "bullet.png")
]

try:
    s3 = boto3.client('s3', region_name='ap-northeast-2')
    print(f"Base path: {base_path}")

    for src, dst in files:
        local_path = os.path.join(base_path, src)
        s3_key = f"{prefix}/{dst}"
        print(f"Uploading {src} to s3://{bucket}/{s3_key}...")
        try:
            s3.upload_file(local_path, bucket, s3_key, ExtraArgs={'ContentType': 'image/png'})
            print(f"Success: {dst}")
        except Exception as e:
            print(f"Failed to upload {dst}: {e}")
except Exception as e:
    print(f"Global Error: {e}")
