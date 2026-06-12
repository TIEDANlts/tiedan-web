# 项目进度

## 当前状态
- 进行中：Stage 1（待开始）
- 已完成：Stage 0
- 线上版本：（未上线）

---

## Stage 日志（倒序追加）

### Stage 0 · 项目初始化 —— 2026-06-12 完成
- 完成内容：完成 Next.js + TypeScript + Tailwind v4 项目骨架，接入 shadcn/ui、Prisma + PostgreSQL、主题 token、dayjs 上海时区工具与 Vitest 测试链路。
- 关键文件：`src/app/globals.css` 主题 token；`src/app/layout.tsx` 字体与 ThemeProvider；`src/components/ui/*` shadcn 组件；`prisma/schema.prisma` User/Setting 模型；`src/lib/dayjs.ts` 上海时区工具；`docker-compose.dev.yml` 本地 PostgreSQL 配置。
- 关键决定与偏离：Prisma 7 已移除 schema 内 datasource url，当前使用 `prisma.config.ts` 读取 `DATABASE_URL`；其余与 PLAN.md Stage 0 一致。
- 遗留 TODO：Stage 1 接入 Auth.js v5 beta、单用户认证与权限白名单；后续组件继续使用 `globals.css` 与 `src/lib/design.ts` 的 token，禁止散写 hex。
- 验证：`npm run check` ✅；`npx prisma validate` ✅；`npx prisma generate` ✅；`docker compose -f docker-compose.dev.yml up -d` ✅（通过 Ubuntu WSL Docker）；`npx prisma migrate dev --name init_user_setting` ✅；`npx prisma migrate status` ✅。
