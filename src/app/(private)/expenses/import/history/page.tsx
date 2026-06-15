import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getExpenseImportHistory } from "@/modules/expenses/queries";

export const dynamic = "force-dynamic";

const platformLabels: Record<string, string> = {
  alipay: "支付宝",
  wechat: "微信",
};

export default async function ExpenseImportHistoryPage() {
  const batches = await getExpenseImportHistory();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-expenses">账单导入</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">导入历史</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">查看每一次账单导入的文件、平台和写入结果。</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/expenses/import">继续导入</Link>
        </Button>
      </header>

      {batches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
          <h2 className="font-heading text-xl font-semibold text-ink">还没有导入记录。</h2>
          <p className="mt-2 text-sm leading-6 text-ink-2">完成一次微信或支付宝账单导入后，这里会留下批次记录。</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-surface-2 text-ink-2">
              <tr>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">文件</th>
                <th className="px-4 py-3">平台</th>
                <th className="px-4 py-3">总行数</th>
                <th className="px-4 py-3">写入</th>
                <th className="px-4 py-3">跳过</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-t border-border">
                  <td className="px-4 py-3">{batch.createdAt}</td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-module-expenses hover:underline" href={`/expenses/import/result/${batch.id}`}>
                      {batch.filename}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{platformLabels[batch.platform] ?? batch.platform}</td>
                  <td className="px-4 py-3">{batch.total}</td>
                  <td className="px-4 py-3 text-module-expenses">{batch.inserted}</td>
                  <td className="px-4 py-3 text-ink-3">{batch.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
