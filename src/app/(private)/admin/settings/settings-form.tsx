"use client";

import { Upload } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  initialProfileSettingsActionState,
  saveProfileSettingsAction,
} from "@/modules/settings/actions";
import type { ProfileSettings } from "@/modules/settings/settings";

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

export function SettingsForm({ profile }: { profile: ProfileSettings }) {
  const [state, formAction, pending] = useActionState(saveProfileSettingsAction, initialProfileSettingsActionState);
  const [avatar, setAvatar] = useState(profile.avatar ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  function uploadAvatar(file: File | undefined) {
    if (!file) {
      return;
    }

    setUploadError(null);
    startUpload(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("area", "public");
      formData.set("subdir", "profile");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        setUploadError(body.error || "头像上传失败。");
        return;
      }

      setAvatar(body.url);
    });
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <input type="hidden" name="avatar" value={avatar} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="size-20 overflow-hidden rounded-full border border-border bg-surface-2">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="首页头像预览" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary">
              {profile.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div>
          <label className="inline-flex">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => uploadAvatar(event.target.files?.[0])}
            />
            <span className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium text-ink transition hover:bg-surface-2">
              <Upload className="size-4" />
              {uploading ? "上传中" : "上传头像"}
            </span>
          </label>
          <p className="mt-2 text-xs leading-5 text-ink-3">头像会保存到 public 上传区，用于匿名首页展示。</p>
          {uploadError ? <p className="mt-2 text-sm text-destructive">{uploadError}</p> : null}
          <FieldError>{state.errors?.avatar}</FieldError>
        </div>
      </div>

      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>名字</span>
        <Input name="name" defaultValue={profile.name} />
        <FieldError>{state.errors?.name}</FieldError>
      </label>

      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>一句话简介</span>
        <textarea
          name="bio"
          defaultValue={profile.bio}
          rows={4}
          className="w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm leading-6 text-ink outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
        />
        <FieldError>{state.errors?.bio}</FieldError>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || uploading}>
          保存首页资料
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
