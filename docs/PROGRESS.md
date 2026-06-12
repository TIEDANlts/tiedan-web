# 项目进度

## 当前状态
- 进行中：Stage 1（待开始）
- 已完成：Stage 0
- 线上版本：（未上线）

---

## Stage 日志（倒序追加）

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
