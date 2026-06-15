"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { saveProfileSettings, type ProfileSettings } from "@/modules/settings/settings";

export type ProfileSettingsActionState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<Record<"name" | "bio" | "avatar", string>>;
};

export const initialProfileSettingsActionState: ProfileSettingsActionState = {
  ok: false,
  message: null,
};

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function saveProfileSettingsAction(
  _previousState: ProfileSettingsActionState,
  formData: FormData,
): Promise<ProfileSettingsActionState> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再修改设置。");
  }

  const input: ProfileSettings = {
    name: stringValue(formData.get("name")),
    bio: stringValue(formData.get("bio")),
    avatar: stringValue(formData.get("avatar")) || null,
  };
  const errors: ProfileSettingsActionState["errors"] = {};

  if (!input.name) {
    errors.name = "名字不能为空。";
  }

  if (!input.bio) {
    errors.bio = "一句话简介不能为空。";
  }

  if (input.avatar && !input.avatar.startsWith("/uploads/")) {
    errors.avatar = "头像必须来自公开上传区。";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "请检查个人资料。", errors };
  }

  await saveProfileSettings(input);
  revalidatePath("/");
  revalidatePath("/admin/settings");

  return { ok: true, message: "首页资料已保存。" };
}
