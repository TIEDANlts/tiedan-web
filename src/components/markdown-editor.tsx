"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  preview: React.ReactNode;
};

export function MarkdownEditor({ value, onChange, preview }: MarkdownEditorProps) {
  return (
    <Tabs defaultValue="edit" className="gap-3">
      <TabsList>
        <TabsTrigger value="edit">编辑</TabsTrigger>
        <TabsTrigger value="preview">预览</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-64 w-full resize-y rounded-lg border border-border bg-surface p-4 text-sm leading-7 text-ink outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
          placeholder="写点什么，支持 Markdown。"
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-64 rounded-lg border border-border bg-surface p-4">{preview}</div>
      </TabsContent>
    </Tabs>
  );
}
