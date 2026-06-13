# 项目进度

## 当前状态
- 进行中：Stage 3（待开始）
- 已完成：Stage 0、Stage 1、Stage 2
- 线上版本：（未上线）

---

## Stage 日志（倒序追加）

### Stage 2 · 整体布局与通用组件 —— 2026-06-13 完成
- 完成内容：实现登录后的 `theme-private` 私密外壳，桌面固定侧边栏、移动端汉堡抽屉、当前路由高亮、退出登录与亮/暗/跟随系统主题切换；补齐仪表盘、待办、日历、游戏、书影、旅行、消费、博客管理、导航管理、设置中文占位页；实现 `theme-public` 公开顶栏与 `/blog`、`/nav` 占位页；新增通用组件 `PageHeader`、`EmptyState`、`ConfirmDialog`、`TagInput`、`StatusBadge`、`RatingStars`、`MarkdownEditor`、`MarkdownRenderer`；新增 `/admin/playground` 临时验收页和四组合对比度样例区。
- 关键文件：`src/app/page.tsx` 根路由登录/未登录双态入口；`src/components/app-shell.tsx` 公开/私密布局外壳；`src/lib/design.ts` 模块色与状态色工具；`src/lib/rating.ts` 10 分制到 5 星半星映射；`src/components/*` 通用组件；`src/app/(private)/admin/playground/page.tsx` 临时演示页。
- 关键决定与偏离：新增并锁定 `react-markdown@10.1.0`、`remark-gfm@4.0.1`、`rehype-pretty-code@0.14.3`、`shiki@4.2.0`；`/` 按本轮确认实现为双态根路由，未登录展示公开首页，登录后展示仪表盘占位与私密外壳；公开暗色 `--primary/--accent` 从 PLAN 的 `#C25B65` 微调为 `#C9636D`，因为对 `--bg #14130F` 的对比度从 4.41:1 提升到 4.86:1，满足 Stage 2 对链接色 ≥ 4.5:1 的验收要求。
- Stage 2 验收：通过 - 登录后看到侧边栏布局，所有入口指向占位页；通过 - 375px 宽度下侧边栏变为抽屉，结构使用 `w-[min(20rem,calc(100vw-2rem))]` 避免横向溢出；通过 - `/admin/playground` 渲染全部通用组件，MarkdownRenderer 使用 react-markdown、remark-gfm、rehype-pretty-code/Shiki；通过 - 演示页展示亮/暗模式、公开/私密 token 差异、StatusBadge 与模块色；通过 - 对比度抽查：公开亮 `--ink-3` 4.58、公开亮 `--primary` 7.78、公开暗 `--ink-3` 5.01、公开暗 `--primary` 4.86、私密亮 `--ink-3` 4.70、私密亮 `--primary` 4.99、私密暗 `--ink-3` 4.98、私密暗 `--primary` 5.95；通过 - `/nav` 公开占位页使用 public layout；通过 - `npm run check` 全绿。
- 遗留 TODO：`/admin/playground` 是临时验收页，Stage 16 收尾删除；Stage 3 接入真实导航数据与管理页；Stage 4 替换 `/todos` 占位为真实待办。
- 验证：`npx vitest run src/lib/design.test.ts src/lib/rating.test.ts` ✅；`npx next typegen` ✅；`npx tsc --noEmit` ✅；`npm run lint` ✅；`npx vitest run` ✅；`npm run check` ✅；额外尝试 `npm run build`，当前环境因既有 `next/font/google` 需要抓取 Google Fonts 而失败（`Failed to fetch Inter/Fraunces/Nunito/Space Grotesk`），不属于 Stage 2 完成定义，后续应按字体策略改为真正自托管字体或提供可用构建网络。

### Stage 1 · 认证与权限框架 —— 2026-06-13 完成
- 完成内容：接入 Auth.js v5 Credentials 单用户登录，使用 bcrypt 校验 `User.passwordHash`，JWT session 有效期 30 天；实现默认私密的中间件白名单、登录页、退出登录、管理员 seed、健康检查接口与 `/todos` 私密占位页。
- 关键文件：`src/auth.ts` Auth.js 配置；`src/middleware.ts` 登录保护与公开白名单；`src/app/(public)/login/*` 登录页与 Server Action；`src/app/(private)/layout.tsx` 私密布局二次 session 校验与退出登录；`scripts/seed.ts` 管理员幂等初始化；`src/lib/auth/*` 路由白名单与登录限流工具。
- 关键决定与偏离：`next-auth` 精确锁定为 `5.0.0-beta.30` 并回填 `AGENTS.md`；新增 `bcrypt@6.0.0`、`tsx@4.20.6`、`@types/bcrypt@6.0.0` 与 Prisma 7 运行所需的 `@prisma/adapter-pg@7.8.0`。本次仅做 Stage 1 临时私密外壳，完整私密导航留到 Stage 2。
- 遗留 TODO：Stage 2 实现正式登录后布局、侧边栏、移动端导航与各模块占位页；Stage 5/13 启用已放行的 `/api/posts/view` 与 `/api/quick/**` 具体业务逻辑。
- 验证：`npx prisma generate` ✅；`npx tsc --noEmit` ✅；`npm run lint` ✅；`npx vitest run` ✅；`npm run check` ✅；`npm run db:seed` 已执行到数据库写入，当前环境 PostgreSQL 未启动/不可达（`ECONNREFUSED`，且本 shell 无 `docker` 命令），需在数据库可用后重跑。

### Stage 0 · 项目初始化 —— 2026-06-12 完成
- 完成内容：完成 Next.js + TypeScript + Tailwind v4 项目骨架，接入 shadcn/ui、Prisma + PostgreSQL、主题 token、dayjs 上海时区工具与 Vitest 测试链路。
- 关键文件：`src/app/globals.css` 主题 token；`src/app/layout.tsx` 字体与 ThemeProvider；`src/components/ui/*` shadcn 组件；`prisma/schema.prisma` User/Setting 模型；`src/lib/dayjs.ts` 上海时区工具；`docker-compose.dev.yml` 本地 PostgreSQL 配置。
- 关键决定与偏离：Prisma 7 已移除 schema 内 datasource url，当前使用 `prisma.config.ts` 读取 `DATABASE_URL`；其余与 PLAN.md Stage 0 一致。
- 遗留 TODO：Stage 1 接入 Auth.js v5 beta、单用户认证与权限白名单；后续组件继续使用 `globals.css` 与 `src/lib/design.ts` 的 token，禁止散写 hex。
- 验证：`npm run check` ✅；`npx prisma validate` ✅；`npx prisma generate` ✅；`docker compose -f docker-compose.dev.yml up -d` ✅（通过 Ubuntu WSL Docker）；`npx prisma migrate dev --name init_user_setting` ✅；`npx prisma migrate status` ✅。
