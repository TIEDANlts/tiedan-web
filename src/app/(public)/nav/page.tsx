import { NavBrowser } from "@/app/(public)/nav/nav-browser";
import { getGroupedLinks } from "@/modules/links/queries";

export const dynamic = "force-dynamic";

export default async function NavPage() {
  const groups = await getGroupedLinks();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
      <p className="mb-4 text-sm font-medium text-accent">导航</p>
      <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">常去的地方，收在一页。</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-ink-2">
        工具、资料、服务和那些不想再翻聊天记录找的网址，按分组放好，想起来时直接打开。
      </p>
      <NavBrowser groups={groups} />
    </main>
  );
}
