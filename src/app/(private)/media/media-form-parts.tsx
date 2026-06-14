"use client";

import { ImagePlus } from "lucide-react";
import type { ChangeEvent } from "react";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MediaActionState } from "@/modules/media/actions";

export const initialMediaActionState: MediaActionState = {
  ok: false,
  message: null,
};

export function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

export function fieldClass() {
  return "block space-y-2 text-sm font-medium text-ink";
}

export async function uploadMediaCover(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("area", "public");
  formData.set("subdir", "media");

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

export function MediaCover({
  item,
  className,
}: {
  item: { title: string; coverUrl: string | null };
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = Boolean(item.coverUrl && failedUrl === item.coverUrl);

  if (item.coverUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.coverUrl}
        alt={item.title}
        className={cn("h-full w-full object-cover", className)}
        loading="lazy"
        onError={() => setFailedUrl(item.coverUrl)}
      />
    );
  }

  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-module-media text-5xl font-semibold text-white", className)}>
      {item.title.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function CoverInput({
  title,
  coverUrl,
  setCoverUrl,
  error,
  previewClassName,
}: {
  title: string;
  coverUrl: string;
  setCoverUrl: (value: string) => void;
  error?: string;
  previewClassName?: string;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError(null);
    startUpload(async () => {
      try {
        setCoverUrl(await uploadMediaCover(file));
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
          placeholder="/uploads/media/cover.webp 或 https://..."
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
          <ImagePlus className="size-4" />
          {isUploading ? "正在上传..." : "上传封面"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={onFileChange} />
        </label>
        <FieldError>{error}</FieldError>
        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
      </div>
      {coverUrl || title ? (
        <div className={cn("mt-2 aspect-[2/3] max-w-40 overflow-hidden rounded-lg border border-border bg-surface-2", previewClassName)}>
          <MediaCover item={{ title: title || "封面", coverUrl }} />
        </div>
      ) : null}
    </div>
  );
}
