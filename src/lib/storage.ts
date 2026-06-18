import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { fetchWithRetry, OutboundFetchError } from "./http";

export type StorageArea = "public" | "private";

export type SaveResult = {
  url: string;
  thumbUrl: string;
};

type ImageOutput = "jpeg" | "webp";

type DetectedImage = {
  contentType: string;
  extension: "jpg" | "png" | "webp" | "gif";
  output: ImageOutput;
  animated?: boolean;
};

type SaveOptions = {
  area: StorageArea;
  subdir: string;
  contentType?: string | null;
  filename?: string | null;
};

export type StorageErrorCode =
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "INVALID_PATH"
  | "REMOTE_TOO_LARGE"
  | "REMOTE_DOWNLOAD_FAILED"
  | "REMOTE_UNSUPPORTED_TYPE"
  | "REMOTE_SSRF_BLOCKED"
  | "PROCESSING_FAILED";

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode = "PROCESSING_FAILED",
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export function remoteImageErrorMessage(error: unknown, fallback = "远程图片无法转存。可以改用本地上传。") {
  if (!(error instanceof StorageError)) {
    return fallback;
  }

  switch (error.code) {
    case "REMOTE_TOO_LARGE":
      return "远程图片超过 8MB，无法转存。可以先下载压缩后本地上传。";
    case "REMOTE_UNSUPPORTED_TYPE":
      return "远程图片格式不支持，只能转存 jpeg、png、webp 或 gif。";
    case "REMOTE_SSRF_BLOCKED":
      return "远程图片地址被安全策略拦截。请改用公开图片地址或本地上传。";
    case "REMOTE_DOWNLOAD_FAILED":
      return "远程图片下载失败。请检查链接是否可公开访问，或改用本地上传。";
    default:
      return fallback;
  }
}

export const LOCAL_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const REMOTE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const IMAGE_TYPES = new Map<string, DetectedImage>([
  ["image/jpeg", { contentType: "image/jpeg", extension: "jpg", output: "jpeg" }],
  ["image/jpg", { contentType: "image/jpeg", extension: "jpg", output: "jpeg" }],
  ["image/png", { contentType: "image/png", extension: "png", output: "webp" }],
  ["image/webp", { contentType: "image/webp", extension: "webp", output: "webp" }],
  ["image/gif", { contentType: "image/gif", extension: "gif", output: "webp", animated: true }],
]);

const FILENAME_EXTENSIONS = new Map<string, string>([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
  ["svg", "image/svg+xml"],
]);

function normalizedContentType(contentType: string | null | undefined) {
  return contentType?.split(";")[0]?.trim().toLowerCase() || null;
}

function contentTypeFromFilename(filename: string | null | undefined) {
  const extension = filename?.split(".").pop()?.trim().toLowerCase();

  return extension ? FILENAME_EXTENSIONS.get(extension) ?? null : null;
}

export function extensionFromContentType(contentType: string | null) {
  const detected = normalizedContentType(contentType);

  return detected ? IMAGE_TYPES.get(detected)?.extension ?? null : null;
}

export function sanitizeStorageSubdir(subdir: string) {
  const parts: string[] = [];

  for (const rawPart of subdir.split(/[\\/]+/)) {
    const part = rawPart.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      parts.pop();
      continue;
    }

    parts.push(part);
  }

  return parts.join("/");
}

export function getUploadRoot() {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR);
  }

  return path.resolve(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads"));
}

function getAreaRoot(area: StorageArea) {
  const root = getUploadRoot();

  if (process.env.UPLOAD_DIR) {
    return path.join(root, area);
  }

  if (area === "public") {
    return root;
  }

  return path.resolve(path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "uploads", "private"));
}

export function getPublicUploadRoot() {
  return getAreaRoot("public");
}

function assertInsideRoot(root: string, target: string) {
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new StorageError("文件路径无效。", "INVALID_PATH");
  }
}

export function assertPublicUploadPath(parts: string[]) {
  const publicRoot = getPublicUploadRoot();
  const target = path.resolve(publicRoot, ...parts);

  assertInsideRoot(publicRoot, target);

  return target;
}

export function getPrivateUploadRoot() {
  return getAreaRoot("private");
}

export function assertPrivateUploadPath(parts: string[]) {
  const privateRoot = getPrivateUploadRoot();
  const target = path.resolve(privateRoot, ...parts);

  assertInsideRoot(privateRoot, target);

  return target;
}

export function detectImageType(contentType?: string | null, filename?: string | null) {
  const normalized = normalizedContentType(contentType) ?? contentTypeFromFilename(filename);

  if (normalized === "image/svg+xml" || filename?.toLowerCase().endsWith(".svg")) {
    throw new StorageError("不支持上传 SVG 图片，请改用 jpeg、png、webp 或 gif。", "UNSUPPORTED_TYPE");
  }

  const detected = normalized ? IMAGE_TYPES.get(normalized) : null;

  if (!detected) {
    throw new StorageError("只支持上传 jpeg、png、webp 或 gif 图片。", "UNSUPPORTED_TYPE");
  }

  return detected;
}

