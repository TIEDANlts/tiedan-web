import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { searchNominatim } from "@/modules/trips/nominatim";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录后再搜索地点。" }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";

  try {
    return NextResponse.json({ results: await searchNominatim(query) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "地点搜索暂时不可用。" },
      { status: 429 },
    );
  }
}
