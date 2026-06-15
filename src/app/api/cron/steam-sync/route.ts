import { NextResponse, type NextRequest } from "next/server";

import { fetchWithRetry } from "@/lib/http";
import { extractBearerToken, secureTokenEqual } from "@/lib/secure-compare";
import { syncSteamLibrary } from "@/modules/games/steam";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function failUrl(url: string) {
  return `${url.replace(/\/+$/, "")}/fail`;
}

async function pingHealthcheck(success: boolean) {
  const healthcheckUrl = process.env.HEALTHCHECKS_STEAM_URL?.trim();
  if (!healthcheckUrl) {
    return;
  }

  const targetUrl = success ? healthcheckUrl : failUrl(healthcheckUrl);

  try {
    await fetchWithRetry(targetUrl, {
      cache: "no-store",
      retries: 0,
      timeoutMs: 5_000,
    });
  } catch {
    // Healthchecks ping failure must not hide the sync result from cron.
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!secret || !token || !secureTokenEqual(token, secret)) {
    return unauthorized();
  }

  try {
    const result = await syncSteamLibrary();
    await pingHealthcheck(true);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await pingHealthcheck(false);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Steam 同步失败。",
      },
      { status: 500 },
    );
  }
}
