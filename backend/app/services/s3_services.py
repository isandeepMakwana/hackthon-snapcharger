import boto3
import os
from botocore.exceptions import NoCredentialsError
from dotenv import load_dotenv

load_dotenv()

# Initialize S3 Client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)

BUCKET_NAME = os.getenv('AWS_BUCKET_NAME')

def upload_file_to_s3(file_obj, object_name):
    """
    Uploads a file-like object to S3 and returns the public URL.
    """
    try:
        # Upload the file
        s3_client.upload_fileobj(
            file_obj,
            BUCKET_NAME,
            object_name,
            ExtraArgs={'ContentType': 'image/jpeg'} # Helps browser display it correctly
        )
        
        # Construct the Public URL
        # NOTE: Ensure your S3 bucket settings allow public access or use CloudFront
        url = f"https://{BUCKET_NAME}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{object_name}"
        return url

    except NoCredentialsError:
        print("Credentials not available")
        return None
    except Exception as e:
        print(f"S3 Upload Error: {e}")
        return None