"use client";

import { CalendarDays, ImagePlus, Map, MapPinned, Plane, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

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
import { Input } from "@/components/ui/input";
import { uploadImageFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { createTripAction, type TripActionState } from "@/modules/trips/actions";
import type { TripListItem, TripsPageData } from "@/modules/trips/queries";
import { tripStatusLabels, type TripStatusValue } from "@/modules/trips/utils";

const initialActionState: TripActionState = {
  ok: false,
  message: null,
};

function statusHref(pathname: string, status: TripStatusValue) {
  return status === "DONE" ? `${pathname}?status=DONE` : pathname;
}

function StatsBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-module-trips/35 bg-module-trips/12 px-4 py-3 text-module-trips">
      <span className="flex size-9 items-center justify-center rounded-md bg-module-trips text-white">{icon}</span>
      <span>
        <span className="block text-xs text-ink-2">{label}</span>
        <span className="font-heading text-xl font-semibold text-ink">{value}</span>
      </span>
    </div>
  );
}

function StatusTabs({ data }: { data: TripsPageData }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {(["PLANNED", "DONE"] as const).map((status) => {
        const active = data.status === status;
        return (
          <Link
            key={status}
            href={statusHref(pathname, status)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
              active
                ? "border-module-trips bg-module-trips text-white"
                : "border-border bg-surface text-ink-2 hover:border-module-trips/40 hover:text-ink",
            )}
          >
            {tripStatusLabels[status]}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/20 text-white" : "bg-surface-2 text-ink-3")}>
              {data.counts[status]}
            </span>
          </Link>
        );
      })}
    </div>
  );
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

function TripCoverInput({ coverUrl, setCoverUrl, error }: { coverUrl: string; setCoverUrl: (value: string) => void; error?: string }) {
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
        const { url } = await uploadImageFile(file, { area: "public", subdir: "trips/covers" });
        setCoverUrl(url);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "封面上传失败。");
      } finally {
        event.target.value = "";
      }
    });
  }

  return (
    <div className="space-y-2">
      <label className={fieldClass()}>
        <span>封面</span>
        <Input name="coverUrl" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="/uploads/trips/covers/..." />
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="旅行封面预览" className="h-full w-full object-cover" />
        </div>
      ) : null}
    </div>
  );
}

function AddTripDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createAndNavigate, initialActionState);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState("");

  async function createAndNavigate(previousState: TripActionState, formData: FormData) {
    const result = await createTripAction(previousState, formData);
    if (result.ok && result.tripId) {
      router.push(`/trips/${result.tripId}`);
      router.refresh();
    }
    return result;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          新建行程
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>新建旅行行程</DialogTitle>
          <DialogDescription>保存后会按日期范围生成每天的行程页。</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="destinations" value={destinations.join(",")} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className={fieldClass()}>
              <span>标题</span>
              <Input name="title" autoFocus />
              <FieldError>{state.errors?.title}</FieldError>
            </label>
            <label className={fieldClass()}>
              <span>状态</span>
              <select name="status" defaultValue="PLANNED" className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50">
                <option value="PLANNED">计划中</option>
                <option value="DONE">已完成</option>
              </select>
              <FieldError>{state.errors?.status}</FieldError>
            </label>
            <label className={fieldClass()}>
              <span>开始日期</span>
              <Input name="startDate" type="date" />
              <FieldError>{state.errors?.startDate}</FieldError>
            </label>
            <label className={fieldClass()}>
              <span>结束日期</span>
              <Input name="endDate" type="date" />
              <FieldError>{state.errors?.endDate}</FieldError>
            </label>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-ink">目的地</span>
            <TagInput value={destinations} onChange={setDestinations} placeholder="输入城市后回车" />
            <FieldError>{state.errors?.destinations}</FieldError>
          </div>
          <TripCoverInput coverUrl={coverUrl} setCoverUrl={setCoverUrl} error={state.errors?.coverUrl} />
          {state.message ? <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p> : null}
          <FieldError>{state.errors?.form}</FieldError>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "正在保存..." : "创建行程"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TripCard({ trip }: { trip: TripListItem }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-module-trips/45 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-module-trips/12">
        {trip.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.coverUrl} alt={trip.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-module-trips text-5xl font-semibold text-white">
            {trip.title.slice(0, 1)}
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
          {trip.daysCount} 天
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h2 className="truncate font-heading text-xl font-semibold text-ink">{trip.title}</h2>
          <p className="mt-1 text-sm text-ink-2">{trip.startDate} - {trip.endDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {trip.destinations.map((destination) => (
            <span key={destination} className="rounded-full bg-module-trips/12 px-3 py-1 text-xs font-medium text-module-trips">
              {destination}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function TripsLibrary({ data }: { data: TripsPageData }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-trips">旅行</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">旅行收藏册</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
            计划下一段路，也把已经走过的城市、照片和每天的笔记留在地图上。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/trips/footprint">
              <MapPinned className="size-4" />
              足迹地图
            </Link>
          </Button>
          <AddTripDialog />
        </div>
      </header>

      <StatusTabs data={data} />

      <div className="flex flex-wrap gap-3">
        <StatsBadge icon={<Plane className="size-5" />} label="计划中" value={`${data.stats.planned} 段`} />
        <StatsBadge icon={<CalendarDays className="size-5" />} label="已完成" value={`${data.stats.done} 段`} />
        <StatsBadge icon={<Map className="size-5" />} label="完成目的地" value={`${data.stats.cities} 个`} />
      </div>

      {data.trips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-14 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-module-trips/12 text-module-trips">
            <Plane className="size-7" />
          </div>
          <h2 className="mt-5 font-heading text-2xl font-semibold text-ink">这一页还等着第一段路。</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-2">先建一个计划行程，日期、目的地和封面会组成你的旅行封面册。</p>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </section>
      )}
    </div>
  );
}
