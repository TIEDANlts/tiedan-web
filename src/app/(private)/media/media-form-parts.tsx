"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export { FieldError, fieldClass } from "@/app/(private)/shared/form-controls/form-field";

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
