"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSpecialDayAction, type SpecialDayActionState } from "@/modules/special-days/actions";

const initialState: SpecialDayActionState = {
  ok: false,
  message: null,
};

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

export function SpecialDayQuickForm({
  date,
  onSaved,
}: {
  date: string;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createSpecialDayAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onSaved?.();
    }
  }, [onSaved, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="date" value={date} />
      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>名称</span>
        <Input name="title" autoComplete="off" placeholder="生日、纪念日、缴费日..." />
        <FieldError>{state.errors?.title}</FieldError>
      </label>
      <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
        <label className="block space-y-2 text-sm font-medium text-ink">
          <span>图标</span>
          <Input name="icon" autoComplete="off" placeholder="🎂" maxLength={12} />
          <FieldError>{state.errors?.icon}</FieldError>
        </label>
        <label className="block space-y-2 text-sm font-medium text-ink">
          <span>备注</span>
          <Input name="note" autoComplete="off" placeholder="可选" />
          <FieldError>{state.errors?.note}</FieldError>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="yearlyRepeat"
          defaultChecked
          className="size-4 rounded border-border text-primary accent-primary"
        />
        每年重复
      </label>
      {state.message ? (
        <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}
      <FieldError>{state.errors?.date}</FieldError>
      <FieldError>{state.errors?.form}</FieldError>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中..." : "保存重要日子"}
        </Button>
      </div>
    </form>
  );
}
