import { Trash2 } from "lucide-react";

import {
  ConfirmDialog,
  EmptyState,
  MarkdownRenderer,
  PageHeader,
  RatingStars,
  StatusBadge,
} from "@/components";
import { PlaygroundTagDemo } from "@/components/playground-tag-demo";
import { Button } from "@/components/ui/button";
import { moduleColors, moduleLabels, type ModuleColorKey } from "@/lib/design";

const markdownSample = `# MarkdownRenderer

支持 **GFM**、表格、代码块和外链。

| 模块 | 状态 |
| --- | --- |
| 布局 | 已接入 |
| 组件 | 验收中 |

\`\`\`ts
export function hello(name: string) {
  return \`你好，\${name}\`;
}
\`\`\`

[打开 OpenAI](https://openai.com)
`;

const contrastThemes = [
  { label: "公开 · 亮色", className: "theme-public" },
  { label: "公开 · 暗色", className: "dark theme-public" },
  { label: "私密 · 亮色", className: "theme-private" },
  { label: "私密 · 暗色", className: "dark theme-private" },
] as const;

const swatches = ["--ink", "--ink-2", "--ink-3", "--primary"] as const;

export default async function PlaygroundPage() {
  const moduleKeys = Object.keys(moduleColors) as ModuleColorKey[];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 sm:px-8">
      <PageHeader
        eyebrow="Stage 2 临时验收"
        title="通用组件 playground"
        description="这个页面集中展示布局 token、模块色、通用组件和 Markdown 渲染。Stage 16 收尾时会删除。"
        actions={<Button>主要操作</Button>}
      />

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">状态与模块色</h2>
        <div className="flex flex-wrap gap-2">
          {moduleKeys.map((module) => (
            <span
              key={module}
              className="rounded-pill border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: moduleColors[module],
                color: moduleColors[module],
                backgroundColor: `color-mix(in srgb, ${moduleColors[module]} 10%, transparent)`,
              }}
            >
              {moduleLabels[module]}
            </span>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["todo", "playing", "wishlist", "done", "published", "unknown"].map((status) => (
            <StatusBadge key={status} value={status} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <EmptyState
          title="这里还没有记录"
          description="等你开始添加内容后，这块会变成列表、封面墙或时间线。"
          actionLabel="先放一个按钮"
        />
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-base font-semibold text-ink">确认与只读评分</h2>
          <div className="space-y-4">
            <ConfirmDialog
              trigger={
                <Button type="button" variant="destructive">
                  <Trash2 className="size-4" />
                  删除示例
                </Button>
              }
              title="确认删除这条示例？"
              description="这只是 playground 示例，不会删除任何真实数据。"
              confirmLabel="确认删除"
              onConfirm={() => undefined}
            />
            <RatingStars value={8} />
          </div>
        </div>
      </section>

      <PlaygroundTagDemo />

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">MarkdownRenderer</h2>
        <MarkdownRenderer value={markdownSample} />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink">对比度样例区</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {contrastThemes.map((theme) => (
            <div key={theme.label} className={`${theme.className} rounded-xl border border-border bg-bg p-5 text-ink`}>
              <h3 className="mb-4 text-sm font-semibold">{theme.label}</h3>
              <div className="space-y-3">
                {swatches.map((swatch) => (
                  <p key={swatch} className="text-sm" style={{ color: `var(${swatch})` }}>
                    {swatch}：14px 小字示例，用来人工检查弱文字与链接色是否清晰。
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
