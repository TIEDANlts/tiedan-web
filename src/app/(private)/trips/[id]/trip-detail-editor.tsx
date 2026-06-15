"use client";

import { Check, ImagePlus, MapPin, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LeafletTileConfig } from "@/lib/map";
import { cn } from "@/lib/utils";
import {
  addTripLocationAction,
  addTripPhotoAction,
  removeTripLocationAction,
  removeTripPhotoAction,
  saveChecklistAction,
  updateTripDayNoteAction,
  updateTripOverviewAction,
  type TripActionState,
} from "@/modules/trips/actions";
import type { TripDayItem, TripDetail } from "@/modules/trips/queries";
import { tripStatusLabels } from "@/modules/trips/utils";
import { DynamicTripMap } from "../leaflet-dynamic";

const initialActionState: TripActionState = { ok: false, message: null };

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

function fieldClass() {
  return "block space-y-2 text-sm font-medium text-ink";
}

function TripHero({ trip }: { trip: TripDetail }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="relative min-h-[18rem] bg-module-trips/12 md:min-h-[24rem]">
        {trip.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.coverUrl} alt={trip.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-module-trips text-7xl font-semibold text-white">
            {trip.title.slice(0, 1)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 text-white">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/18 px-3 py-1">{tripStatusLabels[trip.status]}</span>
            <span>{trip.startDate} - {trip.endDate}</span>
            <span>{trip.daysCount} 天</span>
          </div>
          <h1 className="mt-3 font-heading text-4xl font-semibold">{trip.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {trip.destinations.map((destination) => (
              <span key={destination} className="rounded-full bg-module-trips px-3 py-1 text-xs font-semibold text-white">
                {destination}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewForm({ trip }: { trip: TripDetail }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateTripOverviewAction, initialActionState);
  const [destinations, setDestinations] = useState<string[]>(trip.destinations);
  const [summaryMd, setSummaryMd] = useState(trip.summaryMd);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  const preview = useMemo(
    () => <MarkdownRenderer value={summaryMd || "还没有写总结。"} />,
    [summaryMd],
  );

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <input type="hidden" name="id" value={trip.id} />
      <input type="hidden" name="destinations" value={destinations.join(",")} />
      <input type="hidden" name="summaryMd" value={summaryMd} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldClass()}>
          <span>标题</span>
          <Input name="title" defaultValue={trip.title} />
          <FieldError>{state.errors?.title}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>状态</span>
          <select name="status" defaultValue={trip.status} className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50">
            {(["PLANNED", "DONE"] as const).map((status) => (
              <option key={status} value={status}>
                {tripStatusLabels[status]}
              </option>
            ))}
          </select>
          <FieldError>{state.errors?.status}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>开始日期</span>
          <Input name="startDate" type="date" defaultValue={trip.startDate} />
          <FieldError>{state.errors?.startDate}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>结束日期</span>
          <Input name="endDate" type="date" defaultValue={trip.endDate} />
          <FieldError>{state.errors?.endDate}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>封面 URL</span>
          <Input name="coverUrl" defaultValue={trip.coverUrl ?? ""} placeholder="/uploads/trips/covers/..." />
          <FieldError>{state.errors?.coverUrl}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>预算</span>
          <Input name="budget" defaultValue={trip.budget ?? ""} inputMode="decimal" placeholder="例如 3000.00" />
          <FieldError>{state.errors?.budget}</FieldError>
        </label>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">目的地</span>
        <TagInput value={destinations} onChange={setDestinations} placeholder="输入目的地后回车" />
        <FieldError>{state.errors?.destinations}</FieldError>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">总结</span>
        <MarkdownEditor value={summaryMd} onChange={setSummaryMd} preview={preview} />
      </div>
      {state.message ? <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "正在保存..." : "保存概览"}
        </Button>
      </div>
    </form>
  );
}

function ChecklistEditor({ trip }: { trip: TripDetail }) {
  const router = useRouter();
  const [items, setItems] = useState(trip.checklist);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(nextItems = items) {
    startTransition(async () => {
      const result = await saveChecklistAction(trip.id, nextItems);
      setMessage(result.message);
      router.refresh();
    });
  }

  function addItem() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    const next = [...items, { id: crypto.randomUUID(), text, done: false }];
    setItems(next);
    setDraft("");
    save(next);
  }

  return (
    <section className="space-y-3 rounded-xl border border-module-trips/25 bg-module-trips/8 p-4">
      <h2 className="font-heading text-xl font-semibold text-ink">行前清单</h2>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="例如：订酒店、确认签证、下载离线地图"
        />
        <Button type="button" onClick={addItem} disabled={isPending}>
          <Plus className="size-4" />
          添加
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={item.done}
              onChange={(event) => {
                const next = items.map((row) => (row.id === item.id ? { ...row, done: event.target.checked } : row));
                setItems(next);
                save(next);
              }}
              className="size-4 accent-[var(--module-trips)]"
            />
            <span className={cn("flex-1", item.done && "text-ink-3 line-through")}>{item.text}</span>
            <button
              type="button"
              onClick={() => {
                const next = items.filter((row) => row.id !== item.id);
                setItems(next);
                save(next);
              }}
              className="text-ink-3 hover:text-destructive"
              aria-label={`删除 ${item.text}`}
            >
              <Trash2 className="size-4" />
            </button>
          </label>
        ))}
      </div>
      {message ? <p className="text-xs text-module-trips">{message}</p> : null}
    </section>
  );
}