function toRemoteImageError(error: StorageError) {
  if (error.code === "UNSUPPORTED_TYPE") {
    return new StorageError(error.message, "REMOTE_UNSUPPORTED_TYPE");
  }

  return error;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : null;
}

function outputExtension(output: ImageOutput) {
  return output === "jpeg" ? "jpg" : "webp";
}

function outputContentType(output: ImageOutput) {
  return output === "jpeg" ? "image/jpeg" : "image/webp";
}

function formatMegabytes(bytes: number) {
  return Math.floor(bytes / 1024 / 1024);
}

export function assertLocalUploadSize(size: number) {
  if (size > LOCAL_UPLOAD_MAX_BYTES) {
    throw new StorageError(`图片不能超过 ${formatMegabytes(LOCAL_UPLOAD_MAX_BYTES)}MB。`, "FILE_TOO_LARGE");
  }
}

function assertRemoteImageSize(size: number) {
  if (size > REMOTE_IMAGE_MAX_BYTES) {
    throw new StorageError(`远程图片不能超过 ${formatMegabytes(REMOTE_IMAGE_MAX_BYTES)}MB。`, "REMOTE_TOO_LARGE");
  }
}

function assertRemoteContentLength(headers: Headers) {
  const contentLength = headers.get("content-length");

  if (!contentLength) {
    return;
  }

  const size = Number(contentLength);

  if (Number.isFinite(size)) {
    assertRemoteImageSize(size);
  }
}

async function readLimitedResponseBuffer(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();

  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());

    assertRemoteImageSize(buffer.byteLength);

    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel();
        assertRemoteImageSize(total);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}

async function processImage(buffer: Buffer, image: DetectedImage, size: number) {
  let pipeline = sharp(buffer, { animated: image.animated }).rotate().resize({
    width: size,
    height: size,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (image.output === "jpeg") {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  } else {
    pipeline = pipeline.webp({ quality: 82 });
  }

  return pipeline.toBuffer();
}

export async function save(buffer: Buffer, options: SaveOptions): Promise<SaveResult> {
  assertLocalUploadSize(buffer.byteLength);

  const image = detectImageType(options.contentType, options.filename);
  const safeSubdir = sanitizeStorageSubdir(options.subdir);
  const areaRoot = getAreaRoot(options.area);
  const uploadDir = path.resolve(areaRoot, safeSubdir);

  assertInsideRoot(areaRoot, uploadDir);

  const extension = outputExtension(image.output);
  const basename = `${Date.now()}-${randomUUID()}`;
  const filename = `${basename}.${extension}`;
  const thumbFilename = `${basename}-thumb.${extension}`;
  const filePath = path.join(uploadDir, filename);
  const thumbPath = path.join(uploadDir, thumbFilename);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, await processImage(buffer, image, 2000));
  await writeFile(thumbPath, await processImage(buffer, image, 480));

  if (options.area === "public") {
    const prefix = safeSubdir ? `/uploads/${safeSubdir}` : "/uploads";

    return {
      url: `${prefix}/${filename}`,
      thumbUrl: `${prefix}/${thumbFilename}`,
    };
  }

  const prefix = safeSubdir ? `/api/files/private/${safeSubdir}` : "/api/files/private";

  return {
    url: `${prefix}/${filename}`,
    thumbUrl: `${prefix}/${thumbFilename}`,
  };
}

export async function saveFromUrl(url: string, subdir: string) {
  let response: Response;
  try {
    response = await fetchWithRetry(url, {
      headers: {
        accept: "image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8",
      },
    });
  } catch (error) {
    if ((error instanceof OutboundFetchError && error.code === "SSRF_BLOCKED") || errorCode(error) === "SSRF_BLOCKED") {
      throw new StorageError("远程图片地址被安全策略拦截。", "REMOTE_SSRF_BLOCKED");
    }

    throw new StorageError("远程图片下载失败。", "REMOTE_DOWNLOAD_FAILED");
  }

  if (!response.ok) {
    throw new StorageError(`下载文件失败：${response.status}`, "REMOTE_DOWNLOAD_FAILED");
  }

  assertRemoteContentLength(response.headers);

  try {
    return await save(await readLimitedResponseBuffer(response, REMOTE_IMAGE_MAX_BYTES), {
      area: "public",
      subdir,
      contentType: response.headers.get("content-type"),
      filename: new URL(url).pathname.split("/").pop() ?? null,
    });
  } catch (error) {
    if (error instanceof StorageError) {
      throw toRemoteImageError(error);
    }

    throw error;
  }
}

export function contentTypeForPublicPath(filePath: string) {
  const extension = filePath.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "gif") {
    return "image/gif";
  }

  return "application/octet-stream";
}

export function outputContentTypeForImage(contentType?: string | null, filename?: string | null) {
  return outputContentType(detectImageType(contentType, filename).output);
}
