"use client";

import { RatingStars } from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { FieldError } from "./form-field";

export function RatingField({
  value,
  onChange,
  error,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-ink">评分</span>
      <div className="flex flex-wrap items-center gap-3">
        <RatingStars value={value ?? 0} editable onChange={onChange} />
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          清除评分
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
