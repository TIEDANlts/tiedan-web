import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { assertPrivateUploadPath, contentTypeForPublicPath, StorageError } from "@/lib/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();

  if (!session?.user) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { path } = await context.params;

  try {
    const filePath = assertPrivateUploadPath(path);
    const fileStat = await stat(filePath);
    const stream = createReadStream(filePath);

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "content-type": contentTypeForPublicPath(filePath),
        "content-length": String(fileStat.size),
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof StorageError || (error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Not found", { status: 404 });
    }

    throw error;
  }
}
