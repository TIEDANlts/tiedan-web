export type UploadErrorCode =
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "UNAUTHORIZED"
  | "MISSING_FILE"
  | "PROCESSING_FAILED";

export type UploadErrorPayload = {
  code?: UploadErrorCode;
  error?: string;
};

export type UploadResult = {
  url: string;
  thumbUrl: string;
};

type UploadOptions = {
  area: "public" | "private";
  subdir: string;
};

export const CLIENT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  FILE_TOO_LARGE: "图片不能超过 15MB。",
  UNSUPPORTED_TYPE: "只支持上传 jpeg、png、webp 或 gif 图片。",
  UNAUTHORIZED: "登录状态已失效，请重新登录后再上传。",
  MISSING_FILE: "请选择要上传的图片。",
  PROCESSING_FAILED: "图片处理失败，请稍后再试或换一张图片。",
};

export function formatUploadSize(bytes: number) {
  const kilobytes = bytes / 1024;
  const megabytes = kilobytes / 1024;

  if (megabytes >= 1) {
    return `${Number.isInteger(megabytes) ? megabytes : Number(megabytes.toFixed(1))}MB`;
  }

  return `${Math.ceil(kilobytes)}KB`;
}

export function mapUploadError(payload: UploadErrorPayload | null | undefined, fallback = UPLOAD_ERROR_MESSAGES.PROCESSING_FAILED) {
  if (payload?.code && payload.code in UPLOAD_ERROR_MESSAGES) {
    return UPLOAD_ERROR_MESSAGES[payload.code];
  }

  return payload?.error || fallback;
}

export function validateImageUploadFile(file: File | null | undefined) {
  if (!file) {
    return { ok: false as const, code: "MISSING_FILE" as const, message: UPLOAD_ERROR_MESSAGES.MISSING_FILE };
  }

  if (file.size > CLIENT_UPLOAD_MAX_BYTES) {
    return { ok: false as const, code: "FILE_TOO_LARGE" as const, message: UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  const type = file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase();
  const hasSupportedExtension = extension ? ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) : false;

  if ((!type || !ACCEPTED_IMAGE_TYPES.has(type)) && !hasSupportedExtension) {
    return { ok: false as const, code: "UNSUPPORTED_TYPE" as const, message: UPLOAD_ERROR_MESSAGES.UNSUPPORTED_TYPE };
  }

  return { ok: true as const };
}

async function readUploadPayload(response: Response) {
  try {
    return (await response.json()) as UploadErrorPayload & Partial<UploadResult>;
  } catch {
    return null;
  }
}

export async function uploadImageFile(file: File, options: UploadOptions): Promise<UploadResult> {
  const validation = validateImageUploadFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const formData = new FormData();
  formData.set("file", file);
  formData.set("area", options.area);
  formData.set("subdir", options.subdir);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const body = await readUploadPayload(response);

  if (!response.ok) {
    throw new Error(mapUploadError(body));
  }

  if (!body?.url || !body.thumbUrl) {
    throw new Error(UPLOAD_ERROR_MESSAGES.PROCESSING_FAILED);
  }

  return {
    url: body.url,
    thumbUrl: body.thumbUrl,
  };
}
