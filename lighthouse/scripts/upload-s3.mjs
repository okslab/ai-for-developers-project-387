import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.RAILWAY_S3_ENDPOINT;
const accessKeyId = process.env.RAILWAY_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.RAILWAY_S3_SECRET_ACCESS_KEY;
const bucket = process.env.RAILWAY_S3_BUCKET;
const reportsDir = process.env.REPORTS_DIR ?? join(process.cwd(), "reports");

for (const required of ["RAILWAY_S3_ENDPOINT", "RAILWAY_S3_ACCESS_KEY_ID", "RAILWAY_S3_SECRET_ACCESS_KEY", "RAILWAY_S3_BUCKET"]) {
  if (!process.env[required]) {
    throw new Error(`Missing required env var: ${required}`);
  }
}

const client = new S3Client({
  endpoint,
  region: "auto",
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const files = (await readdir(reportsDir)).filter((f) => f.endsWith(".html"));
if (files.length === 0) {
  throw new Error(`No HTML reports found in ${reportsDir}`);
}

for (const file of files) {
  const body = await readFile(join(reportsDir, file));
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `lighthouse/${file}`,
      Body: body,
      ContentType: "text/html; charset=utf-8",
    })
  );
  console.log(`Uploaded lighthouse/${file}`);
}

console.log(`Uploaded ${files.length} HTML report(s) to s3://${bucket}/lighthouse/`);