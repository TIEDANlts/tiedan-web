export type StarFill = "full" | "half" | "empty";

export function clampRating(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(10, Math.max(0, value));
}

export function getRatingStars(value: number): StarFill[] {
  const normalized = clampRating(value);

  return Array.from({ length: 5 }, (_, index) => {
    const threshold = index * 2;

    if (normalized >= threshold + 2) {
      return "full";
    }

    if (normalized >= threshold + 1) {
      return "half";
    }

    return "empty";
  });
}
