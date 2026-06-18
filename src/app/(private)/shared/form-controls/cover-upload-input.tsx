"use client";

import { ImagePlus } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { uploadImageFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { FieldError, fieldClass } from "./form-field";

export function CoverUploadInput({
  coverUrl,
  setCoverUrl,
  uploadSubdir,
  placeholder,
  error,
  previewClassName,
  showPreview,
  renderPreview,
}: {
  coverUrl: string;
  setCoverUrl: (value: string) => void;
  uploadSubdir: string;
  placeholder: string;
  error?: string;
  previewClassName: string;
  showPreview?: boolean;
  renderPreview: (coverUrl: string) => ReactNode;
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
        const { url } = await uploadImageFile(file, { area: "public", subdir: uploadSubdir });
        setCoverUrl(url);
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
          placeholder={placeholder}
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
      {showPreview ?? Boolean(coverUrl) ? (
        <div className={cn("mt-2 overflow-hidden rounded-lg border border-border bg-surface-2", previewClassName)}>
          {renderPreview(coverUrl)}
        </div>
      ) : null}
    </div>
  );
}
