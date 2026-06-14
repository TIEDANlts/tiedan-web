# 项目进度

## 当前状态
- 进行中：Stage 6（待开始）
- 已完成：Stage 0、Stage 1、Stage 2、Stage 3、Stage 4、Stage 5
- 线上版本：（未上线）

---

## Stage 日志（倒序追加）

### Stage 5 · 博客模块 + 文件存储 —— 2026-06-14 完成
- 完成内容：新增 `Post` 数据模型与迁移，接入 `/admin/posts` 博客管理、公开 `/blog` 列表与详情、`/rss.xml`、`/api/posts/view` 浏览量上报；扩展 `src/lib/storage.ts` 为 public/private 两区存储模块，`POST /api/upload` 仅登录上传，`GET /uploads/**` 只服务 public 区并带长缓存头。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260613113709_add_posts/migration.sql` 定义 Post 与 PostStatus；`src/lib/storage.ts` 负责 `UPLOAD_DIR`、路径防穿越、sharp 图片管线、`save`/`saveFromUrl`；`src/lib/http.ts` 统一外部图片下载与后续出站请求的超时、重试和 `OUTBOUND_PROXY`；`src/modules/posts/*` 封装 slug、TOC、校验、查询、Server Actions 与浏览量去抖；`src/app/(private)/admin/posts/*` 实现管理端列表与编辑；`src/app/(public)/blog/*`、`src/app/rss.xml/route.ts`、`src/app/api/upload/route.ts`、`src/app/uploads/[...path]/route.ts` 实现公开阅读、RSS、上传与文件服务。
- 关键决定与偏离：新增并锁定 `sharp@0.35.1` 与 `undici@6.26.0`；slug 策略为英文/数字标题生成可读 slug，中文标题回退 `post-时间戳`，不新增拼音依赖；JPEG 输出 JPEG，PNG/WebP/GIF 输出 WebP，GIF 转动画 WebP；本地未配置 `UPLOAD_DIR` 时 public 区兼容既有 `public/uploads`，配置后按 `UPLOAD_DIR/public` 与 `UPLOAD_DIR/private` 分区；Stage 3 favicon 只缓存 jpeg/png/webp/gif，ico 不再原样保存，失败则回退首字母图标。
- Stage 5 验收：通过 - Post 模型、迁移、Prisma Client 生成与数据库状态检查完成；通过 - `src/lib/storage.test.ts` 覆盖 SVG 拒绝、路径防穿越、EXIF 清除、旋正处理与 480px 缩略图；通过 - 编辑器粘贴图片调用 `/api/upload` 并插入 Markdown 图片语法；通过 - 发布、撤回、更新已发布文章和删除已发布文章会 revalidate `/blog`、分页、RSS 与详情页；通过 - 公开详情页草稿不可见，已发布文章静态详情含 TOC、上一篇/下一篇和客户端浏览量上报；通过 - `/rss.xml` 输出最近 20 篇已发布文章；待人工复核 - 无痕窗口直接打开真实博客图片 URL 应返回图片本体而非 302；待人工复核 - 用真实带 GPS/EXIF 手机竖拍照上传后应方向正确、无 EXIF/GPS、存在 480px 缩略图；待人工复核 - 移动端阅读体验、TOC 跳转和发布流程需要在浏览器中点验。
- 遗留 TODO：Stage 6 部署时需要确认 standalone/容器内 sharp 原生二进制可用，并将 `UPLOAD_DIR` 挂载为持久卷；Stage 14 才实现 private 区专门鉴权下载路由；Stage 16 活动流需要在文章首次发布时接入 `recordActivity()`，公开首页复用最新 3 篇文章。
- 验证：`npx.cmd vitest run src/lib/storage.test.ts src/modules/posts/posts.test.ts src/modules/links/favicon.test.ts` ✅；`wsl.exe -d Ubuntu-24.04 -- sh -lc "... docker compose -f docker-compose.dev.yml up -d"` ✅；`npx.cmd prisma migrate dev --name add_posts` ✅；`npx.cmd prisma generate` ✅；`npx.cmd prisma migrate status` ✅（首次因 WSL 容器刚唤醒出现短暂 schema engine error，确认端口和容器状态后重跑通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npx.cmd vitest run` ✅；`npm.cmd run check` ✅。

### Stage 4 · 待办模块 —— 2026-06-13 完成
- 完成内容：新增 `Todo` 数据模型与迁移，替换 `/todos` 占位页为真实待办看板；页面包含今天（含逾期置顶）、收集箱与未来 7 天三块区域；支持快速连续添加、勾选完成/取消、切换优先级、Popover 改日期、删除，以及把逾期项批量顺延到今天。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260613103618_add_todos/migration.sql` 定义 Todo 表；`src/modules/todos/*` 封装 UTC+8 日期逻辑、查询聚合、Server Actions 与单测；`src/app/(private)/todos/*` 实现私密待办页面和客户端交互；`src/components/ui/popover.tsx` 复用已安装 `radix-ui` 聚合包补齐 Popover。
- 关键决定与偏离：未新增第三方依赖，Popover 直接使用既有 `radix-ui@1.5.0`；完成项不隐藏，在所在分区沉底并显示删除线；未来 7 天按“明天起连续 7 天”展示；`@db.Date` 写入使用 `YYYY-MM-DDT00:00:00.000Z`，比较与展示统一通过 `src/lib/dayjs.ts` 的 UTC+8 `YYYY-MM-DD` 逻辑，避免浏览器本地时间参与判断。
- Stage 4 验收：通过 - 快速添加使用输入框、目标切换与选日期，提交后保持焦点便于连续录入；通过 - 勾选完成/取消、改优先级、改日期、删除均通过 Server Action 生效并 revalidate `/todos`；通过 - 昨天及更早未完成待办出现在今天分区逾期区，显示“逾期 N 天”，批量顺延后日期等于今天；通过 - 收集箱只展示 `date = null` 项；通过 - 未来 7 天按日分组，跨月边界由单测覆盖；通过 - 今天无项目时显示“今天没有待办 🎉”；通过 - 375px 宽度下页面单列流式布局，快速添加区域 sticky 并保留底部安全间距。
- 遗留 TODO：Stage 8 日历需要为 Todo 增加跨模块 `getEvents(start, end)`；Stage 15 仪表盘需要复用今日待办数据并支持直接勾选；Stage 16 继续删除 `/admin/playground` 临时验收页。
- 验证：`npx.cmd vitest run src/modules/todos/todos.test.ts` ✅；`wsl.exe -d Ubuntu-24.04 -- sh -lc "... docker compose -f docker-compose.dev.yml up -d"` ✅；`npx.cmd prisma migrate dev --name add_todos` ✅；`npx.cmd prisma generate` ✅；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npx.cmd vitest run` ✅；`npm.cmd run check` ✅。

### Stage 3 · 导航页 —— 2026-06-13 完成
- 完成内容：新增 `Link` 数据模型与迁移，接入公开 `/nav` 导航页和私密 `/admin/links` 管理页；公开页按分组展示链接卡片并支持标题、描述、分组即时本地搜索；后台支持新增、编辑、删除与同组拖拽排序，写操作后 revalidate `/nav` 和 `/admin/links`。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260613074632_add_links/migration.sql` 定义 Link 表；`src/modules/links/*` 封装查询、Server Actions、表单校验、分组排序与 favicon 解析；`src/lib/storage.ts` 是 Stage 3 最小版 public 上传缓存；`src/app/(public)/nav/*` 和 `src/app/(private)/admin/links/*` 分别实现公开浏览与后台管理。
- 关键决定与偏离：新增并锁定 `@dnd-kit/core@6.3.1`、`@dnd-kit/sortable@10.0.0`、`@dnd-kit/utilities@3.2.2`；Stage 3 上传区按计划暂用 `public/uploads` 并加入 `.gitignore`，Stage 5 再扩展为完整 `UPLOAD_DIR` public/private 存储模块；未内置示例 seed，导航数据通过后台手动维护。
- Stage 3 验收：通过 - 未登录可访问 `/nav`，无数据与无搜索结果均使用自然中文空状态；通过 - `/nav` 对标题、描述、分组做客户端即时过滤；通过 - `/admin/links` 提供新增、编辑、删除与 ConfirmDialog；通过 - 未填图标时 Server Action 尝试解析 HTML favicon 或 `/favicon.ico` 并通过 `saveFromUrl` 缓存本地，失败时前端首字母色块回退；通过 - 分组内 dnd-kit 拖拽排序调用排序 action 保存；通过 - 手机宽度下公开卡片与后台列表使用流式单列布局；通过 - 写操作 revalidate `/nav` 与 `/admin/links`。
- 遗留 TODO：Stage 5 需要把 `src/lib/storage.ts` 扩展为完整 public/private 存储模块、sharp 图片管线和 `UPLOAD_DIR` 支持；Stage 16 继续删除 `/admin/playground` 临时验收页。
- 验证：`npx vitest run src/modules/links/links.test.ts src/modules/links/favicon.test.ts src/lib/storage.test.ts` ✅；`wsl.exe -d Ubuntu-24.04 -- sh -lc "... docker compose -f docker-compose.dev.yml up -d"` ✅；`npx prisma migrate dev --name add_links` ✅；`npx prisma generate` ✅；`npx tsc --noEmit` ✅；`npm run lint` ✅；`npm run check` ✅。

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
