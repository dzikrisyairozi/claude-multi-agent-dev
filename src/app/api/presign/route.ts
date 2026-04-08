export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  const { fileName, disposition = "inline", originalFileName } = await req.json();
  try {
    if (!fileName) {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
    }

    const key = `uploads/${fileName.trim()}`;

    // Use originalFileName for Content-Disposition header, fallback to last part of fileName
    const displayName = originalFileName || fileName.split("/").pop() || fileName;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      ResponseContentDisposition:
        disposition === "attachment"
          ? `attachment; filename="${encodeURIComponent(displayName)}"`
          : "inline",
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    return NextResponse.json({ url, key, expiresIn: 300 });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Failed to presign",
        requestedKey: `uploads/${fileName?.trim()}`,
        hint: "Check that the file exists in S3 with this exact key",
      },
      { status: 500 }
    );
  }
}
