# 铁蛋的个人网站

单用户个人生活管理网站：游戏 / 书影 / 旅行 / 博客 / 消费 / 待办日历 / 导航 / 首页聚合。

当前进度：Stage 2 已完成，Stage 3 待开始。Stage 2 已接入登录后的侧边栏布局、移动端抽屉、公开页极简顶栏、通用组件库和 `/admin/playground` 临时验收页。

## 本地环境

- Node.js / npm：使用仓库锁定版本安装依赖。
- PostgreSQL：通过 WSL `Ubuntu-24.04` 里的 Docker 启动；Windows PowerShell 中没有 `docker` 命令。
- 环境变量：复制 `.env.example` 到 `.env`，至少配置：
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`

`AUTH_SECRET` 应使用随机值，例如：

```powershell
node -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

## 本地启动

1. 安装依赖：

```powershell
npm.cmd install
```

2. 启动 WSL Docker 里的 PostgreSQL：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose -f docker-compose.dev.yml up -d"
```

如果 Windows 侧 Node/Prisma 报 `ECONNREFUSED`，通常是 WSL 发行版退出导致端口转发失效。测试期间保持一个 WSL 会话存活，或临时运行：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose -f docker-compose.dev.yml up -d && sleep 300"
```

3. 确认数据库可达：

```powershell
Test-NetConnection -ComputerName localhost -Port 5432
npx.cmd prisma migrate status
```

4. 初始化管理员账号：

```powershell
npm.cmd run db:seed
```

5. 启动开发服务器：

```powershell
npm.cmd run dev
```

访问 `/login` 后使用 `.env` 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录。`/todos` 是 Stage 1 用于验证权限保护的临时私密页面。

## 常用命令

```powershell
npm.cmd run check
npx.cmd prisma generate
npx.cmd prisma migrate status
npm.cmd run db:seed
```

`npm.cmd run check` 包含 TypeScript 类型检查、ESLint 和 Vitest。

Stage 2 新增 Markdown 渲染依赖：`react-markdown@10.1.0`、`remark-gfm@4.0.1`、`rehype-pretty-code@0.14.3`、`shiki@4.2.0`。

## 当前功能

- 公开路由：`/login`、`/`、`/blog/**`、`/nav`、`/rss.xml`、`/uploads/**`、`/api/auth/**`、`/api/health`、`/api/posts/view`、`/api/quick/**`。
- 私密路由：除白名单外默认要求登录；登录后 `/` 显示仪表盘占位页和私密侧边栏。
- 登录：Auth.js v5 Credentials，bcrypt 校验 `User.passwordHash`，JWT session 30 天。
- Seed：`scripts/seed.ts` 幂等创建 / 更新唯一管理员。
- 私密布局：桌面端固定侧边栏，移动端汉堡抽屉；菜单包含仪表盘、待办、日历、游戏、书影、旅行、消费、博客管理、导航管理和设置。
- 公开布局：`/blog`、`/nav`、`/login` 使用 `theme-public` 顶栏和编辑部 token。
- 通用组件：`PageHeader`、`EmptyState`、`ConfirmDialog`、`TagInput`、`StatusBadge`、`RatingStars`、`MarkdownEditor`、`MarkdownRenderer`。
- 临时验收页：登录后访问 `/admin/playground`，可检查通用组件、模块色、MarkdownRenderer、亮/暗模式和对比度样例区。
- 健康检查：`GET /api/health` 返回 `{ ok: true }`。

## 约定

- 全站文案使用中文；本项目永远只有一个用户，不做注册 / 多租户。
- 主题 token 已接入，后续组件不得散写 hex；颜色、圆角和模块色应来自 `src/app/globals.css` 与 `src/lib/design.ts`。
- 每个 Stage 完成后必须更新 `docs/PROGRESS.md` 和本 README，并逐条对照 `docs/PLAN.md` 的验收标准。
