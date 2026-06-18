"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { addTripPhotoAction, removeTripPhotoAction } from "@/modules/trips/actions";
import type { TripDayItem } from "@/modules/trips/queries";
import { uploadImageFile } from "@/lib/upload-client";

export function TripPhotoUploader({
  day,
  onMessage,
}: {
  day: TripDayItem;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    startTransition(async () => {
      try {
        const { url } = await uploadImageFile(file, { area: "private", subdir: "trips/photos" });
        const result = await addTripPhotoAction(day.id, url);
        onMessage(result.message);
        router.refresh();
      } catch (error) {
        onMessage(error instanceof Error ? error.message : "照片上传失败。");
      } finally {
        event.target.value = "";
      }
    });
  }

  return (
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
                  onMessage(result.message);
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
  );
}
