import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { save, StorageError, type StorageArea } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录后再上传文件。" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的图片。" }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
