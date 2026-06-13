type PublicRoute = {
  prefix?: string;
  exact?: string;
  description: string;
};

export const publicRoutes: PublicRoute[] = [
  { exact: "/login", description: "Stage 1：登录页" },
  { exact: "/", description: "Stage 0：公开首页，Stage 16 登录后切仪表盘" },
  { exact: "/blog", description: "Stage 5：公开博客列表" },
  { prefix: "/blog/", description: "Stage 5：公开博客详情" },
  { exact: "/nav", description: "Stage 3：公开导航页" },
  { exact: "/rss.xml", description: "Stage 5：公开 RSS" },
  { prefix: "/uploads/", description: "Stage 5：公开上传静态文件" },
  { prefix: "/api/auth/", description: "Stage 1：Auth.js API" },
  { exact: "/api/health", description: "Stage 1：部署健康检查" },
  { exact: "/api/posts/view", description: "Stage 5：文章浏览量上报" },
  { prefix: "/api/quick/", description: "Stage 13：快捷记账 Bearer Token API" },
  { prefix: "/_next/", description: "Stage 0：Next.js 静态资源" },
  { exact: "/favicon.ico", description: "Stage 0：站点图标" },
  { exact: "/file.svg", description: "Stage 0：默认 public 静态资源" },
  { exact: "/globe.svg", description: "Stage 0：默认 public 静态资源" },
  { exact: "/next.svg", description: "Stage 0：默认 public 静态资源" },
  { exact: "/vercel.svg", description: "Stage 0：默认 public 静态资源" },
  { exact: "/window.svg", description: "Stage 0：默认 public 静态资源" },
];

export function isPublicPath(pathname: string) {
  return publicRoutes.some((route) => {
    if (route.exact && pathname === route.exact) {
      return true;
    }

    return Boolean(route.prefix && pathname.startsWith(route.prefix));
  });
}

export function safeFromPath(from: string | null) {
  if (!from?.startsWith("/")) {
    return "/";
  }

  if (from.startsWith("//")) {
    return "/";
  }

  return from;
}
