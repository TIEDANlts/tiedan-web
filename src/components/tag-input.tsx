"use client";

import { X } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";

type TagInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxTags?: number;
};

export function TagInput({ value, onChange, placeholder = "输入后按回车添加", maxTags }: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  function addTag(raw: string) {
    const next = raw.trim();

    if (!next || value.includes(next) || (maxTags && value.length >= maxTags)) {
      return;
    }

    onChange([...value, next]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-7 items-center gap-1 rounded-pill bg-surface-2 px-3 text-xs font-medium text-ink"
          >
            {tag}
            <button type="button" aria-label={`删除 ${tag}`} onClick={() => onChange(value.filter((item) => item !== tag))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addTag(draft);
          }
        }}
        onBlur={() => addTag(draft)}
      />
    </div>
  );
}
