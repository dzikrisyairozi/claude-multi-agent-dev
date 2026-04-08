"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

type UploadParams = {
  key: string;
  body: Buffer | ArrayBuffer | Uint8Array;
  contentType?: string;
  metadata?: Record<string, string>;
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.AWS_S3_BUCKET!;

export async function uploadFileToS3({
  key,
  body,
  contentType,
  metadata,
}: UploadParams): Promise<{ bucket: string; key: string }> {
  const payload =
    body instanceof Buffer
      ? body
      : body instanceof Uint8Array
        ? Buffer.from(body)
        : Buffer.from(body as ArrayBuffer);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: payload,
    ContentType: contentType,
    Metadata: metadata,
  });

  await s3Client.send(command);

  return { bucket: bucketName, key };
}
