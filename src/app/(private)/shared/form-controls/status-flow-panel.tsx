"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

const moduleClasses = {
  games: {
    bg: "bg-module-games/10",
    text: "text-module-games",
  },
  media: {
    bg: "bg-module-media/10",
    text: "text-module-media",
  },
} as const;

export function StatusFlowPanel({
  module,
  badge,
  buttonLabel,
  pending,
  message,
  warning,
  onAdvance,
}: {
  module: "games" | "media";
  badge: ReactNode;
  buttonLabel?: string | null;
  pending: boolean;
  message: string | null;
  warning: string | null;
  onAdvance: () => void;
}) {
  const classes = moduleClasses[module];

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg ${classes.bg} p-3`}>
      {badge}
      {buttonLabel ? (
        <Button type="button" size="sm" onClick={onAdvance} disabled={pending}>
          {pending ? "正在更新..." : buttonLabel}
        </Button>
      ) : null}
      {message ? <span className="text-sm text-ink-2">{message}</span> : null}
      {warning ? <span className={`text-sm ${classes.text}`}>{warning}</span> : null}
    </div>
  );
}
