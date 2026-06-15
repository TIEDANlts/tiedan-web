import { Download } from "lucide-react";

import { SettingsForm } from "@/app/(private)/admin/settings/settings-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getProfileSettings } from "@/modules/settings/settings";

export const metadata = {
  title: "设置",
};

export default async function AdminSettingsPage() {
  const profile = await getProfileSettings();

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <PageHeader
        eyebrow="设置"
        title="站点资料与数据"
        description="这里维护公开首页的头像、名字和简介，也可以导出当前数据库里的核心数据。"
      />

      <div className="mt-6 grid gap-5">
        <SettingsForm profile={profile} />

        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">导出全站数据</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-2">
                导出 Game、MediaItem、Trip、Post、Transaction、ExpenseCategory、Todo、SpecialDay、Link 和 Activity 为 JSON zip。
                图片不打包，JSON 中保留 URL/key；图片随服务器 uploads 卷与每日备份保存。
              </p>
            </div>
            <Button asChild variant="outline" className="sm:shrink-0">
              <a href="/api/admin/export">
                <Download className="size-4" />
                导出全站数据
              </a>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
