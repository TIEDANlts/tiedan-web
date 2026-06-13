import Link from "next/link";
import { MarkdownAsync } from "react-markdown";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type MarkdownRendererProps = {
  value: string;
  className?: string;
};

export async function MarkdownRenderer({ value, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "space-y-4 text-sm leading-7 text-ink-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded-md [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-ink [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:p-4 [&_strong]:text-ink",
        className,
      )}
    >
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypePrettyCode, { theme: { light: "github-light", dark: "github-dark" } }]]}
        components={{
          a({ href, children }) {
            const external = href?.startsWith("http://") || href?.startsWith("https://");

            if (!href) {
              return <>{children}</>;
            }

            if (external) {
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            }

            return <Link href={href}>{children}</Link>;
          },
        }}
      >
        {value}
      </MarkdownAsync>
    </div>
  );
}
