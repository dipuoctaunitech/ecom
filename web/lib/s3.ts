import { S3Client } from "@aws-sdk/client-s3"

export const s3Client = new S3Client({
  region: "us-east-1", // AWS SDK requires a region, even for local MinIO
  endpoint: process.env.MINIO_ENDPOINT,
  forcePathStyle: true, // REQUIRED for MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
})
