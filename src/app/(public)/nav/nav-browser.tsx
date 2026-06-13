"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import type { LinkRecord } from "@/modules/links/utils";

type LinkGroup = {
  group: string;
  links: LinkRecord[];
};

function Favicon({ link }: { link: LinkRecord }) {
  if (link.icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={link.icon} alt="" className="size-9 rounded-md object-contain" loading="lazy" />
    );
  }

  return (
    <span className="flex size-9 items-center justify-center rounded-md bg-module-links text-sm font-semibold text-white">
      {link.title.slice(0, 1).toUpperCase()}
    </span>
  );
}

function matchesQuery(link: LinkRecord, group: string, query: string) {
  const haystack = [link.title, link.description ?? "", group].join(" ").toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function NavBrowser({ groups }: { groups: LinkGroup[] }) {
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim();
  const filteredGroups = groups
    .map((group) => ({
      group: group.group,
      links: normalizedQuery
        ? group.links.filter((link) => matchesQuery(link, group.group, normalizedQuery))
        : group.links,
    }))
    .filter((group) => group.links.length > 0);
  const hasLinks = groups.some((group) => group.links.length > 0);

  return (
    <div className="mt-10 space-y-10">
      <label className="relative block max-w-xl">
        <span className="sr-only">搜索导航</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、描述或分组"
          className="h-11 rounded-lg bg-surface pl-9 text-base"
        />
      </label>

      {!hasLinks ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-5 py-12 text-center">
          <h2 className="font-serif text-2xl text-ink">还没有收进来的链接。</h2>
          <p className="mt-3 text-sm leading-6 text-ink-2">
            登录后台添加第一批常去的网站后，这里会按分组整理成一页干净的导航。
          </p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-5 py-12 text-center">
          <h2 className="font-serif text-2xl text-ink">没找到对应的链接。</h2>
          <p className="mt-3 text-sm leading-6 text-ink-2">换个关键词试试，或者把搜索框清空。</p>
        </div>
      ) : (
        filteredGroups.map((group) => (
          <section key={group.group} className="space-y-4">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
              <h2 className="font-serif text-3xl text-ink">{group.group}</h2>
              <span className="text-sm text-ink-3">{group.links.length} 个链接</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-lg border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Favicon link={link} />
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-ink group-hover:text-accent">
                        {link.title}
                      </h3>
                      {link.description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-2">
                          {link.description}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-ink-3">打开 {new URL(link.url).hostname}</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
