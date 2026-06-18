"use client";

import { TagInput } from "@/components/tag-input";

export function TagField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-ink">标签</span>
      <TagInput value={value} onChange={onChange} placeholder="输入标签后回车" />
    </div>
  );
}
