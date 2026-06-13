"use client";

import { Star } from "lucide-react";

import { getRatingStars } from "@/lib/rating";
import { cn } from "@/lib/utils";

type RatingStarsProps = {
  value: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  className?: string;
};

export function RatingStars({ value, editable = false, onChange, className }: RatingStarsProps) {
  const stars = getRatingStars(value);

  return (
    <div className={cn("inline-flex items-center gap-1", className)} aria-label={`评分 ${value}/10`}>
      {stars.map((fill, index) => {
        const score = (index + 1) * 2;
        const icon = (
          <span className="relative inline-flex size-5 text-primary">
            <Star className={cn("size-5", fill === "empty" ? "fill-transparent opacity-35" : "fill-current")} />
            {fill === "half" && (
              <span className="absolute inset-y-0 left-1/2 overflow-hidden text-ink-3">
                <Star className="size-5 -translate-x-1/2 fill-current" />
              </span>
            )}
          </span>
        );

        if (!editable) {
          return <span key={score}>{icon}</span>;
        }

        return (
          <button key={score} type="button" title={`设为 ${score} 分`} onClick={() => onChange?.(score)}>
            {icon}
          </button>
        );
      })}
    </div>
  );
}
