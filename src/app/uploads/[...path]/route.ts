import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

import { assertPublicUploadPath, contentTypeForPublicPath, StorageError } from "@/lib/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  try {
    const filePath = assertPublicUploadPath(path);
    const file = await readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "content-type": contentTypeForPublicPath(filePath),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof StorageError || (error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Not found", { status: 404 });
    }

    throw error;
  }
}
