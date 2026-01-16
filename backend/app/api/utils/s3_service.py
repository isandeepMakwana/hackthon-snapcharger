import boto3
import os
import logging
from botocore.exceptions import NoCredentialsError, ClientError
from dotenv import load_dotenv

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Initialize S3 Client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)

BUCKET_NAME = os.getenv('AWS_BUCKET_NAME')

def upload_file_to_s3(file_obj, object_name: str) -> str | None:
    """
    Uploads a file-like object (BytesIO) to S3.
    """
    if not BUCKET_NAME:
        logger.error("AWS_BUCKET_NAME is not set in .env")
        return None

    try:
        # Reset pointer to start of file stream
        file_obj.seek(0)
        
        # Upload
        s3_client.upload_fileobj(
            file_obj,
            BUCKET_NAME,
            object_name,
            ExtraArgs={
                'ContentType': 'image/jpeg', 
                # REMOVED: 'ACL': 'public-read' (This caused the crash)
                # Your Bucket Policy already handles public access.
            }
        )
        
        # Construct Public URL
        region = os.getenv('AWS_REGION')
        url = f"https://{BUCKET_NAME}.s3.{region}.amazonaws.com/{object_name}"
        
        logger.info(f"✅ S3 Upload Success: {url}")
        return url

    except NoCredentialsError:
        logger.error("❌ AWS Credentials not found.")
        return None
    except ClientError as e:
        logger.error(f"❌ AWS Client Error: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Unexpected S3 Error: {e}")
        return None