"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTripOverviewAction } from "@/modules/trips/actions";
import { initialTripActionState } from "@/modules/trips/action-state";
import type { TripDetail } from "@/modules/trips/queries";
import { tripStatusLabels } from "@/modules/trips/utils";
import { FieldError, fieldClass } from "./trip-detail-parts";

export function TripOverviewForm({ trip }: { trip: TripDetail }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateTripOverviewAction, initialTripActionState);
  const [destinations, setDestinations] = useState<string[]>(trip.destinations);
  const [summaryMd, setSummaryMd] = useState(trip.summaryMd);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  const preview = useMemo(
    () => <MarkdownRenderer value={summaryMd || "还没有写总结。"} />,
    [summaryMd],
  );

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <input type="hidden" name="id" value={trip.id} />
      <input type="hidden" name="destinations" value={destinations.join(",")} />
      <input type="hidden" name="summaryMd" value={summaryMd} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldClass()}>
          <span>标题</span>
          <Input name="title" defaultValue={trip.title} />
          <FieldError>{state.errors?.title}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>状态</span>
          <select name="status" defaultValue={trip.status} className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50">
            {(["PLANNED", "DONE"] as const).map((status) => (
              <option key={status} value={status}>
                {tripStatusLabels[status]}
              </option>
            ))}
          </select>
          <FieldError>{state.errors?.status}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>开始日期</span>
          <Input name="startDate" type="date" defaultValue={trip.startDate} />
          <FieldError>{state.errors?.startDate}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>结束日期</span>
          <Input name="endDate" type="date" defaultValue={trip.endDate} />
          <FieldError>{state.errors?.endDate}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>封面 URL</span>
          <Input name="coverUrl" defaultValue={trip.coverUrl ?? ""} placeholder="/uploads/trips/covers/..." />
          <FieldError>{state.errors?.coverUrl}</FieldError>
        </label>
        <label className={fieldClass()}>
          <span>预算</span>
          <Input name="budget" defaultValue={trip.budget ?? ""} inputMode="decimal" placeholder="例如 3000.00" />
          <FieldError>{state.errors?.budget}</FieldError>
        </label>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">目的地</span>
        <TagInput value={destinations} onChange={setDestinations} placeholder="输入目的地后回车" />
        <FieldError>{state.errors?.destinations}</FieldError>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">总结</span>
        <MarkdownEditor value={summaryMd} onChange={setSummaryMd} preview={preview} />
      </div>
      {state.message ? <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "正在保存..." : "保存概览"}
        </Button>
      </div>
    </form>
  );
}