async function uploadTripPhoto(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("area", "private");
  formData.set("subdir", "trips/photos");

  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const body = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error || "照片上传失败。");
  }

  return body.url;
}

function LocationForm({ dayId }: { dayId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [fromGcj02, setFromGcj02] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function search() {
    const keyword = query.trim();
    if (!keyword) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/trips/nominatim?q=${encodeURIComponent(keyword)}`);
      const body = (await response.json()) as { results?: Array<{ name: string; lat: number; lng: number }>; error?: string };
      if (!response.ok) {
        setMessage(body.error ?? "地点搜索失败。");
        return;
      }
      setResults(body.results ?? []);
      setMessage((body.results ?? []).length ? null : "没有找到匹配地点，可以手动输入坐标。");
    });
  }

  function addLocation() {
    startTransition(async () => {
      const result = await addTripLocationAction({
        dayId,
        name,
        lat: Number(lat),
        lng: Number(lng),
        fromGcj02,
      });
      setMessage(result.message);
      if (result.ok) {
        setName("");
        setLat("");
        setLng("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2 p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索地点，例如 西湖" />
        <Button type="button" variant="outline" onClick={search} disabled={isPending}>
          搜索
        </Button>
      </div>
      {results.length ? (
        <div className="grid gap-2">
          {results.map((result) => (
            <button
              key={`${result.name}-${result.lat}-${result.lng}`}
              type="button"
              onClick={() => {
                setName(result.name);
                setLat(String(result.lat));
                setLng(String(result.lng));
                setFromGcj02(false);
              }}
              className="rounded-md border border-border bg-surface p-2 text-left text-xs text-ink-2 hover:border-module-trips/50"
            >
              <span className="block truncate font-medium text-ink">{result.name}</span>
              {result.lat}, {result.lng}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="地点名" />
        <Input value={lat} onChange={(event) => setLat(event.target.value)} placeholder="纬度 lat" inputMode="decimal" />
        <Input value={lng} onChange={(event) => setLng(event.target.value)} placeholder="经度 lng" inputMode="decimal" />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={fromGcj02} onChange={(event) => setFromGcj02(event.target.checked)} className="size-4 accent-[var(--module-trips)]" />
        坐标来自国内地图（高德/腾讯）
      </label>
      <Button type="button" onClick={addLocation} disabled={isPending}>
        <MapPin className="size-4" />
        添加地点
      </Button>
      {message ? <p className="text-xs text-ink-2">{message}</p> : null}
    </div>
  );
}

function DayCard({
  day,
  active,
  selectedLocationId,
  onSelectDay,
  onSelectLocation,
}: {
  day: TripDayItem;
  active: boolean;
  selectedLocationId: string | null;
  onSelectDay: () => void;
  onSelectLocation: (id: string) => void;
}) {
  const router = useRouter();
  const [noteMd, setNoteMd] = useState(day.noteMd);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const preview = useMemo(() => <MarkdownRenderer value={noteMd || "今天还没有笔记。"} />, [noteMd]);

  function saveNote() {
    startTransition(async () => {
      const result = await updateTripDayNoteAction(day.id, noteMd);
      setMessage(result.message);
      router.refresh();
    });
  }

  function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    startTransition(async () => {
      try {
        const url = await uploadTripPhoto(file);
        const result = await addTripPhotoAction(day.id, url);
        setMessage(result.message);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "照片上传失败。");
      } finally {
        event.target.value = "";
      }
    });
  }

  return (
    <article className={cn("space-y-4 rounded-xl border bg-surface p-4 shadow-sm", active ? "border-module-trips" : "border-border")}>
      <button type="button" onClick={onSelectDay} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block font-heading text-xl font-semibold text-ink">{day.date}</span>
          <span className="text-sm text-ink-2">{day.locations.length} 个地点 · {day.photos.length} 张照片</span>
        </span>
        {active ? <Check className="size-5 text-module-trips" /> : null}
      </button>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">地点</h3>
        <div className="space-y-2">
          {day.locations.map((location, index) => (
            <button
              key={location.id}
              type="button"
              onClick={() => {
                onSelectDay();
                onSelectLocation(location.id);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                selectedLocationId === location.id ? "border-module-trips bg-module-trips/10" : "border-border bg-surface-2",
              )}
            >
              <span className="min-w-0">
                <span className="font-medium text-ink">{index + 1}. {location.name}</span>
                <span className="ml-2 text-xs text-ink-3">{location.lat}, {location.lng}</span>
              </span>
              <Trash2
                className="size-4 text-ink-3"
                onClick={(event) => {
                  event.stopPropagation();
                  startTransition(async () => {
                    const result = await removeTripLocationAction(day.id, location.id);
                    setMessage(result.message);
                    router.refresh();
                  });
                }}
              />
            </button>
          ))}
        </div>
        <LocationForm dayId={day.id} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">照片</h3>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
            <ImagePlus className="size-4" />
            {isPending ? "处理中..." : "上传照片"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={uploadPhoto} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {day.photos.map((photo) => (
            <div key={photo.url} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
              <a href={photo.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumbUrl} alt="旅行照片" className="h-full w-full object-cover" loading="lazy" />
              </a>
              <button
                type="button"
                className="absolute right-1 top-1 rounded-md bg-surface/90 p-1 text-destructive opacity-0 transition group-hover:opacity-100"
                onClick={() => {
                  startTransition(async () => {
                    const result = await removeTripPhotoAction(day.id, photo.url);
                    setMessage(result.message);
                    router.refresh();
                  });
                }}
                aria-label="移除照片"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">当天笔记</h3>
          <Button type="button" variant="outline" size="sm" onClick={saveNote} disabled={isPending}>
            <Save className="size-4" />
            保存笔记
          </Button>
        </div>
        <MarkdownEditor value={noteMd} onChange={setNoteMd} preview={preview} />
      </div>
      {message ? <p className="text-xs text-module-trips">{message}</p> : null}
    </article>
  );
}

export function TripDetailEditor({ trip, tileConfig }: { trip: TripDetail; tileConfig: LeafletTileConfig }) {
  const [selectedDayId, setSelectedDayId] = useState(trip.days[0]?.id ?? null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const selectedDay = trip.days.find((day) => day.id === selectedDayId) ?? trip.days[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/trips">返回旅行列表</Link>
        </Button>
        <span className="rounded-full bg-module-trips/12 px-3 py-1 text-sm font-medium text-module-trips">{tripStatusLabels[trip.status]}</span>
      </div>
      <TripHero trip={trip} />
      <OverviewForm trip={trip} />
      {trip.status === "PLANNED" ? <ChecklistEditor trip={trip} /> : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)] lg:items-start">
        <div className="space-y-4">
          {trip.days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              active={selectedDay?.id === day.id}
              selectedLocationId={selectedLocationId}
              onSelectDay={() => setSelectedDayId(day.id)}
              onSelectLocation={setSelectedLocationId}
            />
          ))}
        </div>
        <div className="sticky top-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <DynamicTripMap
            tileConfig={tileConfig}
            day={selectedDay}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
          />
        </div>
      </section>
    </div>
  );
}
