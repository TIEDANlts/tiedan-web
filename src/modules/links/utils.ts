export type LinkRecord = {
  id: string;
  group: string;
  title: string;
  url: string;
  icon: string | null;
  description: string | null;
  sort: number;
};

export type LinkInput = {
  group: FormDataEntryValue | string | null;
  title: FormDataEntryValue | string | null;
  url: FormDataEntryValue | string | null;
  icon?: FormDataEntryValue | string | null;
  description?: FormDataEntryValue | string | null;
};

export type NormalizedLinkInput =
  | {
      ok: true;
      data: {
        group: string;
        title: string;
        url: string;
        icon: string | null;
        description: string | null;
      };
    }
  | {
      ok: false;
      errors: Partial<Record<"group" | "title" | "url" | "icon" | "description", string>>;
    };

function stringValue(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLinkInput(input: LinkInput): NormalizedLinkInput {
  const group = stringValue(input.group);
  const title = stringValue(input.title);
  const url = stringValue(input.url);
  const icon = stringValue(input.icon);
  const description = stringValue(input.description);
  const errors: Partial<Record<"group" | "title" | "url" | "icon" | "description", string>> = {};

  if (!group) {
    errors.group = "分组不能为空。";
  }

  if (!title) {
    errors.title = "标题不能为空。";
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      errors.url = "请输入以 http:// 或 https:// 开头的有效链接。";
    }
  } catch {
    errors.url = "请输入以 http:// 或 https:// 开头的有效链接。";
  }

  if (icon) {
    try {
      const parsedIcon = new URL(icon, "https://example.com");
      const isLocalUpload = icon.startsWith("/uploads/");
      const isRemoteImage = parsedIcon.protocol === "http:" || parsedIcon.protocol === "https:";

      if (!isLocalUpload && !isRemoteImage) {
        errors.icon = "图标必须是 /uploads/ 路径或 http(s) 图片链接。";
      }
    } catch {
      errors.icon = "图标必须是 /uploads/ 路径或 http(s) 图片链接。";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      group,
      title,
      url,
      icon: icon || null,
      description: description || null,
    },
  };
}

export function sortLinks(links: LinkRecord[]) {
  return [...links].sort((a, b) => {
    const groupCompare = a.group.localeCompare(b.group, "zh-CN");

    if (groupCompare !== 0) {
      return groupCompare;
    }

    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }

    return a.title.localeCompare(b.title, "zh-CN");
  });
}

export function groupLinksByGroup(links: LinkRecord[]) {
  const groups = new Map<string, LinkRecord[]>();

  for (const link of sortLinks(links)) {
    const groupLinks = groups.get(link.group) ?? [];
    groupLinks.push(link);
    groups.set(link.group, groupLinks);
  }

  return Array.from(groups, ([group, groupLinks]) => ({
    group,
    links: groupLinks,
  }));
}

export function reorderLinksWithinGroup(
  links: Array<Pick<LinkRecord, "id" | "group" | "sort">>,
  group: string,
  orderedIds: string[],
) {
  const groupIds = new Set(links.filter((link) => link.group === group).map((link) => link.id));
  const orderedIdSet = new Set(orderedIds);

  if (orderedIdSet.size !== orderedIds.length) {
    throw new Error("排序列表包含重复项");
  }

  if (orderedIds.some((id) => !groupIds.has(id))) {
    throw new Error("排序列表包含其他分组的链接");
  }

  if (orderedIdSet.size !== groupIds.size) {
    throw new Error("排序列表不完整");
  }

  return orderedIds.map((id, index) => ({
    id,
    sort: index,
  }));
}
