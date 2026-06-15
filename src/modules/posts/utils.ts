export type PostStatusValue = "DRAFT" | "PUBLISHED";

export type TocItem = {
  depth: 2 | 3;
  text: string;
  id: string;
};

export type PostInput = {
  title: FormDataEntryValue | string | null;
  slug?: FormDataEntryValue | string | null;
  category?: FormDataEntryValue | string | null;
  tags?: FormDataEntryValue | string | string[] | null;
  summary?: FormDataEntryValue | string | null;
  contentMd: FormDataEntryValue | string | null;
};

export type NormalizedPostInput =
  | {
      ok: true;
      data: {
        title: string;
        slug: string;
        contentMd: string;
        summary: string | null;
        category: string | null;
        tags: string[];
      };
    }
  | {
      ok: false;
      errors: Partial<Record<"title" | "slug" | "contentMd", string>>;
    };

function stringValue(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function formatSlugTimestamp(now: Date) {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "");
}

export function slugFromTitle(title: string, now = new Date()) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || `post-${formatSlugTimestamp(now)}`;
}

export function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeTags(rawTags: PostInput["tags"]) {
  const values = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === "string"
      ? rawTags.split(",")
      : [];

  return Array.from(
    new Set(values.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)),
  );
}

export function normalizePostInput(input: PostInput, now = new Date()): NormalizedPostInput {
  const title = stringValue(input.title);
  const requestedSlug = stringValue(input.slug);
  const slug = requestedSlug ? requestedSlug.toLowerCase() : slugFromTitle(title, now);
  const contentMd = stringValue(input.contentMd);
  const errors: Partial<Record<"title" | "slug" | "contentMd", string>> = {};

  if (!title) {
    errors.title = "标题不能为空。";
  }

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = "Slug 只能包含小写字母、数字和连字符。";
  }

  if (!contentMd) {
    errors.contentMd = "正文不能为空。";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      title,
      slug,
      contentMd,
      summary: stringValue(input.summary) || null,
      category: stringValue(input.category) || null,
      tags: normalizeTags(input.tags),
    },
  };
}

function headingId(text: string, fallbackIndex: number) {
  return (
    slugFromTitle(text)
      .replace(/^post-\d+$/, "")
      .replace(/^-+|-+$/g, "") || `section-${fallbackIndex}`
  );
}

export function extractToc(markdown: string): TocItem[] {
  const counts = new Map<string, number>();
  const fallbackIds = new Map<string, string>();
  const items: TocItem[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line.trim());

    if (!match) {
      continue;
    }

    const text = match[2].replace(/[`*_~[\]()]/g, "").trim();
    const existingFallbackId = fallbackIds.get(text);
    const baseId = existingFallbackId ?? headingId(text, items.length + 1);
    if (!existingFallbackId && baseId.startsWith("section-")) {
      fallbackIds.set(text, baseId);
    }
    const count = (counts.get(baseId) ?? 0) + 1;
    counts.set(baseId, count);
    items.push({
      depth: match[1].length as 2 | 3,
      text,
      id: count === 1 ? baseId : `${baseId}-${count}`,
    });
  }

  return items;
}

export function createExcerpt(contentMd: string, summary?: string | null) {
  if (summary?.trim()) {
    return summary.trim();
  }

  return contentMd
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~`-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([，。！？；：,.!?;:])/g, "$1")
    .trim()
    .slice(0, 160);
}

export function buildViewKey(ip: string, slug: string) {
  return `${ip}:${slug}`;
}

export function parseBlogPageParam(page: string) {
  if (!/^[1-9]\d*$/.test(page)) {
    return null;
  }

  const parsed = Number(page);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function postStatusLabel(status: PostStatusValue) {
  return status === "PUBLISHED" ? "已发布" : "草稿";
}
