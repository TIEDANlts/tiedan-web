"use client";

import { Clock3, Gamepad2, ImagePlus, Plus, RefreshCw, Search, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useActionState, useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { MarkdownEditor } from "@/components/markdown-editor";
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
  advanceGameStatusAction,
  createGameAction,
  syncSteamLibraryAction,
  updateGameAction,
  type GameActionState,
} from "@/modules/games/actions";
import type { GameListItem, GamesPageData } from "@/modules/games/queries";
import {
  type GameFilters,
  type GameSort,
  type GameStatusValue,
  gameSortLabels,
  gameSorts,
  gameStatusBadgeMap,
  gameStatusFlowLabel,
  gameStatusLabels,
  gameStatuses,
  nextGameStatus,
} from "@/modules/games/utils";

const initialActionState: GameActionState = {
  ok: false,
  message: null,
};

const platformPresets = ["Steam", "Switch", "PS5", "Xbox", "Mobile", "PC"] as const;

type GameFormAction = (previousState: GameActionState, formData: FormData) => Promise<GameActionState>;

function formatHours(minutes: number) {
  if (minutes <= 0) {
    return "0 小时";
  }

  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`;
}

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

function fieldClass() {
  return "block space-y-2 text-sm font-medium text-ink";
}

async function uploadGameCover(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("area", "public");
  formData.set("subdir", "games");

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const body = (await response.json()) as { url?: string; error?: string };

  if (!response.ok || !body.url) {
    throw new Error(body.error || "封面上传失败。");
  }

  return body.url;
}

function GameCover({ game, className }: { game: Pick<GameListItem, "name" | "coverUrl">; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = Boolean(game.coverUrl && failedUrl === game.coverUrl);

  if (game.coverUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={game.coverUrl}
        alt={game.name}
        className={cn("h-full w-full object-cover", className)}
        loading="lazy"
        onError={() => setFailedUrl(game.coverUrl)}
      />
    );
  }

  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-module-games text-5xl font-semibold text-white", className)}>
      {game.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function SearchBox({
  initialQuery,
  onSubmit,
}: {
  initialQuery: string;
  onSubmit: (query: string) => void;
}) {
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
        placeholder="搜索游戏名"
        className="h-11 bg-surface pl-9"
      />
    </form>
  );
}

function createHref(pathname: string, filters: GameFilters, patch: Partial<GameFilters>) {
  const nextFilters = { ...filters, ...patch };
  const params = new URLSearchParams();

  if (nextFilters.status !== "ALL") {
    params.set("status", nextFilters.status);
  }
  if (nextFilters.platform) {
    params.set("platform", nextFilters.platform);
  }
  if (nextFilters.tags.length > 0) {
    params.set("tags", nextFilters.tags.join(","));
  }
  if (nextFilters.query) {
    params.set("q", nextFilters.query);
  }
  if (nextFilters.sort !== "lastPlayed") {
    params.set("sort", nextFilters.sort);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function StatsBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-module-games/35 bg-module-games/12 px-4 py-3 text-module-games">
      <span className="flex size-9 items-center justify-center rounded-md bg-module-games text-white">{icon}</span>
      <span>
        <span className="block text-xs text-ink-2">{label}</span>
        <span className="font-heading text-xl font-semibold text-ink">{value}</span>
      </span>
    </div>
  );
}

function StatusTabs({ filters, counts }: { filters: GameFilters; counts: GamesPageData["statusCounts"] }) {
  const pathname = usePathname();
  const statuses: Array<["ALL" | GameStatusValue, string]> = [
    ["ALL", "全部"],
    ...gameStatuses.map((status) => [status, gameStatusLabels[status]] as [GameStatusValue, string]),
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
                ? "border-module-games bg-module-games text-white"
                : "border-border bg-surface text-ink-2 hover:border-module-games/40 hover:text-ink",
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

function FiltersBar({ data }: { data: GamesPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function push(patch: Partial<GameFilters>) {
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

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <StatusTabs filters={data.filters} counts={data.statusCounts} />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
        <SearchBox key={data.filters.query} initialQuery={data.filters.query} onSubmit={(query) => push({ query })} />

        <label className="grid gap-1 text-xs font-medium text-ink-2">
          平台
          <select
            value={data.filters.platform}
            onChange={(event) => push({ platform: event.target.value })}
            className="h-11 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            <option value="">全部平台</option>
            {data.platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-11 justify-between">
              标签{data.filters.tags.length > 0 ? ` · ${data.filters.tags.length}` : ""}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
            {data.tags.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-2">还没有可筛选的标签。</p>
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

        <label className="grid gap-1 text-xs font-medium text-ink-2">
          排序
          <select
            value={data.filters.sort}
            onChange={(event) => push({ sort: event.target.value as GameSort })}
            className="h-11 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {gameSorts.map((sort) => (
              <option key={sort} value={sort}>
                {gameSortLabels[sort]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.filters.tags.length > 0 || data.filters.platform || data.filters.query || data.filters.sort !== "lastPlayed" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          {data.filters.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full bg-module-games/12 px-3 py-1 text-module-games"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
          <Button asChild variant="ghost" size="sm">
            <Link href={pathname}>清空筛选</Link>
          </Button>
          {isPending || searchParams.toString() ? <span className="text-xs text-ink-3">筛选会保存在当前网址里。</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function CoverInput({
  coverUrl,
  setCoverUrl,
  error,
}: {
  coverUrl: string;
  setCoverUrl: (value: string) => void;
  error?: string;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError(null);
    startUpload(async () => {
      try {
        setCoverUrl(await uploadGameCover(file));
      } catch (uploadError) {
        setUploadError(uploadError instanceof Error ? uploadError.message : "封面上传失败。");
      } finally {
        event.target.value = "";
      }
    });
  }

  return (
    <div className="space-y-2">
      <label className={fieldClass()}>
        <span>封面</span>
        <Input
          name="coverUrl"
          value={coverUrl}
          onChange={(event) => setCoverUrl(event.target.value)}
          placeholder="/uploads/games/cover.webp 或 https://..."
        />
      </label>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
        <ImagePlus className="size-4" />
        {isUploading ? "正在上传..." : "上传封面"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={onFileChange} />
      </label>
      <FieldError>{error}</FieldError>
      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
      {coverUrl ? (
        <div className="mt-2 aspect-[16/9] overflow-hidden rounded-lg border border-border bg-surface-2">
          <GameCover game={{ name: "封面", coverUrl }} />
        </div>
      ) : null}
    </div>
  );
}

function GameForm({
  game,
  action,
  onDone,
}: {
  game?: GameListItem;
  action: GameFormAction;
  onDone?: () => void;
}) {
  const router = useRouter();
  const platformListId = useId();
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [name, setName] = useState(game?.name ?? "");
  const [platform, setPlatform] = useState(game?.platform ?? "PC");
  const [coverUrl, setCoverUrl] = useState(game?.coverUrl ?? "");
  const [status, setStatus] = useState<GameStatusValue>(game?.status ?? "BACKLOG");
  const [rating, setRating] = useState<number | null>(game?.rating ?? null);
  const [playtimeHours, setPlaytimeHours] = useState(game ? String(Math.round((game.playtimeMin / 60) * 10) / 10) : "0");
  const [lastPlayedAt, setLastPlayedAt] = useState(game?.lastPlayedInput ?? "");
  const [tags, setTags] = useState<string[]>(game?.tags ?? []);
  const [reviewMd, setReviewMd] = useState(game?.reviewMd ?? "");
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [flowWarning, setFlowWarning] = useState<string | null>(null);
  const [isFlowPending, startFlow] = useTransition();
  const nextStatus = game ? nextGameStatus(status) : null;
  const markdownPreview = useMemo(
    () => (
      <div className="min-h-48 whitespace-pre-wrap rounded-lg bg-surface-2 p-4 text-sm leading-7 text-ink-2">
        {reviewMd.trim() || "预览会显示在这里。"}
      </div>
    ),
    [reviewMd],
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      if (!game) {
        onDone?.();
      }
    }
  }, [game, onDone, router, state.ok]);

  function advanceStatus() {
    if (!game || !nextStatus) {
      return;
    }

    setFlowMessage(null);
    setFlowWarning(null);
    startFlow(async () => {
      const result = await advanceGameStatusAction(game.id);
      setFlowMessage(result.message);
      setFlowWarning(result.warning ?? null);
      if (result.ok) {
        setStatus(nextStatus);
        router.refresh();
      }
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {game ? <input type="hidden" name="id" value={game.id} /> : null}
      <input type="hidden" name="rating" value={rating ?? ""} />
      <input type="hidden" name="tags" value={tags.join(",")} />
      <input type="hidden" name="reviewMd" value={reviewMd} />

      {game ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-module-games/10 p-3">
          <StatusBadge value={status} map={gameStatusBadgeMap} />
          {nextStatus ? (
            <Button type="button" size="sm" onClick={advanceStatus} disabled={isFlowPending}>
              {isFlowPending ? "正在更新..." : gameStatusFlowLabel(status)}
            </Button>
          ) : null}
          {flowMessage ? <span className="text-sm text-ink-2">{flowMessage}</span> : null}
          {flowWarning ? <span className="text-sm text-module-games">{flowWarning}</span> : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldClass()}>
          <span>名称</span>
          <Input name="name" value={name} onChange={(event) => setName(event.target.value)} autoFocus={!game} />
          <FieldError>{state.errors?.name}</FieldError>
        </label>

        <label className={fieldClass()}>
          <span>平台</span>
          <Input
            name="platform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            list={platformListId}
          />
          <datalist id={platformListId}>
            {platformPresets.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
          <FieldError>{state.errors?.platform}</FieldError>
        </label>

        <label className={fieldClass()}>
          <span>状态</span>
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as GameStatusValue)}
            className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {gameStatuses.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {gameStatusLabels[statusValue]}
              </option>
            ))}
          </select>
          <FieldError>{state.errors?.status}</FieldError>
        </label>

        <label className={fieldClass()}>
          <span>已玩时长（小时）</span>
          <Input
            name="playtimeHours"
            type="number"
            min="0"
            step="0.1"
            value={playtimeHours}
            onChange={(event) => setPlaytimeHours(event.target.value)}
          />
          <FieldError>{state.errors?.playtimeHours}</FieldError>
        </label>

        <label className={fieldClass()}>
          <span>最近游玩</span>
          <Input
            name="lastPlayedAt"
            type="datetime-local"
            value={lastPlayedAt}
            onChange={(event) => setLastPlayedAt(event.target.value)}
          />
          <FieldError>{state.errors?.lastPlayedAt}</FieldError>
        </label>

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
      </div>

      <CoverInput coverUrl={coverUrl} setCoverUrl={setCoverUrl} error={state.errors?.coverUrl} />

      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">标签</span>
        <TagInput value={tags} onChange={setTags} placeholder="输入标签后回车" />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">备注 / 感想</span>
        <MarkdownEditor value={reviewMd} onChange={setReviewMd} preview={markdownPreview} />
      </div>

      {game ? (
        <div className="grid gap-2 rounded-lg bg-surface-2 p-3 text-xs leading-6 text-ink-2 sm:grid-cols-2">
          <span>来源：{game.source === "manual" ? "手动添加" : game.source}</span>
          <span>Steam App ID：{game.steamAppId ?? "无"}</span>
          <span>近两周时长：{formatHours(game.playtime2w)}</span>
          <span>创建：{game.createdAt}</span>
          <span>更新：{game.updatedAt}</span>
        </div>
      ) : null}

      {state.message ? (
        <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}
      {state.warning ? <p className="text-sm text-module-games">{state.warning}</p> : null}
      <FieldError>{state.errors?.form}</FieldError>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "正在保存..." : "保存"}
        </Button>
      </div>
    </form>
  );
}

function AddGameDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          添加游戏
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>添加游戏</DialogTitle>
          <DialogDescription>手动记录一款游戏，Steam 同步会在下一阶段接入。</DialogDescription>
        </DialogHeader>
        <GameForm action={createGameAction} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SteamSyncControls({ lastSyncAt }: { lastSyncAt: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function syncSteam() {
    startTransition(async () => {
      const result = await syncSteamLibraryAction();

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button type="button" variant="outline" onClick={syncSteam} disabled={isPending}>
        <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
        {isPending ? "正在同步..." : "同步 Steam"}
      </Button>
      <p className="text-xs text-ink-3">{lastSyncAt ? `上次同步于 ${lastSyncAt}` : "还没有同步过 Steam"}</p>
    </div>
  );
}

function GameDetailDialog({ game }: { game: GameListItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group block min-w-0 rounded-lg border border-border bg-surface text-left shadow-sm transition hover:-translate-y-0.5 hover:border-module-games/45 hover:shadow-md"
        >
          <GameCard game={game} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{game.name}</DialogTitle>
          <DialogDescription>
            编辑游戏条目、评分、时长、标签和感想。
          </DialogDescription>
        </DialogHeader>
        <GameForm game={game} action={updateGameAction} />
      </DialogContent>
    </Dialog>
  );
}

function GameCard({ game }: { game: GameListItem }) {
  return (
    <article className="overflow-hidden rounded-lg">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-2">
        <GameCover game={game} className="transition duration-300 group-hover:scale-[1.03]" />
        <span className="absolute right-2 top-2 rounded-full bg-surface/90 px-2 py-1 text-xs font-semibold text-ink shadow-sm">
          {game.platform}
        </span>
      </div>
      <div className="space-y-3 p-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">{game.name}</h2>
          <p className="mt-1 text-xs text-ink-3">{game.lastPlayedAt ? `最近 ${game.lastPlayedAt}` : formatHours(game.playtimeMin)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={game.status} map={gameStatusBadgeMap} />
          {game.rating ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-2">
              <Star className="size-3.5 fill-current text-primary" />
              {game.rating}/10
            </span>
          ) : (
            <span className="text-xs text-ink-3">未评分</span>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyGames() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-14 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-module-games/12 text-module-games">
        <Gamepad2 className="size-7" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-semibold text-ink">游戏柜还空着。</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-2">
        先手动收进几款正在玩或想玩的游戏，之后 Steam 同步会继续补全客观时长。
      </p>
    </div>
  );
}

export function GamesLibrary({ data }: { data: GamesPageData }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-games">游戏</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">游戏收藏册</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
            记录想玩、在玩和已通关的游戏，封面墙会按当前筛选和排序保存到网址中。
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
            <SteamSyncControls lastSyncAt={data.steamLastSyncAt} />
            <AddGameDialog />
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <StatsBadge icon={<Gamepad2 className="size-5" />} label="总数" value={`${data.stats.total} 款`} />
        <StatsBadge icon={<Trophy className="size-5" />} label="已通关" value={`${data.stats.finished} 款`} />
        <StatsBadge icon={<Clock3 className="size-5" />} label="总时长" value={`${data.stats.playtimeHours} 小时`} />
      </div>

      <FiltersBar data={data} />

      {data.games.length === 0 ? (
        <EmptyGames />
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {data.games.map((game) => (
            <GameDetailDialog key={game.id} game={game} />
          ))}
        </section>
      )}
    </div>
  );
}
