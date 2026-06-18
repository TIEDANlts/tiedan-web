import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { assertLocalUploadSize, save, StorageError, type StorageArea } from "@/lib/storage";

function uploadError(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return uploadError("UNAUTHORIZED", "请先登录后再上传文件。", 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return uploadError("MISSING_FILE", "请选择要上传的图片。", 400);
    }

    try {
      assertLocalUploadSize(file.size);
    } catch (error) {
      if (error instanceof StorageError) {
        return uploadError(error.code, error.message, 413);
      }

      throw error;
    }

    const requestedArea = String(formData.get("area") ?? "public");
    const area: StorageArea = requestedArea === "private" ? "private" : "public";
    const subdir = String(formData.get("subdir") ?? "posts");
    const result = await save(Buffer.from(await file.arrayBuffer()), {
      area,
      subdir,
      contentType: file.type,
      filename: file.name,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StorageError) {
      const status = error.code === "FILE_TOO_LARGE" ? 413 : 400;
      return uploadError(error.code, error.message, status);
    }

    return uploadError("PROCESSING_FAILED", "图片处理失败，请稍后再试或换一张图片。", 500);
  }
}
