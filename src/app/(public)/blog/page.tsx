import { BlogListPage } from "@/app/(public)/blog/blog-list-page";

export const dynamic = "force-static";

export default function BlogPage() {
  return <BlogListPage page={1} />;
}
