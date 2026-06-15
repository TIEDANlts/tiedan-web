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
  { exact: "/api/cron/steam-sync", description: "Stage 8：Steam 同步 Bearer Token API" },
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
  if (typeof from !== "string") {
    return "/";
  }

  // 浏览器在解析 URL 前会先剥离 Tab / 换行 / 回车，这里按同样方式清洗，避免用控制字符绕过下面的校验。
  const cleaned = from.replace(/[\t\n\r]/g, "");

  // 必须是站内绝对路径：以单个 "/" 开头，且第二个字符不是 "/" 或 "\"。
  // 否则 "//host" 或 "/\host" 会被浏览器解析成协议相对地址，跳转到外部域名（开放重定向）。
  if (!/^\/(?![/\\])/.test(cleaned)) {
    return "/";
  }

  // 反斜杠在 http(s) URL 解析中等价于 "/"，出现在任意位置都可能逃逸到外部域名，一律拒绝。
  if (cleaned.includes("\\")) {
    return "/";
  }

  return cleaned;
}
