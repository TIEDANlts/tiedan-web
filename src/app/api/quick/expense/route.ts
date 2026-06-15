import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { buildQuickExpenseCreateData, parseQuickExpenseText, quickExpenseRateLimiter } from "@/modules/expenses/quick";

function json(data: unknown, status: number) {
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  const configuredToken = process.env.QUICK_ADD_TOKEN;
  if (!configuredToken) {
    return json({ ok: false, message: "快捷记账接口未启用。" }, 404);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token || token !== configuredToken) {
    return json({ ok: false, message: "快捷记账 token 不正确。" }, 401);
  }

  const limit = quickExpenseRateLimiter.consume(token);
  if (!limit.ok) {
    return json({ ok: false, message: "请求太频繁，请稍后再试。", retryAfterSeconds: limit.retryAfterSeconds }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "请求体必须是 JSON。" }, 400);
  }

  const parsed = parseQuickExpenseText((body as { text?: unknown })?.text);
  if (!parsed.ok) {
    return json({ ok: false, message: parsed.error }, 400);
  }

  const transaction = await db.transaction.create({
    data: await buildQuickExpenseCreateData(parsed.data),
    include: { category: { select: { id: true, name: true, icon: true } } },
  });

  return json(
    {
      ok: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount.toFixed(2),
        merchant: transaction.merchant,
        note: transaction.note,
        platform: transaction.platform,
        direction: transaction.direction,
        category: transaction.category,
        txnTime: transaction.txnTime.toISOString(),
      },
    },
    201,
  );
}
