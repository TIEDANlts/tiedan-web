import { notFound } from "next/navigation";

import { MediaDetailEditor } from "@/app/(private)/media/[id]/media-detail-editor";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { getMediaDetail } from "@/modules/media/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getMediaDetail(id);

  if (!item) {
    return {};
  }

  return {
    title: item.title,
  };
}

function RenderedReview({ value, hasSpoiler }: { value: string; hasSpoiler: boolean }) {
  if (!value.trim()) {
    return <p className="text-sm text-ink-3">还没有写感想。</p>;
  }

  if (hasSpoiler) {
    return (
      <details className="group rounded-lg border border-module-media/30 bg-module-media/10 p-3">
        <summary className="cursor-pointer text-sm font-medium text-module-media">
          已隐藏剧透，点击展开
        </summary>
        <MarkdownRenderer value={value} className="mt-4" />
      </details>
    );
  }

  return <MarkdownRenderer value={value} />;
}

export default async function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getMediaDetail(id);

  if (!item) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <MediaDetailEditor item={item} renderedReview={<RenderedReview value={item.reviewMd} hasSpoiler={item.hasSpoiler} />} />
    </main>
  );
}
