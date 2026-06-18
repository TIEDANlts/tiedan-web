import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertPublicUploadPath,
  assertPrivateUploadPath,
  detectImageType,
  extensionFromContentType,
  getPrivateUploadRoot,
  getPublicUploadRoot,
  getUploadRoot,
  save,
  saveFromUrl,
  sanitizeStorageSubdir,
  StorageError,
} from "./storage";

const mocks = vi.hoisted(() => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("./http", async () => {
  const actual = await vi.importActual<typeof import("./http")>("./http");

  return {
    ...actual,
    fetchWithRetry: mocks.fetchWithRetry,
  };
});

const LOCAL_UPLOAD_LIMIT = 15 * 1024 * 1024;
const REMOTE_IMAGE_LIMIT = 8 * 1024 * 1024;

let uploadRoot: string;

beforeEach(async () => {
  uploadRoot = await mkdtemp(path.join(os.tmpdir(), "tiedan-storage-"));
  process.env.UPLOAD_DIR = uploadRoot;
  vi.clearAllMocks();
});

afterEach(async () => {
  delete process.env.UPLOAD_DIR;
  await rm(uploadRoot, { recursive: true, force: true });
});

describe("extensionFromContentType", () => {
  it("maps image content types to stable extensions", () => {
    expect(extensionFromContentType("image/png")).toBe("png");
    expect(extensionFromContentType("image/jpeg; charset=binary")).toBe("jpg");
    expect(extensionFromContentType("image/svg+xml")).toBeNull();
    expect(extensionFromContentType("image/x-icon")).toBeNull();
  });
});

describe("sanitizeStorageSubdir", () => {
  it("keeps uploads inside a safe relative subdir", () => {
    expect(sanitizeStorageSubdir("favicons")).toBe("favicons");
    expect(sanitizeStorageSubdir("../private")).toBe("private");
    expect(sanitizeStorageSubdir("icons/site logos")).toBe("icons/site-logos");
  });
});

describe("detectImageType", () => {
  it("accepts supported image types and rejects svg with a Chinese error", () => {
    expect(detectImageType("image/jpeg", "photo.jpg")).toEqual({
      contentType: "image/jpeg",
      extension: "jpg",
      output: "jpeg",
    });
    expect(detectImageType("image/png", "photo.png")?.output).toBe("webp");
    expect(detectImageType("image/gif", "motion.gif")?.animated).toBe(true);

    expect(() => detectImageType("image/svg+xml", "x.svg")).toThrow(StorageError);
    expect(() => detectImageType("image/svg+xml", "x.svg")).toThrow("不支持上传 SVG 图片");
  });
});

describe("assertPublicUploadPath", () => {
  it("keeps public file serving inside the public upload area", () => {
    const publicRoot = path.join(getUploadRoot(), "public");

    expect(assertPublicUploadPath(["posts", "a.webp"])).toBe(path.join(publicRoot, "posts", "a.webp"));
    expect(() => assertPublicUploadPath(["..", "private", "a.webp"])).toThrow("文件路径无效");
  });
});

describe("private upload fallback", () => {
  it("does not place the private fallback under anonymously served public uploads", () => {
    delete process.env.UPLOAD_DIR;

    const publicRoot = getPublicUploadRoot();
    const privateRoot = getPrivateUploadRoot();
    const relative = path.relative(publicRoot, privateRoot);

    expect(relative.startsWith("..") || path.isAbsolute(relative)).toBe(true);
    expect(assertPublicUploadPath(["private", "trips", "a.webp"])).not.toBe(path.join(privateRoot, "trips", "a.webp"));
  });
});

describe("assertPrivateUploadPath", () => {
  it("maps private upload URLs into the private area and rejects traversal", () => {
    const privateRoot = path.join(getUploadRoot(), "private");

    expect(assertPrivateUploadPath(["trips", "a.webp"])).toBe(path.join(privateRoot, "trips", "a.webp"));
    expect(() => assertPrivateUploadPath(["..", "public", "a.webp"])).toThrow("文件路径无效");
  });
});

describe("save", () => {
  it("rejects local upload buffers larger than 15MB before image processing", async () => {
    await expect(
      save(Buffer.alloc(LOCAL_UPLOAD_LIMIT + 1), {
        area: "public",
        subdir: "posts",
        contentType: "image/png",
        filename: "too-large.png",
      }),
    ).rejects.toThrow("图片不能超过 15MB");
  });

  it("writes a processed image and a 480px thumbnail", async () => {
    const input = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: "#8c2f39",
      },
    })
      .jpeg({ quality: 95 })
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await save(input, {
      area: "public",
      subdir: "posts/../posts",
      contentType: "image/jpeg",
      filename: "手机照片.jpg",
    });

    expect(result.url).toMatch(/^\/uploads\/posts\/\d+-[a-f0-9-]+\.jpg$/);
    expect(result.thumbUrl).toMatch(/^\/uploads\/posts\/\d+-[a-f0-9-]+-thumb\.jpg$/);

    const publicRoot = path.join(uploadRoot, "public");
    const imagePath = path.join(publicRoot, result.url.replace("/uploads/", ""));
    const thumbPath = path.join(publicRoot, result.thumbUrl.replace("/uploads/", ""));
    const imageMeta = await sharp(await readFile(imagePath)).metadata();
    const thumbMeta = await sharp(await readFile(thumbPath)).metadata();

    expect(imageMeta.orientation).toBeUndefined();
    expect(imageMeta.exif).toBeUndefined();
    expect(Math.max(imageMeta.width ?? 0, imageMeta.height ?? 0)).toBeLessThanOrEqual(2000);
    expect(Math.max(thumbMeta.width ?? 0, thumbMeta.height ?? 0)).toBe(480);
    await expect(stat(thumbPath)).resolves.toBeTruthy();
  });

  it("returns authenticated private file URLs for private uploads", async () => {
    const input = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: "#1f9e86",
      },
    })
      .png()
      .toBuffer();

    const result = await save(input, {
      area: "private",
      subdir: "trips",
      contentType: "image/png",
      filename: "photo.png",
    });

    expect(result.url).toMatch(/^\/api\/files\/private\/trips\/\d+-[a-f0-9-]+\.webp$/);
    expect(result.thumbUrl).toMatch(/^\/api\/files\/private\/trips\/\d+-[a-f0-9-]+-thumb\.webp$/);
  });
});

