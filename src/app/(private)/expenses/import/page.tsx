import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ExpenseImportWizard } from "./expense-import-wizard";

export const dynamic = "force-dynamic";

export default function ExpenseImportPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-expenses">账单导入</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">导入微信 / 支付宝账单</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
            上传官方 CSV，预览解析结果和自动分类，再一次性写入消费流水。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/expenses/import/history">导入历史</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/expenses">返回流水</Link>
          </Button>
        </div>
      </header>

      <ExpenseImportWizard />
    </main>
  );
}
