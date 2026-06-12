# 项目进度

## 当前状态
- 进行中：Stage 0
- 已完成：（无）
- 线上版本：（未上线）

---

## Stage 日志（倒序追加）

### Stage 0 · 项目初始化 —— 进行中
- 完成内容：已生成 Next.js + TypeScript + Tailwind v4 项目骨架，接入 shadcn/ui、Prisma schema、主题 token、dayjs 工具与 Vitest 示例测试。
- 关键文件：`src/app/globals.css` 主题 token；`src/app/layout.tsx` 字体与 ThemeProvider；`src/components/ui/*` shadcn 组件；`prisma/schema.prisma` User/Setting 模型；`src/lib/dayjs.ts` 上海时区工具；`docker-compose.dev.yml` 本地 PostgreSQL 配置。
- 关键决定与偏离：Prisma 7 已移除 schema 内 datasource url，当前使用 `prisma.config.ts` 读取 `DATABASE_URL`；PowerShell 当前环境没有 `docker` 命令，Ubuntu WSL 内 Docker 可用但 Docker Hub 拉取 `postgres:16` 超时，迁移 SQL 由 `prisma migrate diff` 离线生成，尚未通过 `migrate dev` 应用到数据库。
- 遗留 TODO：Docker 在 Ubuntu WSL 内可用，但拉取 `postgres:16` 时 Docker Hub 超时；网络恢复后需要运行 `docker compose -f docker-compose.dev.yml up -d` 与 `npx prisma migrate dev` 完成数据库验收。
- 验证：`npm run check` ✅；`npx prisma validate` ✅；`npx prisma generate` ✅；`docker compose` 未运行成功，因为 Docker Hub 拉取 `postgres:16` 超时。
