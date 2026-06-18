"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveChecklistAction } from "@/modules/trips/actions";
import type { TripDetail } from "@/modules/trips/queries";

export function TripChecklistEditor({ trip }: { trip: TripDetail }) {
  const router = useRouter();
  const [items, setItems] = useState(trip.checklist);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(nextItems = items) {
    startTransition(async () => {
      const result = await saveChecklistAction(trip.id, nextItems);
      setMessage(result.message);
      router.refresh();
    });
  }

  function addItem() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    const next = [...items, { id: crypto.randomUUID(), text, done: false }];
    setItems(next);
    setDraft("");
    save(next);
  }

  return (
    <section className="space-y-3 rounded-xl border border-module-trips/25 bg-module-trips/8 p-4">
      <h2 className="font-heading text-xl font-semibold text-ink">行前清单</h2>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="例如：订酒店、确认签证、下载离线地图"
        />
        <Button type="button" onClick={addItem} disabled={isPending}>
          <Plus className="size-4" />
          添加
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={item.done}
              onChange={(event) => {
                const next = items.map((row) => (row.id === item.id ? { ...row, done: event.target.checked } : row));
                setItems(next);
                save(next);
              }}
              className="size-4 accent-[var(--module-trips)]"
            />
            <span className={cn("flex-1", item.done && "text-ink-3 line-through")}>{item.text}</span>
            <button
              type="button"
              onClick={() => {
                const next = items.filter((row) => row.id !== item.id);
                setItems(next);
                save(next);
              }}
              className="text-ink-3 hover:text-destructive"
              aria-label={`删除 ${item.text}`}
            >
              <Trash2 className="size-4" />
            </button>
          </label>
        ))}
      </div>
      {message ? <p className="text-xs text-module-trips">{message}</p> : null}
    </section>
  );
}
