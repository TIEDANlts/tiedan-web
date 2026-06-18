"use client";

export function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

export function fieldClass() {
  return "block space-y-2 text-sm font-medium text-ink";
}