describe("saveFromUrl", () => {
  it("rejects remote images when content-length is larger than 8MB", async () => {
    mocks.fetchWithRetry.mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          "content-length": String(REMOTE_IMAGE_LIMIT + 1),
          "content-type": "image/png",
        },
      }),
    );

    await expect(saveFromUrl("https://example.com/cover.png", "covers")).rejects.toThrow(
      "远程图片不能超过 8MB",
    );
  });

  it("stops reading a remote image stream once it grows beyond 8MB", async () => {
    let cancelled = false;
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(pulls === 1 ? REMOTE_IMAGE_LIMIT : 1));
      },
      cancel() {
        cancelled = true;
      },
    });

    mocks.fetchWithRetry.mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      }),
    );

    await expect(saveFromUrl("https://example.com/cover.png", "covers")).rejects.toThrow(
      "远程图片不能超过 8MB",
    );
    expect(cancelled).toBe(true);
  });

  it("returns stable error codes for remote image failures", async () => {
    mocks.fetchWithRetry.mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: {
          "content-length": String(REMOTE_IMAGE_LIMIT + 1),
          "content-type": "image/png",
        },
      }),
    );
    await expect(saveFromUrl("https://example.com/too-large.png", "covers")).rejects.toMatchObject({
      code: "REMOTE_TOO_LARGE",
    });

    mocks.fetchWithRetry.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(saveFromUrl("https://example.com/missing.png", "covers")).rejects.toMatchObject({
      code: "REMOTE_DOWNLOAD_FAILED",
    });

    mocks.fetchWithRetry.mockResolvedValueOnce(
      new Response("not an image", {
        status: 200,
        headers: {
          "content-type": "text/html",
        },
      }),
    );
    await expect(saveFromUrl("https://example.com/cover.html", "covers")).rejects.toMatchObject({
      code: "REMOTE_UNSUPPORTED_TYPE",
    });

    mocks.fetchWithRetry.mockRejectedValueOnce(Object.assign(new Error("blocked"), { code: "SSRF_BLOCKED" }));
    await expect(saveFromUrl("http://127.0.0.1/cover.png", "covers")).rejects.toMatchObject({
      code: "REMOTE_SSRF_BLOCKED",
    });
  });
});
