// Stage 3 minimal storage module: only public saveFromUrl is implemented for favicon caching.
// Stage 5 will expand this file into the full public/private storage module with image processing.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
]);

export function extensionFromContentType(contentType: string | null) {
  if (!contentType) {
    return null;
  }

  const normalized = contentType.split(";")[0]?.trim().toLowerCase();

  return normalized ? CONTENT_TYPE_EXTENSIONS.get(normalized) ?? null : null;
}

export function sanitizeStorageSubdir(subdir: string) {
  return subdir
    .split(/[\\/]+/)
    .map((part) => part.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

export async function saveFromUrl(url: string, subdir: string) {
  const response = await fetch(url, {
    headers: {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/x-icon,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`下载文件失败：${response.status}`);
  }

  const extension = extensionFromContentType(response.headers.get("content-type"));

  if (!extension) {
    throw new Error("远程文件类型不支持。");
  }

  const safeSubdir = sanitizeStorageSubdir(subdir);
  const uploadDir = path.join(PUBLIC_UPLOAD_ROOT, safeSubdir);
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const filePath = path.join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()));

  return `/uploads/${safeSubdir}/${filename}`;
}
