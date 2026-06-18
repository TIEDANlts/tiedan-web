"use client";

import { AlertCircle, BookOpen, Clapperboard, Plus, Search, Star, Tv, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useActionState, useEffect, useId, useState, useTransition } from "react";

import { RatingStars } from "@/components/rating-stars";
import { StatusBadge } from "@/components/status-badge";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createMediaItemAction,
  localizeMediaMetadataCoverAction,
  searchMediaMetadataAction,
} from "@/modules/media/actions";
import { initialMediaActionState, type MediaActionState } from "@/modules/media/action-state";
import type { MediaMetadataItem, MediaMetadataResult } from "@/modules/media/metadata";
import type { MediaListItem, MediaPageData } from "@/modules/media/queries";
import {
  type MediaFilters,
  type MediaStatusValue,
  type MediaTypeValue,
  mediaCreatorLabels,
  mediaStatusLabel,
  mediaStatusMapForType,
  mediaStatuses,
  mediaTypeLabels,
  mediaTypes,
} from "@/modules/media/utils";
import { CoverInput, FieldError, MediaCover, fieldClass } from "./media-form-parts";

type MediaFormAction = (previousState: MediaActionState, formData: FormData) => Promise<MediaActionState>;

const typeIcons = {
  BOOK: BookOpen,
  MOVIE: Clapperboard,
  TV: Tv,
} as const satisfies Record<MediaTypeValue, ComponentType<{ className?: string }>>;

