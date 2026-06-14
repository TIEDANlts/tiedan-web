import { BlogListPage } from "@/app/(public)/blog/blog-list-page";

export const dynamic = "force-dynamic";

export default function BlogPage() {
  return <BlogListPage page={1} />;
}
