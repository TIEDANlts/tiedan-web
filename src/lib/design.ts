export const moduleColors = {
  games: "var(--module-games)",
  media: "var(--module-media)",
  trips: "var(--module-trips)",
  expenses: "var(--module-expenses)",
  todos: "var(--module-todos)",
  posts: "var(--module-posts)",
  links: "var(--module-links)",
  specialDays: "var(--module-special-days)",
} as const;

export type ModuleColorKey = keyof typeof moduleColors;
