import { describe, expect, it } from "vitest";

import {
  formatUploadSize,
  mapUploadError,
  validateImageUploadFile,
  type UploadErrorCode,
} from "./upload-client";

describe("upload client helpers", () => {
  it("formats upload byte sizes for Chinese UI messages", () => {
    expect(formatUploadSize(15 * 1024 * 1024)).toBe("15MB");
    expect(formatUploadSize(1536 * 1024)).toBe("1.5MB");
    expect(formatUploadSize(512 * 1024)).toBe("512KB");
  });

  it("rejects local files larger than 15MB before upload", () => {
    const file = new File([new Uint8Array(1)], "cover.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 15 * 1024 * 1024 + 1 });

    expect(validateImageUploadFile(file)).toEqual({
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "图片不能超过 15MB。",
    });
  });

  it("rejects unsupported local image formats before upload", () => {
    const file = new File([new Uint8Array(1)], "vector.svg", { type: "image/svg+xml" });

    expect(validateImageUploadFile(file)).toEqual({
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "只支持上传 jpeg、png、webp 或 gif 图片。",
    });
  });

  it("maps stable upload error codes to Chinese messages", () => {
    const cases: Array<[UploadErrorCode, string]> = [
      ["FILE_TOO_LARGE", "图片不能超过 15MB。"],
      ["UNSUPPORTED_TYPE", "只支持上传 jpeg、png、webp 或 gif 图片。"],
      ["UNAUTHORIZED", "登录状态已失效，请重新登录后再上传。"],
      ["PROCESSING_FAILED", "图片处理失败，请稍后再试或换一张图片。"],
    ];

    for (const [code, message] of cases) {
      expect(mapUploadError({ code })).toBe(message);
    }
  });
});
