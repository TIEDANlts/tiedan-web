import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isPublicPath } from "@/lib/auth/routes";

// /login：Stage 1 登录页。
// /：Stage 0 公开首页，Stage 16 登录后切换为仪表盘。
// /blog/**：Stage 5 公开博客。
// /nav：Stage 3 公开导航页。
// /rss.xml：Stage 5 公开 RSS。
// /uploads/**：Stage 5 公开静态文件。
// /api/auth/**：Stage 1 Auth.js API。
// /api/health：Stage 1 部署健康检查。
// /api/posts/view：Stage 5 文章浏览量上报。
// /api/quick/**：Stage 13 快捷记账 Bearer Token API。
// /_next/**：Stage 0 Next.js 静态资源。
// /favicon.ico 与 public SVG：Stage 0 静态资源。

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const from = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  loginUrl.searchParams.set("from", from);

  return NextResponse.redirect(loginUrl);
}

export default async function middleware(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
