"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { saveFromUrl } from "@/lib/storage";
import { fetchAndCacheFavicon } from "@/modules/links/favicon";
import { normalizeLinkInput, reorderLinksWithinGroup } from "@/modules/links/utils";

export type LinkActionState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<Record<"group" | "title" | "url" | "icon" | "description", string>>;
};

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理导航。");
  }
}

function readInput(formData: FormData) {
  return normalizeLinkInput({
    group: formData.get("group"),
    title: formData.get("title"),
    url: formData.get("url"),
    icon: formData.get("icon"),
    description: formData.get("description"),
  });
}

async function iconForLink(url: string, icon: string | null) {
  if (icon) {
    return icon;
  }

  return fetchAndCacheFavicon(url, saveFromUrl);
}

async function nextSortForGroup(group: string) {
  const aggregate = await db.link.aggregate({
    where: { group },
    _max: { sort: true },
  });

  return (aggregate._max.sort ?? -1) + 1;
}

function revalidateLinks() {
  revalidatePath("/nav");
  revalidatePath("/admin/links");
}

export async function createLinkAction(
  _previousState: LinkActionState,
  formData: FormData,
): Promise<LinkActionState> {
  await requireSession();

  const input = readInput(formData);

  if (!input.ok) {
    return { ok: false, message: "请检查链接信息。", errors: input.errors };
  }

  const icon = await iconForLink(input.data.url, input.data.icon);

  await db.link.create({
    data: {
      ...input.data,
      icon,
      sort: await nextSortForGroup(input.data.group),
    },
  });

  revalidateLinks();

  return { ok: true, message: "链接已添加。" };
}

export async function updateLinkAction(
  _previousState: LinkActionState,
  formData: FormData,
): Promise<LinkActionState> {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  const input = readInput(formData);

  if (!id) {
    return { ok: false, message: "缺少要编辑的链接。" };
  }

  if (!input.ok) {
    return { ok: false, message: "请检查链接信息。", errors: input.errors };
  }

  const existing = await db.link.findUnique({
    where: { id },
    select: { group: true, icon: true, sort: true },
  });

  if (!existing) {
    return { ok: false, message: "这个链接已经不存在。" };
  }

  const explicitIcon = input.data.icon || existing.icon;
  const icon = await iconForLink(input.data.url, explicitIcon);
  const groupChanged = existing.group !== input.data.group;

  await db.link.update({
    where: { id },
    data: {
      ...input.data,
      icon,
      sort: groupChanged ? await nextSortForGroup(input.data.group) : existing.sort,
    },
  });

  revalidateLinks();

  return { ok: true, message: "链接已更新。" };
}

export async function deleteLinkAction(id: string) {
  await requireSession();

  await db.link.delete({
    where: { id },
  });

  revalidateLinks();
}

export async function reorderLinksAction(group: string, orderedIds: string[]) {
  await requireSession();

  const links = await db.link.findMany({
    where: { group },
    select: { id: true, group: true, sort: true },
  });
  const updates = reorderLinksWithinGroup(links, group, orderedIds);

  await db.$transaction(
    updates.map((update) =>
      db.link.update({
        where: { id: update.id },
        data: { sort: update.sort },
      }),
    ),
  );

  revalidateLinks();
}
