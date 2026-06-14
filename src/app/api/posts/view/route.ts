import { NextResponse, type NextRequest } from "next/server";

import { recordPostView } from "@/modules/posts/view";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  let slug = "";

  try {
    const body = await request.json();
    slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  } catch {
    return NextResponse.json({ error: "请求格式不正确。" }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ error: "缺少文章 Slug。" }, { status: 400 });
  }

  const result = await recordPostView(slug, clientIp(request));

  return NextResponse.json(result);
}
