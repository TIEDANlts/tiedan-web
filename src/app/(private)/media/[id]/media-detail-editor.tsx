"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { MarkdownEditor } from "@/components/markdown-editor";
import { RatingStars } from "@/components/rating-stars";
import { StatusBadge } from "@/components/status-badge";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { advanceMediaStatusAction, updateMediaItemAction } from "@/modules/media/actions";
import type { MediaDetailItem } from "@/modules/media/queries";
import {
  type MediaStatusValue,
  type MediaTypeValue,
  mediaCreatorLabels,
  mediaStatusFlowLabel,
  mediaStatusLabel,
  mediaStatusMapForType,
  mediaStatuses,
  mediaTypeLabels,
  mediaTypes,
  nextMediaStatus,
} from "@/modules/media/utils";
import { CoverInput, FieldError, fieldClass, initialMediaActionState } from "../media-form-parts";

export function MediaDetailEditor({
  item,
  renderedReview,
}: {
  item: MediaDetailItem;
  renderedReview: ReactNode;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateMediaItemAction, initialMediaActionState);
  const [type, setType] = useState<MediaTypeValue>(item.type);
  const [title, setTitle] = useState(item.title);
  const [originalTitle, setOriginalTitle] = useState(item.originalTitle ?? "");
  const [creator, setCreator] = useState(item.creator ?? "");
  const [year, setYear] = useState(item.year ? String(item.year) : "");
  const [coverUrl, setCoverUrl] = useState(item.coverUrl ?? "");
  const [doubanId] = useState(item.doubanId ?? "");
  const [tmdbId] = useState(item.tmdbId ?? "");
  const [isbn] = useState(item.isbn ?? "");
  const [status, setStatus] = useState<MediaStatusValue>(item.status);
  const [rating, setRating] = useState<number | null>(item.rating);
  const [startedAt, setStartedAt] = useState(item.startedInput);
  const [finishedAt, setFinishedAt] = useState(item.finishedInput);
  const [releaseDate, setReleaseDate] = useState(item.releaseInput);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [reviewMd, setReviewMd] = useState(item.reviewMd);
  const [hasSpoiler, setHasSpoiler] = useState(item.hasSpoiler);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [flowWarning, setFlowWarning] = useState<string | null>(null);
  const [isFlowPending, startFlow] = useTransition();
  const nextStatus = nextMediaStatus(status);
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
    }
  }, [router, state.ok]);

  function advanceStatus() {
    if (!nextStatus) {
      return;
    }

    setFlowMessage(null);
    setFlowWarning(null);
    startFlow(async () => {
      const result = await advanceMediaStatusAction(item.id);
      setFlowMessage(result.message);
      setFlowWarning(result.warning ?? null);
      if (result.ok) {
        setStatus(nextStatus);
        router.refresh();
      }
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="rating" value={rating ?? ""} />
      <input type="hidden" name="tags" value={tags.join(",")} />
      <input type="hidden" name="reviewMd" value={reviewMd} />
      <input type="hidden" name="doubanId" value={doubanId} />
      <input type="hidden" name="tmdbId" value={tmdbId} />
      <input type="hidden" name="isbn" value={isbn} />

      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
            <Link href="/media">
              <ArrowLeft className="size-4" />
              返回书影
            </Link>
          </Button>
          <p className="mb-2 text-sm font-medium text-module-media">{mediaTypeLabels[type]}</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">{title || item.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
            编辑元信息、状态、评分、标签和长文感想。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-module-media/10 p-3">
          <StatusBadge value={status} map={mediaStatusMapForType(type)} />
          {nextStatus ? (
            <Button type="button" size="sm" onClick={advanceStatus} disabled={isFlowPending}>
              {isFlowPending ? "正在更新..." : mediaStatusFlowLabel(type, status)}
            </Button>
          ) : null}
          {flowMessage ? <span className="text-sm text-ink-2">{flowMessage}</span> : null}
          {flowWarning ? <span className="text-sm text-module-media">{flowWarning}</span> : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <section className="space-y-5 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <CoverInput
            title={title}
            coverUrl={coverUrl}
            setCoverUrl={setCoverUrl}
            error={state.errors?.coverUrl}
            previewClassName="max-w-full"
          />

          <div className="grid gap-4">
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
              <Input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <FieldError>{state.errors?.title}</FieldError>
            </label>

            <label className={fieldClass()}>
              <span>原名</span>
              <Input name="originalTitle" value={originalTitle} onChange={(event) => setOriginalTitle(event.target.value)} />
            </label>

            <label className={fieldClass()}>
              <span>{mediaCreatorLabels[type]}</span>
              <Input name="creator" value={creator} onChange={(event) => setCreator(event.target.value)} />
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

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={fieldClass()}>
                <span>开始日期</span>
                <Input name="startedAt" type="date" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
                <FieldError>{state.errors?.startedAt}</FieldError>
              </label>
              <label className={fieldClass()}>
                <span>完成日期</span>
                <Input name="finishedAt" type="date" value={finishedAt} onChange={(event) => setFinishedAt(event.target.value)} />
                <FieldError>{state.errors?.finishedAt}</FieldError>
              </label>
            </div>

            {status === "WISHLIST" ? (
              <label className={fieldClass()}>
                <span>{type === "BOOK" ? "出版日期" : "上映日期"}</span>
                <Input name="releaseDate" type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} />
                <FieldError>{state.errors?.releaseDate}</FieldError>
              </label>
            ) : null}
          </div>
        </section>

        <section className="space-y-5 rounded-xl border border-border bg-surface p-4 shadow-sm">
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

          <div className="space-y-2">
            <span className="text-sm font-medium text-ink">标签</span>
            <TagInput value={tags} onChange={setTags} placeholder="输入标签后回车" />
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="hasSpoiler"
              checked={hasSpoiler}
              onChange={(event) => setHasSpoiler(event.target.checked)}
              className="size-4 rounded border-border accent-module-media"
            />
            含剧透
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-ink">感想</span>
            <MarkdownEditor value={reviewMd} onChange={setReviewMd} preview={markdownPreview} />
          </div>

          <div className={cn("rounded-lg border border-border bg-surface-2 p-4", !item.reviewMd && "hidden")}>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
              <ExternalLink className="size-4 text-module-media" />
              保存后的渲染
            </div>
            {renderedReview}
          </div>

          <div className="grid gap-2 rounded-lg bg-surface-2 p-3 text-xs leading-6 text-ink-2 sm:grid-cols-2">
            <span>创建：{item.createdAt}</span>
            <span>更新：{item.updatedAt}</span>
          </div>

          {state.message ? (
            <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
          ) : null}
          {state.warning ? <p className="text-sm text-module-media">{state.warning}</p> : null}
          <FieldError>{state.errors?.form}</FieldError>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "正在保存..." : "保存书影条目"}
            </Button>
          </div>
        </section>
      </div>
    </form>
  );
}
