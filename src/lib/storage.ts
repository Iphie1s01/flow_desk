import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const storageEnabled = () =>
  !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
let _c: S3Client | null = null;
const client = () =>
  (_c ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  }));
const Bucket = () => process.env.R2_BUCKET!;

// The bucket is private. Browsers only ever get 60-second signed URLs, issued after a database permission check.
export const signUpload = (
  Key: string,
  ContentType: string,
  ContentLength: number,
) =>
  getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: Bucket(), Key, ContentType, ContentLength }),
    { expiresIn: 60 },
  );
export const signDownload = (Key: string, name: string) =>
  getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: Bucket(),
      Key,
      ResponseContentDisposition: `attachment; filename="${name.replace(/[^\w.\- ]/g, "_")}"`,
    }),
    { expiresIn: 60 },
  );
export const headObject = (Key: string) =>
  client().send(new HeadObjectCommand({ Bucket: Bucket(), Key }));
export const deleteObject = (Key: string) =>
  client().send(new DeleteObjectCommand({ Bucket: Bucket(), Key }));
