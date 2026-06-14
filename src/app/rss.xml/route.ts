import { getRecentPublishedPosts } from "@/modules/posts/queries";
import { createExcerpt } from "@/modules/posts/utils";

export const dynamic = "force-dynamic";

function siteUrl() {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const baseUrl = siteUrl();
  const posts = await getRecentPublishedPosts(20);
  const items = posts
    .map((post) => {
      const url = `${baseUrl}/blog/${post.slug}`;

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid>${escapeXml(url)}</guid>
          <pubDate>${(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
          <description>${escapeXml(createExcerpt(post.contentMd, post.summary))}</description>
        </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>铁蛋的博客</title>
        <link>${escapeXml(baseUrl)}/blog</link>
        <description>铁蛋的个人网站最新文章</description>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
