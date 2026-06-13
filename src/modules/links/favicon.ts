const ICON_REL_PATTERN = /<link\b[^>]*>/gi;
const REL_PATTERN = /\brel\s*=\s*["']([^"']+)["']/i;
const HREF_PATTERN = /\bhref\s*=\s*["']([^"']+)["']/i;

function originFavicon(targetUrl: string) {
  return new URL("/favicon.ico", targetUrl).toString();
}

export function getFaviconCandidatesFromHtml(html: string, targetUrl: string) {
  const candidates: string[] = [];

  for (const tag of html.matchAll(ICON_REL_PATTERN)) {
    const rel = tag[0].match(REL_PATTERN)?.[1]?.toLowerCase();
    const href = tag[0].match(HREF_PATTERN)?.[1];

    if (!rel || !href || !rel.split(/\s+/).some((part) => part.includes("icon"))) {
      continue;
    }

    try {
      candidates.push(new URL(href, targetUrl).toString());
    } catch {
      // Ignore malformed favicon candidates and continue with the fallback.
    }
  }

  candidates.push(originFavicon(targetUrl));

  return Array.from(new Set(candidates));
}

export async function resolveFaviconUrl(targetUrl: string) {
  const response = await fetch(targetUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    return [originFavicon(targetUrl)];
  }

  const html = await response.text();

  return getFaviconCandidatesFromHtml(html, targetUrl);
}

export async function fetchAndCacheFavicon(
  targetUrl: string,
  save: (url: string, subdir: string) => Promise<{ url: string; thumbUrl: string }>,
) {
  let candidates: string[];

  try {
    candidates = await resolveFaviconUrl(targetUrl);
  } catch {
    candidates = [originFavicon(targetUrl)];
  }

  for (const candidate of candidates) {
    try {
      return (await save(candidate, "favicons")).url;
    } catch {
      // Try the next favicon candidate. Favicon fetch failure should not block link creation.
    }
  }

  return null;
}
