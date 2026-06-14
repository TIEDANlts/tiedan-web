# 铁蛋的个人网站

单用户个人生活管理网站：游戏 / 书影 / 旅行 / 博客 / 消费 / 待办日历 / 导航 / 首页聚合。

当前进度：Stage 6A 已完成本地生产化准备；Stage 0-5 已完成，真实上线部署与云端备份验收延后到最终上线阶段。Stage 6A 已接入 standalone 构建、生产 Docker/Compose/Caddy 模板、手动部署门、备份脚本、Playwright 冒烟测试和部署手册。

## 本地环境

- Node.js / npm：使用仓库锁定版本安装依赖。
- PostgreSQL：通过 WSL `Ubuntu-24.04` 里的 Docker 启动；Windows PowerShell 中没有 `docker` 命令。
- 环境变量：复制 `.env.example` 到 `.env`，至少配置：
  - `DATABASE_URL`
  - `AUTH_SECRET`
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `SITE_URL`（RSS 与公开链接用；本地可用 `http://localhost:3000`）
  - `UPLOAD_DIR`（上传根目录；本地可留空以回退到 `public/uploads`，生产建议挂载 `/data/uploads`）
  - `OUTBOUND_PROXY`（可选；外部图片和后续出海 API 请求代理）
  - `ICP_BEIAN_NO` / `GONGAN_BEIAN_NO`（可选；配置后公开页脚展示备案信息）
  - `BASE_URL`（e2e 使用；本地可用 `http://localhost:3000`）

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

访问 `/login` 后使用 `.env` 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录。`/todos` 是真实待办页面，`/admin/posts` 是博客管理入口，未登录访问私密页面会被重定向到登录页。

## 常用命令

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run e2e
npx.cmd prisma generate
npx.cmd prisma migrate dev
npx.cmd prisma migrate status
npm.cmd run db:seed
```

`npm.cmd run check` 包含 TypeScript 类型检查、ESLint 和 Vitest。`npm.cmd run e2e` 使用 Playwright，需要先启动站点并配置 `BASE_URL`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`。

Stage 2 新增 Markdown 渲染依赖：`react-markdown@10.1.0`、`remark-gfm@4.0.1`、`rehype-pretty-code@0.14.3`、`shiki@4.2.0`。

Stage 3 新增拖拽排序依赖：`@dnd-kit/core@6.3.1`、`@dnd-kit/sortable@10.0.0`、`@dnd-kit/utilities@3.2.2`。

Stage 4 未新增第三方依赖；Popover 复用已安装的 `radix-ui@1.5.0` 聚合包。

Stage 5 新增图片处理与出站请求依赖：`sharp@0.35.1`、`undici@6.26.0`。上传图片会经过 `rotate()` 旋正、长边 2000px 压缩、jpeg/webp 质量 82 重编码去 EXIF/GPS，并额外生成 480px 缩略图；外部 favicon/图片下载统一经 `src/lib/http.ts`，支持 10 秒超时、一次重试与可选 `OUTBOUND_PROXY`。

Stage 6A 新增冒烟测试依赖：`@playwright/test@1.60.0`。生产化准备文件包括 `Dockerfile`、`docker-compose.prod.yml`、`Caddyfile`、`.env.production.example`、`.github/workflows/deploy.yml`、`scripts/backup.sh` 和 `docs/DEPLOY.md`。真实服务器、HTTPS、对象存储加密备份、Healthchecks 和自动部署验收留到最终上线阶段。

