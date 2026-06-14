import Link from "next/link";

import { Button } from "@/components/ui/button";
import { MediaImportWizard } from "./media-import-wizard";

export const dynamic = "force-dynamic";

export default function MediaImportPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-media">书影导入</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">导入豆瓣历史标记</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
            上传豆伴导出的 CSV 或 XLSX，确认列映射后预览，再批量写入收藏册。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/media">返回书影</Link>
        </Button>
      </header>

      <MediaImportWizard />
    </main>
  );
}
