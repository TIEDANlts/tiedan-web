import { BlogListPage } from "@/app/(public)/blog/blog-list-page";
import { getPublishedPageCount } from "@/modules/posts/queries";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const pageCount = await getPublishedPageCount();

  return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => ({
    page: String(index + 2),
  }));
}

export default async function BlogPagedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;

  return <BlogListPage page={Number(page)} />;
}