生产 Compose 配置检查（通过 WSL Docker）：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && APP_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.prod.yml config"
```

## 当前功能

- 公开路由：`/login`、`/`、`/blog/**`、`/nav`、`/rss.xml`、`/uploads/**`、`/api/auth/**`、`/api/health`、`/api/posts/view`、`/api/quick/**`。
- 私密路由：除白名单外默认要求登录；登录后 `/` 显示仪表盘占位页和私密侧边栏。
- 登录：Auth.js v5 Credentials，bcrypt 校验 `User.passwordHash`，JWT session 30 天。
- Seed：`scripts/seed.ts` 幂等创建 / 更新唯一管理员。
- 私密布局：桌面端固定侧边栏，移动端汉堡抽屉；菜单包含仪表盘、待办、日历、游戏、书影、旅行、消费、博客管理、导航管理和设置。
- 公开布局：`/blog`、`/nav`、`/login` 使用 `theme-public` 顶栏和编辑部 token。
- 导航页：`/nav` 公开展示 Link 数据，按分组渲染链接卡片，支持标题、描述和分组本地搜索；未缓存到 favicon 时使用首字母色块回退。
- 导航管理：`/admin/links` 支持新增、编辑、删除链接；未填写图标时服务端尝试抓取目标站 favicon 并保存到 `public/uploads/favicons`；同组链接支持拖拽排序并即时保存。
- 待办：`/todos` 私密页面按今天、收集箱、未来 7 天展示；今天区包含逾期项并显示“逾期 N 天”，支持全部顺延到今天；顶部可连续快速添加到今天、收集箱或指定日期。
- 待办行内操作：支持完成/取消完成、优先级 0/1/2 切换、Popover 改日期和删除；完成项保留在列表中并沉底显示删除线。
- 博客管理：`/admin/posts` 支持状态筛选、标题搜索、新建、编辑、存草稿、发布、撤回和删除；编辑页含标题、slug、分类、标签、摘要、Markdown 正文和粘贴图片自动上传。
- 公开博客：`/blog` 与 `/blog/page/[page]` 展示已发布文章列表；`/blog/[slug]` 展示详情、桌面 TOC、上一篇/下一篇；草稿公开端 404。
- 公开渲染策略：Stage 6A 为保证 `npm run build` 与 Docker/CI 构建不依赖构建期数据库，`/blog`、`/nav`、`/rss.xml` 暂时动态渲染；恢复静态化前需要重新设计构建期数据源或 ISR 策略。
- 上传与文件：`POST /api/upload` 仅登录可用；`GET /uploads/**` 只服务 public 区文件并带长缓存头，匿名可访问博客图片。
- RSS 与浏览量：`/rss.xml` 输出最近 20 篇已发布文章；详情页客户端挂载后通过 `/api/posts/view` 上报浏览量，同 IP 同文章短时去抖。
- 通用组件：`PageHeader`、`EmptyState`、`ConfirmDialog`、`TagInput`、`StatusBadge`、`RatingStars`、`MarkdownEditor`、`MarkdownRenderer`。
- 临时验收页：登录后访问 `/admin/playground`，可检查通用组件、模块色、MarkdownRenderer、亮/暗模式和对比度样例区。
- 健康检查：`GET /api/health` 返回 `{ ok: true }`。
- 生产化准备：`next.config.ts` 已开启 standalone 输出；生产镜像入口会先执行 `prisma migrate deploy` 再启动 `server.js`；Caddy 模板会在最终上线时直出 `/uploads/**` public 文件。
- CI/CD：GitHub Actions 的 quality job 在 push/PR 自动运行；build-and-deploy job 只允许手动触发，当前阶段不会误部署。
- 备份：`scripts/backup.sh` 已提供 PostgreSQL + uploads 打包、rclone crypt 上传、30 天清理和 Healthchecks ping 逻辑；真实对象存储恢复演练最终上线时执行。

## 约定

- 全站文案使用中文；本项目永远只有一个用户，不做注册 / 多租户。
- 主题 token 已接入，后续组件不得散写 hex；颜色、圆角和模块色应来自 `src/app/globals.css` 与 `src/lib/design.ts`。
- 每个 Stage 完成后必须更新 `docs/PROGRESS.md` 和本 README，并逐条对照 `docs/PLAN.md` 的验收标准。
