export const moduleColors = {
  games: "#8A4FA0",
  media: "#D08A1E",
  trips: "#1F9E86",
  expenses: "#D6537E",
  todos: "#3B82C4",
  posts: "#8C2F39",
  links: "#64748B",
  specialDays: "#F59E0B",
} as const;

export type ModuleColorKey = keyof typeof moduleColors;

export const moduleColorVars = {
  games: "var(--module-games)",
  media: "var(--module-media)",
  trips: "var(--module-trips)",
  expenses: "var(--module-expenses)",
  todos: "var(--module-todos)",
  posts: "var(--module-posts)",
  links: "var(--module-links)",
  specialDays: "var(--module-special-days)",
} as const satisfies Record<ModuleColorKey, string>;

export const moduleLabels = {
  games: "游戏",
  media: "书影",
  trips: "旅行",
  expenses: "消费",
  todos: "待办",
  posts: "博客",
  links: "导航",
  specialDays: "重要日子",
} as const satisfies Record<ModuleColorKey, string>;

export type StatusColor = {
  label: string;
  color: string;
};

export const statusColorMap = {
  todo: { label: "待处理", color: moduleColors.todos },
  doing: { label: "进行中", color: moduleColors.todos },
  playing: { label: "进行中", color: moduleColors.games },
  planned: { label: "计划中", color: moduleColors.trips },
  wishlist: { label: "想看", color: moduleColors.media },
  draft: { label: "草稿", color: moduleColors.links },
  published: { label: "已发布", color: moduleColors.posts },
  done: { label: "完成", color: moduleColors.trips },
  archived: { label: "归档", color: moduleColors.links },
} as const satisfies Record<string, StatusColor>;

export function isModuleColorKey(value: string): value is ModuleColorKey {
  return value in moduleColors;
}

export function getModuleColor(module: string | ModuleColorKey) {
  return isModuleColorKey(module) ? moduleColors[module] : moduleColors.links;
}

export function getModuleColorVar(module: string | ModuleColorKey) {
  return isModuleColorKey(module) ? moduleColorVars[module] : moduleColorVars.links;
}

export function getStatusColor(status: string, map: Record<string, StatusColor> = statusColorMap) {
  return map[status] ?? { label: "未分类", color: moduleColors.links };
}
