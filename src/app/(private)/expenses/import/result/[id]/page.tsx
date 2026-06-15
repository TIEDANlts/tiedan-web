import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getExpenseImportBatch } from "@/modules/expenses/queries";

export const dynamic = "force-dynamic";

const platformLabels: Record<string, string> = {
  alipay: "支付宝",
  wechat: "微信",
};

export default async function ExpenseImportResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getExpenseImportBatch(id);

  if (!batch) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-module-expenses">导入完成</p>
        <h1 className="font-heading text-3xl font-semibold text-ink">{batch.filename}</h1>
        <p className="mt-3 text-sm leading-7 text-ink-2">
          {platformLabels[batch.platform] ?? batch.platform}账单已处理，完成时间 {batch.createdAt}。
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 p-4">
            <p className="text-sm text-ink-2">解析行数</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-ink">{batch.total}</p>
          </div>
          <div className="rounded-lg bg-module-expenses/12 p-4 text-module-expenses">
            <p className="text-sm">写入流水</p>
            <p className="mt-2 font-heading text-2xl font-semibold">{batch.inserted}</p>
          </div>
          <div className="rounded-lg bg-surface-2 p-4">
            <p className="text-sm text-ink-2">跳过</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-ink">{batch.skipped}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/expenses/import/history">查看历史</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/expenses/import">继续导入</Link>
          </Button>
          <Button asChild>
            <Link href="/expenses">回到流水</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
