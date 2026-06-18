"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { updateTripDayNoteAction } from "@/modules/trips/actions";
import type { TripDayItem } from "@/modules/trips/queries";

export function TripDayNoteEditor({
  day,
  onMessage,
}: {
  day: TripDayItem;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const [noteMd, setNoteMd] = useState(day.noteMd);
  const [isPending, startTransition] = useTransition();
  const preview = useMemo(() => <MarkdownRenderer value={noteMd || "今天还没有笔记。"} />, [noteMd]);

  function saveNote() {
    startTransition(async () => {
      const result = await updateTripDayNoteAction(day.id, noteMd);
      onMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">当天笔记</h3>
        <Button type="button" variant="outline" size="sm" onClick={saveNote} disabled={isPending}>
          <Save className="size-4" />
          保存笔记
        </Button>
      </div>
      <MarkdownEditor value={noteMd} onChange={setNoteMd} preview={preview} />
    </div>
  );
}