function createHref(pathname: string, filters: MediaFilters, patch: Partial<MediaFilters>) {
  const nextFilters = { ...filters, ...patch };
  const params = new URLSearchParams();

  if (nextFilters.type !== "BOOK") {
    params.set("type", nextFilters.type);
  }
  if (nextFilters.status !== "ALL") {
    params.set("status", nextFilters.status);
  }
  if (nextFilters.tags.length > 0) {
    params.set("tags", nextFilters.tags.join(","));
  }
  if (nextFilters.query) {
    params.set("q", nextFilters.query);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function StatsBadge({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-module-media/35 bg-module-media/12 px-4 py-3 text-module-media">
      <span className="flex size-9 items-center justify-center rounded-md bg-module-media text-white">{icon}</span>
      <span>
        <span className="block text-xs text-ink-2">{label}</span>
        <span className="font-heading text-xl font-semibold text-ink">{value}</span>
      </span>
    </div>
  );
}

function TypeTabs({ data }: { data: MediaPageData }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {mediaTypes.map((type) => {
        const Icon = typeIcons[type];
        const active = data.filters.type === type;

        return (
          <Link
            key={type}
            href={createHref(pathname, data.filters, { type, status: "ALL", tags: [] })}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
              active
                ? "border-module-media bg-module-media text-white"
                : "border-border bg-surface text-ink-2 hover:border-module-media/40 hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {mediaTypeLabels[type]}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/20 text-white" : "bg-surface-2 text-ink-3")}>
              {data.typeCounts[type] ?? 0}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function StatusTabs({ filters, counts }: { filters: MediaFilters; counts: MediaPageData["statusCounts"] }) {
  const pathname = usePathname();
  const statuses: Array<["ALL" | MediaStatusValue, string]> = [
    ["ALL", "全部"],
    ...mediaStatuses.map((status) => [status, mediaStatusLabel(filters.type, status)] as [MediaStatusValue, string]),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {statuses.map(([status, label]) => {
        const active = filters.status === status;
        return (
          <Link
            key={status}
            href={createHref(pathname, filters, { status })}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
              active
                ? "border-module-media bg-module-media text-white"
                : "border-border bg-surface text-ink-2 hover:border-module-media/40 hover:text-ink",
            )}
          >
            {label}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/20 text-white" : "bg-surface-2 text-ink-3")}>
              {counts[status] ?? 0}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function SearchBox({ initialQuery, onSubmit }: { initialQuery: string; onSubmit: (query: string) => void }) {
  const [query, setQuery] = useState(initialQuery);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(query.trim());
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索标题或原名"
        className="h-11 bg-surface pl-9"
      />
    </form>
  );
}

function FiltersBar({ data }: { data: MediaPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function push(patch: Partial<MediaFilters>) {
    startTransition(() => {
      router.push(createHref(pathname, data.filters, patch));
    });
  }

  function toggleTag(tag: string) {
    const nextTags = data.filters.tags.includes(tag)
      ? data.filters.tags.filter((item) => item !== tag)
      : [...data.filters.tags, tag];
    push({ tags: nextTags });
  }

  const hasFilters = data.filters.tags.length > 0 || data.filters.query || data.filters.status !== "ALL";

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <StatusTabs filters={data.filters} counts={data.statusCounts} />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <SearchBox key={data.filters.query} initialQuery={data.filters.query} onSubmit={(query) => push({ query })} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-11 justify-between">
              标签{data.filters.tags.length > 0 ? ` · ${data.filters.tags.length}` : ""}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
            {data.tags.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-2">这个类型还没有可筛选的标签。</p>
            ) : (
              data.tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={data.filters.tags.includes(tag)}
                  onCheckedChange={() => toggleTag(tag)}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          {data.filters.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full bg-module-media/12 px-3 py-1 text-module-media"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
          <Button asChild variant="ghost" size="sm">
            <Link href={createHref(pathname, data.filters, { status: "ALL", tags: [], query: "" })}>清空筛选</Link>
          </Button>
          {isPending ? <span className="text-xs text-ink-3">正在筛选...</span> : <span className="text-xs text-ink-3">筛选会保存在当前网址里。</span>}
        </div>
      ) : null}
    </section>
  );
}

function MetadataSearchPanel({
  type,
  onPick,
}: {
  type: MediaTypeValue;
  onPick: (item: MediaMetadataItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MediaMetadataResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function searchOnline() {
    const keyword = query.trim();
    if (!keyword) {
      setMessage("请输入要搜索的标题。");
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const nextResult = await searchMediaMetadataAction(type, keyword);
      setResult(nextResult);
      setMessage(nextResult.message ?? (nextResult.results.length > 0 ? null : "没有找到匹配结果，可以手动填写。"));
    });
  }

  function pick(item: MediaMetadataItem) {
    setMessage(null);
    startTransition(async () => {
      const localized = await localizeMediaMetadataCoverAction(item);
      if (!localized.ok) {
        setMessage(localized.message);
        return;
      }

      onPick(localized.item);
      setMessage(localized.warning ?? `已从${localized.item.source === "tmdb" ? " TMDB" : " NeoDB"}填入表单。`);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2 p-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchOnline();
              }
            }}
            placeholder={`联网搜索${mediaTypeLabels[type]}`}
            className="bg-surface pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={searchOnline} disabled={isPending}>
          {isPending ? "搜索中..." : "搜索"}
        </Button>
      </div>

      {message ? (
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <AlertCircle className="size-4 text-module-media" />
          {message}
        </p>
      ) : null}

      {result?.results.length ? (
        <div className="grid gap-2">
          {result.results.slice(0, 5).map((item) => (
            <button
              key={`${item.source}-${item.sourceId}`}
              type="button"
              onClick={() => pick(item)}
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded-md border border-border bg-surface p-2 text-left transition hover:border-module-media/50"
            >
              <div className="aspect-[2/3] overflow-hidden rounded bg-module-media/15">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-module-media">
                    {item.title.slice(0, 1)}
                  </div>
                )}
              </div>
              <span className="min-w-0 py-1">
                <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                <span className="mt-1 block truncate text-xs text-ink-3">
                  {[item.year, item.creator, item.source === "tmdb" ? "TMDB" : "NeoDB"].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MediaForm({
  action,
  initialType,
  onDone,
}: {
  action: MediaFormAction;
  initialType: MediaTypeValue;
  onDone?: () => void;
}) {
  const router = useRouter();
  const creatorListId = useId();
  const [state, formAction, pending] = useActionState(action, initialMediaActionState);
  const [type, setType] = useState<MediaTypeValue>(initialType);
  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [year, setYear] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [doubanId, setDoubanId] = useState("");
  const [tmdbId, setTmdbId] = useState("");
  const [isbn, setIsbn] = useState("");
  const [status, setStatus] = useState<MediaStatusValue>("WISHLIST");
  const [rating, setRating] = useState<number | null>(null);
  const [releaseDate, setReleaseDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone?.();
    }
  }, [onDone, router, state.ok]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="rating" value={rating ?? ""} />
      <input type="hidden" name="tags" value={tags.join(",")} />
      <input type="hidden" name="doubanId" value={doubanId} />
      <input type="hidden" name="tmdbId" value={tmdbId} />
      <input type="hidden" name="isbn" value={isbn} />

      <MetadataSearchPanel
        type={type}
        onPick={(item) => {
          setType(item.type);
          setTitle(item.title);
          setOriginalTitle(item.originalTitle ?? "");
          setCreator(item.creator ?? "");
          setYear(item.year ? String(item.year) : "");
          setCoverUrl(item.coverUrl ?? "");
          setDoubanId(item.doubanId ?? "");
          setTmdbId(item.tmdbId ?? "");
          setIsbn(item.isbn ?? "");
          setReleaseDate(item.releaseDate ?? "");
        }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldClass()}>
          <span>类型</span>
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as MediaTypeValue)}
            className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {mediaTypes.map((typeValue) => (
              <option key={typeValue} value={typeValue}>
                {mediaTypeLabels[typeValue]}
              </option>
            ))}
          </select>
          <FieldError>{state.errors?.type}</FieldError>
        </label>

        <label className={fieldClass()}>
          <span>标题</span>
          <Input name="title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          <FieldError>{state.errors?.title}</FieldError>
        </label>

        <label className={fieldClass()}>
          <span>原名</span>
          <Input name="originalTitle" value={originalTitle} onChange={(event) => setOriginalTitle(event.target.value)} />
        </label>

        <label className={fieldClass()}>
          <span>{mediaCreatorLabels[type]}</span>
          <Input name="creator" list={creatorListId} value={creator} onChange={(event) => setCreator(event.target.value)} />
          <datalist id={creatorListId}>
            {type === "BOOK" ? <option value="作者待补" /> : <option value="导演待补" />}
          </datalist>
        </label>

        <label className={fieldClass()}>
          <span>年份</span>
          <Input name="year" type="number" min="1900" max="2100" value={year} onChange={(event) => setYear(event.target.value)} />
          <FieldError>{state.errors?.year}</FieldError>
        </label>

        <label className={fieldClass()}>
          <span>状态</span>
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as MediaStatusValue)}
            className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {mediaStatuses.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {mediaStatusLabel(type, statusValue)}
              </option>
            ))}
          </select>
          <FieldError>{state.errors?.status}</FieldError>
        </label>
      </div>

      {status === "WISHLIST" ? (
        <label className={fieldClass()}>
          <span>{type === "BOOK" ? "出版日期" : "上映日期"}</span>
          <Input name="releaseDate" type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} />
          <FieldError>{state.errors?.releaseDate}</FieldError>
        </label>
      ) : null}

      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">评分</span>
        <div className="flex flex-wrap items-center gap-3">
          <RatingStars value={rating ?? 0} editable onChange={setRating} />
          <Button type="button" variant="ghost" size="sm" onClick={() => setRating(null)}>
            清除评分
          </Button>
        </div>
        <FieldError>{state.errors?.rating}</FieldError>
      </div>

      <CoverInput title={title} coverUrl={coverUrl} setCoverUrl={setCoverUrl} error={state.errors?.coverUrl} />

      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">标签</span>
        <TagInput value={tags} onChange={setTags} placeholder="输入标签后回车" />
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}
      {state.warning ? <p className="text-sm text-module-media">{state.warning}</p> : null}
      <FieldError>{state.errors?.form}</FieldError>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "正在保存..." : "保存"}
        </Button>
      </div>
    </form>
  );
}

function AddMediaDialog({ initialType }: { initialType: MediaTypeValue }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          添加书影
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>添加书影条目</DialogTitle>
          <DialogDescription>可以联网搜索补全，也可以直接手动填写。</DialogDescription>
        </DialogHeader>
        <MediaForm action={createMediaItemAction} initialType={initialType} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function MediaCard({ item }: { item: MediaListItem }) {
  return (
    <Link
      href={`/media/${item.id}`}
      className="group block min-w-0 rounded-lg border border-border bg-surface text-left shadow-sm transition hover:-translate-y-0.5 hover:border-module-media/45 hover:shadow-md"
    >
      <article className="overflow-hidden rounded-lg">
        <div className="relative aspect-[2/3] overflow-hidden bg-surface-2">
          <MediaCover item={item} className="transition duration-300 group-hover:scale-[1.03]" />
          {item.year ? (
            <span className="absolute right-2 top-2 rounded-full bg-surface/90 px-2 py-1 text-xs font-semibold text-ink shadow-sm">
              {item.year}
            </span>
          ) : null}
        </div>
        <div className="space-y-3 p-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-ink">{item.title}</h2>
            <p className="mt-1 truncate text-xs text-ink-3">
              {item.creator ?? item.originalTitle ?? (item.finishedAt ? `完成于 ${item.finishedAt}` : "未填写作者/导演")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={item.status} map={mediaStatusMapForType(item.type)} />
            {item.rating ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-2">
                <Star className="size-3.5 fill-current text-primary" />
                {item.rating}/10
              </span>
            ) : (
              <span className="text-xs text-ink-3">未评分</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyMedia({ type }: { type: MediaTypeValue }) {
  const Icon = typeIcons[type];

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-14 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-module-media/12 text-module-media">
        <Icon className="size-7" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-semibold text-ink">这一格还空着。</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-2">
        先加入几条{mediaTypeLabels[type]}记录，之后可以用状态、标签和标题把它们翻出来。
      </p>
    </div>
  );
}

export function MediaLibrary({ data }: { data: MediaPageData }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-media">书影</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">书影收藏册</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
            记录想读、在读、读过的书，也记录想看、在看和看过的电影剧集。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/media/import">
              <Upload className="size-4" />
              导入
            </Link>
          </Button>
          <AddMediaDialog initialType={data.filters.type} />
        </div>
      </header>

      <TypeTabs data={data} />

      <div className="flex flex-wrap gap-3">
        <StatsBadge icon={<BookOpen className="size-5" />} label={`${data.stats.year} 年读完`} value={`${data.stats.booksDone} 本`} />
        <StatsBadge icon={<Clapperboard className="size-5" />} label={`${data.stats.year} 年看完电影`} value={`${data.stats.moviesDone} 部`} />
        <StatsBadge icon={<Tv className="size-5" />} label={`${data.stats.year} 年追完剧`} value={`${data.stats.tvDone} 部`} />
      </div>

      <FiltersBar data={data} />

      {data.items.length === 0 ? (
        <EmptyMedia type={data.filters.type} />
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {data.items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
