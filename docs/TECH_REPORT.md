# tiedan-web 技术报告

> 生成日期：2026-06-19。本文只描述当前仓库代码现状；当 README/PLAN/PROGRESS/SPEC 与代码冲突时，以代码为准并在对应章节标出。

## 第 0 节 · TL;DR 与模块全景

tiedan-web 是一个单用户个人生活管理站：公开面提供首页、博客、导航、RSS 和上传资源；登录后进入私密面，管理待办、游戏、书影、旅行、消费、日历、博客后台、导航后台、设置与数据导出。技术栈是 Next.js App Router + React + TypeScript + Tailwind v4 + shadcn/radix/lucide UI，数据层为 Prisma 7 + PostgreSQL，鉴权为 Auth.js v5 Credentials + bcrypt，测试为 Vitest + Playwright，部署侧提供 Docker standalone 镜像、Postgres、Caddy、GitHub Actions 手动部署和 rclone crypt 备份（`package.json:5-72`、`prisma/schema.prisma:1-7`、`Dockerfile:1-45`、`.github/workflows/deploy.yml:1-95`）。

| 模块 | 一句话职责 | Prisma 模型 | 路由/页面 | 关键依赖 |
| --- | --- | --- | --- | --- |
| dashboard | 根路径登录后聚合近期待办、游戏、书影、消费、旅行、纪念日、活动 | 无独立模型，聚合 Todo/Game/MediaItem/Transaction/Trip/SpecialDay/Activity | `src/app/page.tsx`、`src/app/dashboard-widgets.tsx` | Prisma、dayjs、activity |
| expenses | 手工记账、导入账单、分类、统计、快捷记账 | Transaction、ExpenseCategory、ImportBatch | `/expenses`、`/expenses/import`、`/expenses/stats`、`/admin/expense-categories`、`/api/quick/expense` | Prisma Decimal、xlsx、iconv-lite、ECharts、@dnd-kit |
| games | 游戏库、状态流转、Steam 同步 | Game、Setting | `/games`、`/api/cron/steam-sync` | Steam Web API、fetchWithRetry、activity |
| links | 书签导航、favicon 抓取、公开导航页 | Link | `/admin/links`、`/nav` | @dnd-kit、fetchWithRetry、storage |
| media | 书影库、导入、元数据搜索、封面、上映日历 | MediaItem | `/media`、`/media/import`、`/media/[id]` | xlsx、iconv-lite、TMDB/NeoDB、storage |
| posts | 博客后台、公开博客、Markdown、RSS、浏览计数 | Post | `/admin/posts`、`/blog`、`/blog/[slug]`、`/rss.xml`、`/api/posts/view` | react-markdown、remark-gfm、rehype-pretty-code |
| settings | 首页个人资料与全站 JSON zip 导出入口 | Setting | `/admin/settings`、`/api/admin/export` | storage、export-zip |
| special-days | 日历内创建重要日子，支持每年重复 | SpecialDay | `/calendar` 内快填 | FullCalendar、dayjs |
| todos | 快速添加、今天/收集箱/未来 7 天、完成/顺延 | Todo | `/todos`、`/calendar` | FullCalendar、Server Actions |
| trips | 行程、每日地点/照片/笔记、足迹地图 | Trip、TripDay | `/trips`、`/trips/[id]`、`/trips/footprint`、`/api/trips/nominatim` | Leaflet、react-leaflet、Nominatim、geo |

## 第 1 节 · 项目概览

**定位与核心场景。** 项目面向单个维护者本人，不做注册或多租户。公开访客能看首页、博客、导航和 RSS；登录用户能记录个人生活数据，包含游戏、书影、旅行、消费、待办、纪念日和博客后台。根路径通过 `auth()` 分流：未登录走公开首页，已登录走 `PrivateShell` 和 dashboard 组件（`src/app/page.tsx:148-164`）。

**技术栈与版本。** `package.json` 锁定 Next `16.2.9`、React `19.2.4`、TypeScript `5.9.3`、Tailwind `4.3.0`、next-auth `5.0.0-beta.30`、Prisma `7.8.0`、`@prisma/adapter-pg` `7.8.0`、Vitest `4.1.8`、Playwright `1.60.0`、FullCalendar `6.1.20`、Leaflet `1.9.4`、ECharts `6.1.0`、xlsx `0.18.5`、iconv-lite `0.7.2`、sharp `0.35.1`、undici `6.26.0`（`package.json:15-72`）。脚本包括 `dev`、`build`、`start`、`lint`、`check`、`e2e`、`db:seed`，其中 `check` 是 `tsc --noEmit && npm run lint && vitest run`（`package.json:5-13`）。TypeScript 开启 `strict`，路径别名为 `@/* -> ./src/*`（`tsconfig.json:7`、`tsconfig.json:21-23`）。

**分层约定。** `src/app` 承载 App Router 页面、layout、route handler 和少量页面专属 client 组件；`src/modules` 下按功能目录承载领域读写、校验、导入、事件等逻辑，例如各模块的 `actions.ts` 是 Server Action 写入口、`queries.ts` 是读模型、`utils.ts` 是纯函数；`src/lib` 放数据库、鉴权、时间、金额、SSRF、HTTP、上传、活动、日历、地图、导出等横切能力；`src/components` 放通用 UI、shell、Markdown、上传/标签等组件。代码依赖方向整体是页面调用 modules/lib，modules 调用 lib，lib 不依赖具体页面。

**本地运行与外部服务。** 本地开发使用 `npm run dev` 或 `npm run dev:local`；数据库通过 `DATABASE_URL` 连接 Postgres，`docker-compose.dev.yml` 只提供一个 Postgres 16 服务映射到本机 5432（`docker-compose.dev.yml:1-16`）。可选外部服务包括 Steam API (`STEAM_API_KEY`/`STEAM_ID`)、TMDB (`TMDB_API_KEY`)、Nominatim（旅行搜索直接访问 OSM Nominatim）、天地图瓦片 (`TIANDITU_KEY`)、Healthchecks、出站代理 (`OUTBOUND_PROXY`)（`.env.example:1-17`、`.env.production.example:27-39`）。`next.config.ts` 使用 standalone 输出并给 `/uploads/:path*` 加一年 immutable 缓存头（`next.config.ts:3-17`）。

## 第 2 节 · 架构与横切设计

### 渲染与路由模型

项目使用 App Router route group 划分公开面和私密面。`src/app/(public)/layout.tsx` 包裹公开壳并读取备案环境变量；`src/app/(private)/layout.tsx` 再做一次 `auth()` 检查，未登录 `redirect("/login")`（`src/app/(private)/layout.tsx:10-16`）。中间件对公开白名单放行，其余路径通过 `getToken` 检查 JWT，失败跳 `/login?from=...`（`src/middleware.ts:28-42`）。公开白名单实际维护在 `src/lib/auth/routes.ts:7-30`。

多数页面是 Server Component，带表单交互的页面内组件为 client component。领域写操作集中在 `src/modules/*/actions.ts`，这些文件首行 `"use server"`，并在函数内调用 `auth()` 或模块级 `require*Session()` 做会话检查，例如 posts、todos、trips、settings 都是这种模式（`src/modules/posts/actions.ts:1-20`、`src/modules/todos/actions.ts:1-21`、`src/modules/trips/actions.ts:21-27`、`src/modules/settings/actions.ts:18-26`）。

缓存策略上，根页、博客、导航、RSS、旅行、消费、媒体等多处当前显式 `dynamic = "force-dynamic"`，例如根页、RSS、公开 blog/nav、私密 trips/expenses/media/games（`src/app/page.tsx:20`、`src/app/rss.xml/route.ts:4`、`src/app/(public)/blog/page.tsx:3`、`src/app/(public)/nav/page.tsx:4`、`src/app/(private)/games/page.tsx:4`）。写操作仍会按公开影响面调用 `revalidatePath`，例如 posts 发布/撤回会重验证 `/blog`、分页、RSS 和详情页（`src/modules/posts/actions.ts:12-34`、`src/modules/posts/actions.ts:98-102`）。

### 数据层

Prisma schema 使用 PostgreSQL datasource，客户端 generator 是 `prisma-client-js`（`prisma/schema.prisma:1-7`）。运行时数据库客户端通过 `@prisma/adapter-pg` 创建，并在非生产环境复用 `globalThis` 上的 PrismaClient 防止热更新重复连接（`src/lib/db.ts:4-22`）。`prisma.config.ts` 从 `DATABASE_URL` 读取连接串并指定 schema/migrations 路径（`prisma.config.ts:4-11`）。

模型按 Stage 演进：初始 User/Setting，之后依次增加 Link、Todo、Post、Game、MediaItem、Expenses 三表、SpecialDay、Activity、Trip/TripDay，最后给 Activity 加唯一索引（`prisma/migrations` 下 11 个目录；关键 SQL 见 `prisma/migrations/20260618074000_add_activity_unique/migration.sql:11`）。核心关系包括 Transaction 到 ExpenseCategory/ImportBatch 为 `onDelete: SetNull`（`prisma/schema.prisma:150-158`），TripDay 到 Trip 为 `onDelete: Cascade`（`prisma/schema.prisma:211-220`）。

金额字段使用 Decimal：`Transaction.amount` 和 `Trip.budget` 都是 `@db.Decimal(12, 2)`（`prisma/schema.prisma:148`、`prisma/schema.prisma:204`）。查询传给 client component 前会转字符串，例如 expenses 查询序列化 `amount`，旅行详情把 `budget?.toString()`（`src/modules/expenses/queries.ts:93-124`、`src/modules/trips/queries.ts:191-197`）。

### 鉴权与会话

Auth.js 配置在 `src/auth.ts`：JWT session，30 天有效期，登录页 `/login`，Credentials provider 根据 username 查 User 并用 bcrypt 比对 `passwordHash`（`src/auth.ts:6-49`）。登录失败限流是内存 Map：同 IP 5 次失败锁 15 分钟（`src/lib/auth/rate-limit.ts:1-48`）。登录后跳转使用 `safeFromPath`，它只允许站内单斜杠路径并拒绝反斜杠，防开放重定向（`src/lib/auth/routes.ts:42-62`）。

### 安全

出站 HTTP 统一走 `fetchWithRetry`，默认 10 秒超时、1 次重试，使用 undici dispatcher，并在发请求前调用 `assertSafeOutboundUrl` 做协议和字面量内网地址校验（`src/lib/http.ts:13-14`、`src/lib/http.ts:104-145`）。SSRF 防护包含两层：URL 级校验和连接阶段 `createGuardedLookup` 校验 DNS 解析出的真实 IP，防 DNS rebinding 和重定向到内网；仅当 `SSRF_ALLOW_PRIVATE` 为 `1/true` 时放行内网（`src/lib/ssrf.ts:3-10`、`src/lib/ssrf.ts:20-23`、`src/lib/ssrf.ts:122-149`、`src/lib/ssrf.ts:164-190`）。

Bearer token 比较用 SHA-256 摘要后 `timingSafeEqual`，用于 cron 和快捷记账接口（`src/lib/secure-compare.ts:10-26`、`src/app/api/cron/steam-sync/route.ts:36-42`、`src/app/api/quick/expense/route.ts:17-20`）。私密文件接口 `/api/files/private/[...path]` 需要 `auth()`，并通过 `assertPrivateUploadPath` 防路径穿越（`src/app/api/files/private/[...path]/route.ts:8-31`、`src/lib/storage.ts:174-180`）。公开上传直出 `/uploads/[...path]` 也用 `assertPublicUploadPath` 约束根目录（`src/app/uploads/[...path]/route.ts:6-29`、`src/lib/storage.ts:161-168`）。

### 文件与存储

上传统一在 `src/lib/storage.ts`：本地上传上限 15MB，远程图片转存上限 8MB；支持 jpeg/png/webp/gif，SVG 明确拒绝（`src/lib/storage.ts:70-79`、`src/lib/storage.ts:183-197`）。路径规则随 `UPLOAD_DIR` 改变：生产配置时会在上传根目录下区分 public 和 private 两个区域，未配置时 public 是 `public/uploads`，private 是 `storage/uploads/private`（`src/lib/storage.ts:127-147`）。图片由 sharp 自动旋正、限制最大边、重编码，原图最大 2000，缩略图 480（`src/lib/storage.ts:289-325`）。public 返回 `/uploads/...`，private 返回 `/api/files/private/...`（`src/lib/storage.ts:327-341`）。客户端上传封装 `uploadImageFile` 会先做 15MB 前置检查，再 POST `/api/upload`（`src/lib/upload-client.ts:23-33`、`src/lib/upload-client.ts:82-111`）。

### 活动与审计

活动表记录跨模块关键动作：posts published、media done、trips done、expenses imported、games finished。`recordActivity` 通过 `(module, action, refId)` upsert，重复触发只更新 title，不改变 `happenedAt`（`src/lib/activity.ts:30-49`、`prisma/schema.prisma:223-232`）。`shouldRecordStatusTransition` 防止已完成状态重复记录（`src/lib/activity.ts:51-53`）。dashboard 活动流会把 Activity 按上海日期分组并为不同模块生成 href（`src/lib/activity.ts:75-157`）。孤儿活动诊断只覆盖 posts/media/trips/expenses 四类，检查引用目标是否还存在（`src/lib/activity-diagnostics.ts:19-125`）。

### 日历聚合

统一事件类型 `CalendarEvent` 定义在 `src/lib/calendar.ts:6-17`，`getAllEvents(start,end)` 并发调用 todos、trips、special-days、media 的 `getEvents` 后拼接（`src/lib/calendar.ts:19-27`）。日历 API 只接受 `YYYY-MM-DD` 且 `start < end`，登录后返回 `{ events }`（`src/app/api/calendar/events/route.ts:9-32`）。各模块事件使用模块色：todos 按待办日期，trips 用跨日 all-day 区间，special-days 展开每年重复，media 只把有 `releaseDate` 的 WISHLIST 作为上映事件（`src/modules/todos/events.ts:10-29`、`src/modules/trips/events.ts:14-32`、`src/modules/special-days/events.ts:48-91`、`src/modules/media/events.ts:10-37`）。

### 通用 UI 与样式

Tailwind v4 采用 CSS-first：`globals.css` 导入 tailwind、动画和 shadcn CSS，并在 `@theme inline` 把语义 token 映射成 Tailwind 颜色/圆角/字体（`src/app/globals.css:1-72`）。公开面 `.theme-public` 与私密面 `.theme-private` 是两套 token，暗色模式也分别定义（`src/app/globals.css:88-146`）。模块色在 `src/lib/design.ts` 和 CSS 中各有一份常量，供日历、状态与 UI 使用（`src/lib/design.ts:1-23`、`src/app/globals.css:148-158`）。

私密壳 `PrivateShell` 是固定侧栏 + 移动抽屉，公开壳 `PublicShell` 有顶部导航和可选备案页脚（`src/components/app-shell.tsx:147-241`）。主题实现是项目自写的 `ThemeProvider`，读写 localStorage、监听 `prefers-color-scheme`、给 html 切 `.dark`；虽然 `package.json` 仍包含 `next-themes`，当前代码没有从 `next-themes` 导入（`src/components/theme-provider.tsx:38-123`、`src/components/theme-provider.test.ts:6-14`、`package.json:42`）。Markdown 渲染用 react-markdown、remark-gfm、rehype-pretty-code，外链自动 `target="_blank"`，h2/h3 可注入目录 id（`src/components/markdown-renderer.tsx:18-70`）。费用统计图表用 ECharts client component 动态渲染，日历用 FullCalendar，地图用 Leaflet/React-Leaflet 通过 `next/dynamic` 禁 SSR（`src/app/(private)/calendar/calendar-dynamic.tsx`、`src/app/(private)/trips/leaflet-dynamic.tsx:7-21`）。

## 第 3 节 · 功能模块逐一详解

### 3.1 dashboard

**a. 功能概述。** 登录后根路径展示私密 dashboard：待办、游戏、书影、消费、旅行、重要日子、年度统计和最近活动。根页先调用 `auth()`，有 session 时用 `PrivateShell` 和 dashboard widgets，否则用公开首页（`src/app/page.tsx:123-164`）。

**b. 数据模型。** dashboard 没有独立 Prisma 模型；它聚合 Todo、Game、MediaItem、Transaction、ExpenseCategory、Trip、SpecialDay、Activity（`src/modules/dashboard/queries.ts`）。

**c. 实现思路与关键流程。** `getDashboardTodos` 查询日期小于等于今天、未完成的 5 条待办；`getDashboardGames` 查询最近两周游玩时长大于 0 的游戏；`getDashboardMedia` 查询 DOING 书影；`getDashboardExpenses` 汇总本月支出、收入、结余和前三分类；`getDashboardTrip` 找下一段计划中旅行；`getDashboardSpecialDays` 动态导入 special-days 事件并取未来 14 天；`getDashboardYearStats` 汇总年度完成游戏、书影、文章；`getRecentActivities` 调 `getActivityFeed`（`src/modules/dashboard/queries.ts:47-257`）。

**d. 关键技术细节与依赖。** 金额统计使用 Prisma Decimal 和 `sumDecimal`，避免浮点误差（`src/modules/dashboard/queries.ts:109-156`、`src/lib/money.ts:21-34`）。日期用 `formatShanghaiDate` 和 `dayjs`，遵循 UTC+8 规则（`src/lib/dayjs.ts:7-25`）。

**e. 现存问题与风险。** 客观事实：dashboard 由多次独立查询组成，每个 widget 分别读数据库；如果首页访问频繁，可能产生较多短查询，但当前是单用户站，影响有限（`src/app/dashboard-widgets.tsx`、`src/modules/dashboard/queries.ts:47-257`）。客观事实：年度完成游戏按 Activity `games/finished` 统计，而非 Game 当前状态，历史缺失或活动孤儿会影响数字（`src/modules/dashboard/queries.ts:206-215`、`src/lib/activity.ts:30-49`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期可给 dashboard queries 增加“按 widget 并发聚合”的统一入口，降低页面层分散等待；中期可把活动孤儿诊断结果暴露到后台，解释年度统计差异；长期可加用户自定义 dashboard 排序，但会引入持久化布局模型。

### 3.2 expenses

**a. 功能概述。** expenses 提供流水列表、手工记账、分类修改、分类后台、账单导入、导入历史、统计图表、快捷记账 API。页面入口包括 `/expenses`、`/expenses/import`、`/expenses/import/history`、`/expenses/import/result/[id]`、`/expenses/stats`、`/admin/expense-categories`（`src/app/(private)/expenses/page.tsx:4-7`、`src/app/(private)/expenses/import/page.tsx:6`、`src/app/(private)/expenses/stats/page.tsx:23-248`、`src/app/(private)/admin/expense-categories/page.tsx:4-6`）。

**b. 数据模型。** `Transaction` 存平台、时间、Decimal 金额、方向、分类、商户、项目、支付方式、单号、备注、导入批次和原始 JSON；`ExpenseCategory` 存名称、方向、图标、关键词、排序；`ImportBatch` 存平台、文件名、总数、插入/跳过数（`prisma/schema.prisma:138-188`）。`Transaction` 有 `(platform, txnNo)` 唯一约束和 txnTime/category/platform/importBatch 索引（`prisma/schema.prisma:162-166`），迁移在 `prisma/migrations/20260614175559_add_expenses/migration.sql:2-71`。

**c. 实现思路与关键流程。** 写入口先 `requireExpenseSession`，再按动作创建/更新交易、维护分类、解析导入、执行导入（`src/modules/expenses/actions.ts:18-32`、`src/modules/expenses/actions.ts:42-429`）。导入流程是：识别平台 `detectExpensePlatform`，解析 CSV/XLSX，预览前 50 行但统计全量，确认后创建 ImportBatch，并在 transaction 中逐行 `create`，唯一冲突计为跳过，插入数大于 0 时记录 Activity（`src/modules/expenses/parsers/index.ts:15-31`、`src/modules/expenses/import-executor.ts:55-107`、`src/modules/expenses/actions.ts:392-427`）。自动分类先按分类关键词匹配 merchant/item，再按平台原始分类映射（`src/modules/expenses/categorize.ts:18-60`）。快捷记账解析“商户 金额”等文本，rate limit 10/min，生成 `platform=quick`、`direction=EXPENSE` 的 Transaction（`src/modules/expenses/quick.ts:15-95`、`src/app/api/quick/expense/route.ts:11-59`）。

**d. 关键技术细节与依赖。** CSV 解码先 UTF-8，失败回退 GBK；XLS/XLSX 使用 xlsx 读取；支付宝/微信解析会过滤关闭/全额退款状态（`src/modules/expenses/parsers/common.ts:22-74`、`src/modules/expenses/parsers/common.ts:137-223`）。统计支持 month/week/year 参数，用 Decimal 汇总，并有按日/周/年 SQL 聚合（`src/modules/expenses/stats.ts:59-140`、`src/modules/expenses/stats.ts:241-366`）。分类后台拖拽排序使用 @dnd-kit，持久化到 sort 字段（`src/app/(private)/admin/expense-categories/expense-categories-admin.tsx:5-19`、`src/modules/expenses/actions.ts:237-266`）。

**e. 现存问题与风险。** 客观事实：`Transaction @@unique([platform, txnNo])` 中 `txnNo` 可为空，PostgreSQL 对 NULL 唯一约束允许多条 NULL；快捷记账都用 `txnNo=null`，因此幂等只覆盖有单号的导入行（`prisma/schema.prisma:155-162`、`src/modules/expenses/quick.ts:71-95`）。客观事实：导入执行逐行写入，批量大时会产生多次 create 和冲突捕获（`src/modules/expenses/actions.ts:392-427`）。客观事实：快捷记账 rate limit 是内存 Map，进程重启会清空，多实例也不共享（`src/modules/expenses/quick.ts:47-69`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期可给快捷记账增加可选客户端幂等键；中期把导入执行改成可分块或批量插入并保留跳过明细；长期可把分类规则抽成可编辑规则表，支持金额、商户正则和平台字段组合。

### 3.3 games

**a. 功能概述。** games 管理游戏库，支持手工创建、过滤、编辑、评分、标签、状态流转、Steam 同步。页面入口是 `/games`，cron 同步入口是 `/api/cron/steam-sync`（`src/app/(private)/games/page.tsx:4-7`、`src/app/api/cron/steam-sync/route.ts:36-57`）。

**b. 数据模型。** `Game` 包含 `source`、`steamAppId`、名称、平台、封面、状态、评分、总时长、近两周时长、最后游玩时间、评测、标签和时间戳；`steamAppId` 唯一（`prisma/schema.prisma:22-46`）。Steam 同步时间写入 Setting 的 `steam.lastSyncAt`（`src/modules/games/steam.ts:209-225`）。

**c. 实现思路与关键流程。** Server Actions 先校验 session；创建/更新时规范表单、转存非 Steam CDN 外链封面、写 Game；状态进入 FINISHED 时记录 `games/finished` Activity（`src/modules/games/actions.ts:17-40`、`src/modules/games/actions.ts:52-138`）。`advanceGameStatusAction` 按 WISHLIST/BACKLOG -> PLAYING -> FINISHED 流转（`src/modules/games/actions.ts:150-183`、`src/modules/games/utils.ts:260-276`）。Steam 同步读取 env，调用 Steam owned games API，按 appid 去重，新游戏创建为 BACKLOG，已有游戏只更新 name/cover/playtime/playtime2w/lastPlayedAt，若原状态 BACKLOG 且近两周有游玩则置 PLAYING（`src/modules/games/steam.ts:80-225`）。

**d. 关键技术细节与依赖。** Steam 请求走 `fetchWithRetry`，继承 SSRF/超时/重试能力（`src/modules/games/steam.ts:118-150`、`src/lib/http.ts:104-145`）。Steam CDN 封面允许热链，不强制本地转存；其他外链封面会尝试 `saveFromUrl`（`src/modules/games/actions.ts:25-40`）。

**e. 现存问题与风险。** 客观事实：Steam 同步环境变量缺失会直接 throw，cron 接口捕获后返回 500（`src/modules/games/steam.ts:80-89`、`src/app/api/cron/steam-sync/route.ts:44-57`）。客观事实：已有 Steam 游戏不会更新 rating/review/tags/status（除 BACKLOG -> PLAYING），这是保护手工编辑，但也意味着 Steam 下架或名称策略变动不会完全同步（`src/modules/games/steam.ts:187-203`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期给 Steam 同步结果增加“缺 env”友好展示；中期记录同步批次和错误明细；长期可加入非 Steam 平台导入或成就/游玩趋势图。

### 3.4 links

**a. 功能概述。** links 提供后台导航书签管理、分组排序、favicon 自动抓取，以及公开 `/nav` 浏览页（`src/app/(private)/admin/links/page.tsx:4`、`src/app/(public)/nav/page.tsx:4-8`）。

**b. 数据模型。** `Link` 存 group、title、url、icon、description、sort（`prisma/schema.prisma:84-92`）。迁移为 `prisma/migrations/20260613074632_add_links/migration.sql:2`。

**c. 实现思路与关键流程。** 创建链接时校验 session、规范输入，若没传 icon，则调用 `fetchAndCacheFavicon(url, saveFromUrl)` 尝试抓取并转存 favicon；sort 默认取同 group 最大 sort + 1；写完重验证 `/nav` 和 `/admin/links`（`src/modules/links/actions.ts:17-55`）。后台支持 create/update/delete/reorder，reorder 只处理同 group 且 id 已知的项（`src/modules/links/actions.ts:57-156`、`src/modules/links/utils.ts:125-138`）。

**d. 关键技术细节与依赖。** favicon 抓取先拉 HTML，用正则找 icon/link 候选，再回退 `/favicon.ico`；抓取失败不会阻塞链接创建（`src/modules/links/favicon.ts:11-71`）。后台拖拽排序用 @dnd-kit（`src/app/(private)/admin/links/links-admin.tsx:5-19`、`src/app/(private)/admin/links/links-admin.tsx:262-310`）。

**e. 现存问题与风险。** 客观事实：HTML favicon 解析用正则而非 HTML parser，复杂页面可能漏掉或误判候选；失败时静默继续（`src/modules/links/favicon.ts:11-31`、`src/modules/links/favicon.ts:50-71`）。客观事实：公开 `/nav` 当前强制动态渲染，不是静态页（`src/app/(public)/nav/page.tsx:4`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期把 favicon 抓取结果展示为 warning；中期支持定期刷新失效 favicon；长期可增加公开导航搜索和访问热度。

### 3.5 media

**a. 功能概述。** media 管理书/电影/剧集，支持列表过滤、详情编辑、状态流转、评分/剧透/标签、封面上传或转存、CSV/XLS/XLSX 导入、TMDB/NeoDB 元数据搜索、上映日历（`src/app/(private)/media/page.tsx:4-7`、`src/app/(private)/media/[id]/page.tsx:7-41`、`src/app/(private)/media/import/media-import-wizard.tsx:95-394`）。

**b. 数据模型。** `MediaItem` 包含 type、title、originalTitle、creator、year、coverUrl、doubanId、tmdbId、isbn、status、rating、startedAt、finishedAt、releaseDate、reviewMd、hasSpoiler、tags；`doubanId` 唯一（`prisma/schema.prisma:48-82`）。迁移为 `prisma/migrations/20260614140757_add_media_items/migration.sql:2-34`。

**c. 实现思路与关键流程。** Actions 先校验 session；输入规范化时校验年份、评分、日期、封面路径/URL、标签和剧透布尔；创建/更新时外链封面会尝试转存；状态进入 DONE 会自动补 finishedAt 并记录 Activity（`src/modules/media/actions.ts:35-86`、`src/modules/media/actions.ts:125-237`、`src/modules/media/utils.ts:161-389`）。导入向导四步：上传解析、列映射、预览、执行；解析支持 UTF-8/GBK CSV 和 XLS/XLSX；行级规范化会识别类型、状态、评分、日期、年份、豆瓣 ID；预览用 doubanId 或 type/title/year 弱键查重，只展示前 20 行；执行时再次查重，封面转存失败只记录 warning 并继续（`src/modules/media/import-parser.ts:104-304`、`src/modules/media/actions.ts:291-462`、`src/modules/media/import-executor.ts:84-147`）。

**d. 关键技术细节与依赖。** BOOK 搜 NeoDB；MOVIE/TV 优先 TMDB，有 `TMDB_API_KEY` 时用 TMDB，失败或未配置回退 NeoDB（`src/modules/media/metadata.ts:198-241`）。TMDB 封面是 `image.tmdb.org/t/p/w500...`，最终保存时会通过 storage 转存（`src/modules/media/metadata.ts:109-128`、`src/modules/media/actions.ts:464-506`）。日历只展示 WISHLIST 且有 releaseDate 的条目（`src/modules/media/events.ts:10-37`）。

**e. 现存问题与风险。** 客观事实：执行导入逐行串行处理，封面也逐行下载，大批量导入可能较慢（`src/modules/media/import-executor.ts:95-144`）。客观事实：弱键查重只在无 doubanId 且有 year 时使用，同名不同年份缺失或重复年份会影响判断（`src/modules/media/import-executor.ts:99-109`）。客观事实：NeoDB 映射没有提取 year/releaseDate（`src/modules/media/metadata.ts:88-107`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期在导入结果中区分“封面 warning”和“行失败”；中期做批量并发但限速的封面转存；长期可引入本地元数据缓存和手动合并重复条目。

### 3.6 posts

**a. 功能概述。** posts 提供后台文章列表、新建/编辑、保存草稿、发布、撤回、删除；公开博客列表/分页/详情、Markdown 渲染、目录、浏览计数和 RSS（`src/app/(private)/admin/posts/page.tsx:6`、`src/app/(private)/admin/posts/new/page.tsx`、`src/app/(public)/blog/page.tsx:3`、`src/app/(public)/blog/[slug]/page.tsx:37-107`、`src/app/rss.xml/route.ts:4-52`）。

**b. 数据模型。** `Post` 包含 title、unique slug、contentMd、summary、category、tags、status、publishedAt、views、createdAt、updatedAt（`prisma/schema.prisma:118-136`）。迁移为 `prisma/migrations/20260613113709_add_posts/migration.sql:2-23`。

**c. 实现思路与关键流程。** 保存文章先规范化 title/slug/content/tags；发布 intent 将状态置 PUBLISHED，首次发布设置 publishedAt 并记录 Activity；已发布文章保存草稿 intent 仍保持 PUBLISHED；发布/撤回/删除后重验证博客、分页、RSS 和详情（`src/modules/posts/utils.ts:43-120`、`src/modules/posts/actions.ts:45-120`、`src/modules/posts/actions.ts:122-155`）。公开查询分页大小 10，详情查询还会取所有已发布 slug/title 计算上一篇/下一篇（`src/modules/posts/queries.ts:5-107`）。

**d. 关键技术细节与依赖。** Markdown 渲染用 `MarkdownAsync`、remark-gfm、rehype-pretty-code，代码主题区分 light/dark；目录从 h2/h3 提取并给重复标题加序号 id（`src/components/markdown-renderer.tsx:18-70`、`src/modules/posts/utils.ts:131-159`）。浏览计数由详情页 client `ViewBeacon` 调 `/api/posts/view`，后端按 IP+slug 10 分钟内去重并 `updateMany` 已发布文章 views（`src/app/(public)/blog/[slug]/view-beacon.tsx:5-24`、`src/modules/posts/view.ts:4-66`、`src/app/api/posts/view/route.ts:13-29`）。

**e. 现存问题与风险。** 客观事实：浏览量去重是进程内 Map，重启清空，多实例不共享（`src/modules/posts/view.ts:6-18`）。客观事实：详情页为了上一篇/下一篇每次取全量已发布文章 slug/title，文章数量大时可优化（`src/modules/posts/queries.ts:87-98`）。客观事实：Markdown 渲染未在这里显式使用 rehype-sanitize；该项目只有单用户后台写入，风险比多用户小，但公开输出仍取决于 react-markdown 默认行为和插件行为（`src/components/markdown-renderer.tsx:35-38`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期把浏览去重改为数据库或 Redis-like 存储；中期优化 previous/next 查询为邻近记录查询；长期可加草稿预览 token、全文搜索和系列文章。

### 3.7 settings

**a. 功能概述。** settings 后台维护公开首页头像、名字、简介，并提供全站数据导出按钮（`src/app/(private)/admin/settings/page.tsx:12-46`）。

**b. 数据模型。** `Setting` 是 key/value 表；个人资料使用 `profile.name`、`profile.bio`、`profile.avatar` 三个 key，默认值写在代码里（`prisma/schema.prisma:16-20`、`src/modules/settings/settings.ts:3-19`）。

**c. 实现思路与关键流程。** `getProfileSettings` 批量读三项设置并回退默认值；`saveProfileSettings` 用 upsert 写三项；Server Action 校验登录、名字/bio 非空、avatar 必须是 `/uploads/` public 路径，保存后重验证 `/` 和 `/admin/settings`（`src/modules/settings/settings.ts:25-58`、`src/modules/settings/actions.ts:18-55`）。设置表单头像上传调用 `uploadImageFile(file,{area:"public",subdir:"profile"})`，成功后把返回 URL 写入 hidden input（`src/app/(private)/admin/settings/settings-form.tsx:21-104`）。

**d. 关键技术细节与依赖。** 导出按钮链接到 `/api/admin/export`，导出 Game/MediaItem/Trip/Post/Transaction/ExpenseCategory/Todo/SpecialDay/Link/Activity 为 JSON zip，不包含图片（`src/app/(private)/admin/settings/page.tsx:26-40`、`src/app/api/admin/export/route.ts:32-79`）。

**e. 现存问题与风险。** 客观事实：Setting 是纯字符串，没有类型或 schema，未来新增复杂设置需要在各自模块自行解析（`prisma/schema.prisma:17-20`）。客观事实：导出包包含核心表 JSON 但不含 uploads 文件，恢复必须依赖服务器上传卷备份（`src/lib/export-zip.ts:10`、`src/app/api/admin/export/route.ts:56-69`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期定义 Setting key registry；中期导出时可附带版本号和 schema hash；长期增加导入恢复向导，但需严控覆盖和敏感信息。

### 3.8 special-days

**a. 功能概述。** special-days 当前没有独立管理页，主要在日历中选择日期后用快填表单创建重要日子，可设置图标、备注和每年重复（`src/app/(private)/calendar/calendar-client.tsx:177-401`、`src/modules/special-days/special-day-quick-form.tsx:22-80`）。

**b. 数据模型。** `SpecialDay` 存 title、date、yearlyRepeat、icon、note、createdAt、updatedAt，并对 date/yearlyRepeat 建索引（`prisma/schema.prisma:104-116`）。迁移为 `prisma/migrations/20260615085002_add_special_days/migration.sql:2-19`。

**c. 实现思路与关键流程。** 创建 action 校验 session、标题、日期、图标长度、备注长度，写库后重验证 `/calendar`（`src/modules/special-days/actions.ts:15-84`）。事件生成时，非重复日子只在原日期落入范围时生成；每年重复按 start/end 年份展开；2 月 29 日在非闰年降级为 2 月 28 日（`src/modules/special-days/events.ts:18-70`）。

**d. 关键技术细节与依赖。** 日期校验通过 `formatShanghaiDate(new Date(dateT00:00Z)) === date`，避免非法日期滚动（`src/modules/special-days/actions.ts:27-37`）。事件 title 会拼上 icon，href 指向 `/calendar?date=...`（`src/modules/special-days/events.ts:32-45`）。

**e. 现存问题与风险。** 客观事实：当前只看到 create action，没有 update/delete action 或独立列表，创建后若要修改/删除没有对应 UI 入口（`src/modules/special-days/actions.ts:39-84`、`rg` 仅发现 `createSpecialDayAction`）。客观事实：重复规则只支持公历每年重复，不支持农历或提前提醒（`src/modules/special-days/events.ts:48-91`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期补列表、编辑、删除；中期增加提醒提前天数；长期如需农历，应新增字段标识历法并引入可靠转换库。

### 3.9 todos

**a. 功能概述。** todos 提供快速添加到今天/收集箱/指定日期，列表分“今天”“收集箱”“未来 7 天”，支持完成/取消、调优先级、改日期、删除、逾期全部顺延到今天（`src/app/(private)/todos/page.tsx:4-7`、`src/app/(private)/todos/todos-board.tsx:367-425`）。

**b. 数据模型。** `Todo` 存 content、date、priority、done、doneAt、createdAt；date 是 `@db.Date` 可为空（`prisma/schema.prisma:94-102`）。迁移为 `prisma/migrations/20260613103618_add_todos/migration.sql:2`。

**c. 实现思路与关键流程。** 创建表单把 target 映射为今天、null 收集箱或指定日期；priority 只允许 0/1/2；Action 写库后重验证 `/todos` 和 `/`（`src/modules/todos/utils.ts:45-107`、`src/modules/todos/actions.ts:23-46`）。查询取无日期或未来 7 天内的 todo，按 done、priority、createdAt 排序，然后拆成 todayItems、inboxItems、futureGroups；逾期未完成会归到 todayItems 并计算逾期天数（`src/modules/todos/queries.ts:50-91`、`src/modules/todos/utils.ts:125-188`）。

**d. 关键技术细节与依赖。** 日历事件包含所有有 date 的 todo，已完成事件标题加 `✓` 且颜色透明度降低（`src/modules/todos/events.ts:10-29`）。页面当前使用普通按钮和 popover 更新，不使用 dnd-kit（`src/app/(private)/todos/todos-board.tsx:3-425`，且 `rg "@dnd-kit|Dnd|Sortable" -- src/app/(private)/todos src/modules/todos` 无结果）。

**e. 现存问题与风险。** 客观事实：TECH_REPORT_SPEC 要求说明“基于 @dnd-kit 的拖拽看板”，但当前 todos 代码没有拖拽看板或排序持久化；仓库里 @dnd-kit 只用于链接和消费分类后台（`docs/TECH_REPORT_SPEC.md:52-53`、`src/app/(private)/admin/links/links-admin.tsx:5-19`、`src/app/(private)/admin/expense-categories/expense-categories-admin.tsx:5-19`）。客观事实：Todo 没有 sort 字段，因此同优先级内只能按 createdAt 排序（`prisma/schema.prisma:94-102`、`src/modules/todos/utils.ts:155-168`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期若要满足拖拽规格，需要先给 Todo 增加 sort 或列内排序模型；中期可增加重复待办和标签；长期可做自然语言日期解析，但需保持 UTC+8 日期规则。

### 3.10 trips

**a. 功能概述。** trips 管理旅行计划和完成旅行：列表按 PLANNED/DONE 过滤，详情可编辑概览、目的地、日期、预算、总结、清单、每日地点、私密照片、每日笔记；足迹页聚合已完成旅行地点到地图（`src/app/(private)/trips/page.tsx:4-14`、`src/app/(private)/trips/[id]/trip-detail-editor.tsx:16-57`、`src/app/(private)/trips/footprint/page.tsx:8-38`）。

**b. 数据模型。** `Trip` 存标题、状态、startDate/endDate、destinations、coverUrl、summaryMd、Decimal budget、checklist Json 和 days；`TripDay` 存 tripId、date、noteMd、locations Json、photos 字符串数组，并对 `(tripId,date)` 唯一（`prisma/schema.prisma:190-221`）。迁移为 `prisma/migrations/20260615160800_add_trips/migration.sql:2-38`。

**c. 实现思路与关键流程。** 创建行程时规范输入并枚举 start/end 之间每一天，创建 Trip 时同时创建 TripDay（`src/modules/trips/actions.ts:38-63`、`src/modules/trips/utils.ts:81-95`）。更新概览时先取现有 days，重新枚举日期并 `planTripDaySync` 删除超出日期、补齐新增日期；状态从非 DONE 到 DONE 时记录 Activity（`src/modules/trips/actions.ts:65-126`、`src/modules/trips/utils.ts:97-107`）。地点添加支持手输或从 Nominatim 搜索，若勾选国内地图坐标则 GCJ-02 转 WGS84，保留 6 位小数写入 locations Json（`src/modules/trips/actions.ts:163-206`、`src/app/(private)/trips/[id]/trip-location-editor.tsx:24-105`）。照片上传到 private 区，仅接受 `/api/files/private/` URL（`src/app/(private)/trips/[id]/trip-photo-uploader.tsx:21-76`、`src/modules/trips/actions.ts:231-250`）。

**d. 关键技术细节与依赖。** Nominatim 搜索器有 1 秒内存限流，使用 `fetchWithRetry` 请求 OSM，并设置 user-agent（`src/modules/trips/nominatim.ts:16-81`）。地图配置优先使用天地图 key，否则回退 OSM 瓦片（`src/lib/map.ts:19-38`）。Leaflet 组件禁 SSR 动态导入；TripMap 用 marker 和 polyline 展示当天路线，FootprintMap 聚合点并 fitBounds（`src/app/(private)/trips/leaflet-dynamic.tsx:7-21`、`src/app/(private)/trips/trip-map.tsx:32-67`、`src/app/(private)/trips/footprint/footprint-map.tsx:32-55`）。

**e. 现存问题与风险。** 客观事实：Leaflet marker 图标使用 unpkg CDN URL，这与“禁止运行时依赖 Google Fonts CDN”不冲突，但它仍是运行时第三方静态资源依赖；离线或 CDN 不可达时 marker 图标可能缺失（`src/app/(private)/trips/trip-map.tsx:10-18`、`src/app/(private)/trips/footprint/footprint-map.tsx:10-18`）。客观事实：Nominatim 限流是进程内对象，多实例不共享（`src/modules/trips/nominatim.ts:16-39`）。客观事实：足迹按地点 name 聚合，重名不同地点会合并（`src/modules/trips/queries.ts:207-235`）。

**f. 重构/优化点 + 可拓展功能。** 主观建议：短期把 Leaflet marker 图标本地化；中期给地点加入 geohash 或 osm id，避免同名合并；长期可支持 GPX/照片 EXIF 轨迹导入，但要考虑隐私和上传容量。

## 第 4 节 · API / 服务端接口清单

| 路径 | 方法 | 鉴权 | 入参 | 出参/副作用 | 用途与调用方 |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/export` | GET | 需登录 | 无 | 下载 `application/zip`，包含 Game/MediaItem/Trip/Post/Transaction/ExpenseCategory/Todo/SpecialDay/Link/Activity JSON，Decimal/bigint 转字符串 | 设置页“导出全站数据”（`src/app/api/admin/export/route.ts:25-79`、`src/app/(private)/admin/settings/page.tsx:26-40`） |
| `/api/auth/[...nextauth]` | GET/POST | Auth.js 自处理 | Auth.js 参数 | 登录/回调/session 等 | 登录表单和 Auth.js（`src/app/api/auth/[...nextauth]/route.ts:1-3`） |
| `/api/calendar/events` | GET | 需登录 | `start`、`end`，格式 `YYYY-MM-DD`，且 start < end | `{ events }` | FullCalendar 拉取聚合事件（`src/app/api/calendar/events/route.ts:17-32`、`src/lib/calendar.ts:19-27`） |
| `/api/cron/steam-sync` | GET | Bearer `CRON_SECRET` | `Authorization: Bearer ...` | `{ ok:true, created, updated, skipped }` 或错误；可 ping Healthchecks | 宿主机 cron 触发 Steam 同步（`src/app/api/cron/steam-sync/route.ts:17-57`、`docs/DEPLOY.md:244-248`） |
| `/api/files/private/[...path]` | GET | 需登录 | path segments | 读取 private 上传文件，`Cache-Control: private, max-age=3600`；404/401 | 旅行私密照片原图/缩略图（`src/app/api/files/private/[...path]/route.ts:8-35`） |
| `/api/health` | GET | 公开 | 无 | `{ ok: true }` | 健康检查与 e2e（`src/app/api/health/route.ts:3-4`、`e2e/smoke.spec.ts:3-8`） |
| `/api/posts/view` | POST | 公开 | JSON `{ slug }`，IP 从 headers 取 | `{ counted }`，增量更新公开文章 views | `ViewBeacon` 上报浏览（`src/app/api/posts/view/route.ts:13-29`、`src/app/(public)/blog/[slug]/view-beacon.tsx:5-24`） |
| `/api/quick/expense` | POST | Bearer `QUICK_ADD_TOKEN`；未配置返回 404 | JSON `{ text }` | 201 返回创建的 transaction 摘要；401/429/400 | 手机快捷指令记账（`src/app/api/quick/expense/route.ts:11-59`、`docs/QUICK_ADD.md:3-74`） |
| `/api/trips/nominatim` | GET | 需登录 | `q` | `{ results }` 或 403/429 | 旅行地点搜索表单（`src/app/api/trips/nominatim/route.ts:6-22`、`src/app/(private)/trips/[id]/trip-location-editor.tsx:24-39`） |
| `/api/upload` | POST | 需登录 | multipart `file`、`area`（取值 public 或 private）、`subdir` | `{ url, thumbUrl }` 或结构化错误 code | 头像、封面、Markdown 图片、旅行照片上传（`src/app/api/upload/route.ts:10-53`、`src/lib/upload-client.ts:82-111`） |

公开上传直出不是 `src/app/api/**`，但也是服务端 route：`/uploads/[...path]` GET 公开读取 public 上传文件，长缓存并限制路径在 public root 内（`src/app/uploads/[...path]/route.ts:6-29`）。

## 第 5 节 · 测试与质量

`npm run check` 由 TypeScript 编译检查、ESLint 和 Vitest 构成（`package.json:10-12`）。Vitest 配置会扫描 `src` 和 `scripts` 下的测试文件，并把 `@` 指向 `./src`（`vitest.config.ts:4-12`）。当前单测覆盖面较广：auth routes/rate-limit、action-auth、activity、calendar、dayjs、design、export-zip、geo、http、map、money、rating、secure-compare、ssrf、storage、upload-client、server-action-exports，以及 dashboard、expenses、games、links、media、posts、settings、special-days、todos、trips 的纯逻辑测试（`rg --files -g "*.test.ts" src` 输出共 47 个左右）。

Playwright 配置会自动运行 `npm run dev -- --hostname 127.0.0.1`，健康地址为 `/api/health`，本地复用已有服务，CI 重试 1 次（`playwright.config.ts:4-17`）。e2e 当前三条：健康检查返回 ok，匿名访问 `/blog` 不跳登录，使用 `ADMIN_USERNAME`/`ADMIN_PASSWORD` 登录后能访问 `/todos` 并看到标题（`e2e/smoke.spec.ts:3-28`）。

覆盖薄弱处：Playwright 只做冒烟，未覆盖导入向导、上传、Steam cron、Nominatim、博客发布、消费统计等用户流程。部分外部服务已通过单测用 fetcher/limiter 注入覆盖，例如 Steam、Nominatim、SSRF/HTTP、media metadata，但真实网络与生产反代链路仍需上线验收（`src/modules/games/steam.test.ts`、`src/modules/trips/nominatim.test.ts`、`src/modules/media/media-metadata.test.ts`）。

## 第 6 节 · 部署与运维

**镜像构建。** Dockerfile 基于 `node:22-bookworm-slim`，deps 阶段 `npm ci`，builder 阶段设置占位 `DATABASE_URL` 后 `npx prisma generate && npm run build`，runner 阶段设置 `NODE_ENV=production`、`PORT=3000`、`HOSTNAME=0.0.0.0`、`UPLOAD_DIR=/data/uploads`，复制 standalone、static、public、prisma、node_modules 和 entrypoint，最终以 node 用户运行 `scripts/docker-entrypoint.sh`（`Dockerfile:1-45`）。entrypoint 先 `prisma migrate deploy`，再 `node server.js`（`scripts/docker-entrypoint.sh:1-5`）。

**Compose 与 Caddy。** 开发 compose 只启动 Postgres 16（`docker-compose.dev.yml:1-16`）。生产 compose 包含 app、postgres、caddy 三个服务；app 依赖 postgres healthcheck，上传卷挂到 `/data/uploads`；caddy 暴露 80/443，读取 Caddyfile，并只读挂载 uploads_data（`docker-compose.prod.yml:1-72`）。Caddy 对 `/uploads/*` 直接从 `/data/uploads/public` file_server 并加 immutable 缓存，其他请求反代到 app:3000（`Caddyfile:1-12`）。

**CI/手动部署。** GitHub Actions 在 push 到 main/stage/feature/fix/docs、PR、手动触发时运行 quality；quality 执行 checkout、Node 22、`npm ci`、`npx prisma generate`、`npm run check`（`.github/workflows/deploy.yml:1-37`）。`build-and-deploy` 只在 `workflow_dispatch` 触发，校验 registry/SSH secrets，docker build/push 两个 tag，然后 SSH 到服务器执行 compose pull/up（`.github/workflows/deploy.yml:39-95`）。

**备份。** `scripts/backup.sh` 读取 `.env.production`，要求 `POSTGRES_DB`、`POSTGRES_USER`、`BACKUP_REMOTE`，并验证 rclone remote 是 crypt；备份流程是 `pg_dump | gzip`、busybox 打包 uploads volume、`rclone copy` 到远端、删除超过 retention 的远端文件，成功/失败 ping Healthchecks（`scripts/backup.sh:1-67`）。

**环境变量清单。**

| 变量 | 示例来源 | 用途 | 必填性 |
| --- | --- | --- | --- |
| `DATABASE_URL` | `.env.example:1`、`.env.production.example:20` | Prisma/Postgres 连接；`src/lib/db.ts` 缺失会抛错 | 必填 |
| `AUTH_SECRET` | `.env.example:2`、`.env.production.example:23` | Auth.js JWT/中间件 token secret | 生产必填 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `.env.example:3-4`、`.env.production.example:24-25` | seed 管理员、e2e 登录凭据 | 初始化/e2e 必填 |
| `SITE_URL` | `.env.example:5`、`.env.production.example:9` | RSS 生成绝对链接 | 生产建议必填 |
| `UPLOAD_DIR` | `.env.example:6`、`.env.production.example:13` | 上传根目录；生产为 `/data/uploads` | 生产必填 |
| `OUTBOUND_PROXY` | `.env.example:7`、`.env.production.example:14` | fetchWithRetry 出站代理 | 可选 |
| `STEAM_API_KEY` / `STEAM_ID` | `.env.example:8-9`、`.env.production.example:35-36` | Steam 同步 | 使用 Steam 同步时必填 |
| `TMDB_API_KEY` | `.env.example:10`、`.env.production.example:37` | 电影/剧集元数据优先 TMDB | 可选，缺失回退 NeoDB |
| `TIANDITU_KEY` | `.env.example:11`、`.env.production.example:39` | Leaflet 使用天地图瓦片 | 可选，缺失回退 OSM |
| `CRON_SECRET` | `.env.example:12`、`.env.production.example:32` | Steam cron Bearer 鉴权 | 启用 cron 时必填 |
| `QUICK_ADD_TOKEN` | `.env.example:13`、`.env.production.example:38` | 快捷记账 Bearer 鉴权；缺失接口 404 | 启用快捷记账时必填 |
| `HEALTHCHECKS_STEAM_URL` | `.env.example:14`、`.env.production.example:31` | Steam cron 成功/失败 ping | 可选 |
| `ICP_BEIAN_NO` / `GONGAN_BEIAN_NO` | `.env.example:15-16`、`.env.production.example:10-11` | 公开页页脚备案信息 | 可选 |
| `BASE_URL` | `.env.example:17` | Playwright baseURL | e2e 可选 |
| `APP_IMAGE` | `.env.production.example:2` | 生产 compose app 镜像 | 生产部署必填 |
| `REGISTRY_HOST` / `REGISTRY_IMAGE` | `.env.production.example:3-4` | 文档/CI registry 信息 | 手动部署 secrets 必填 |
| `SERVER_DEPLOY_PATH` | `.env.production.example:5` | CI SSH 部署目录 | 手动部署 secret 必填 |
| `SITE_DOMAIN` | `.env.production.example:8` | Caddy 站点域名 | 生产必填 |
| `TZ` | `.env.production.example:12` | compose 容器时区 | 生产建议 |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `.env.production.example:17-19` | Postgres 容器初始化与备份 | 生产必填 |
| `BACKUP_REMOTE` / `BACKUP_RETENTION_DAYS` / `HEALTHCHECKS_BACKUP_URL` | `.env.production.example:28-30` | rclone crypt 备份与保留策略 | 启用备份时必填/可选 |
| `SSRF_ALLOW_PRIVATE` | 代码使用但 example 未列出 | 显式放行内网出站 | 仅特殊场景；不建议默认开启 |

## 第 7 节 · 全局问题清单（按严重度排序）

| 严重度 | 现象 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| 高 | settings 导出的 JSON zip 不包含 uploads 文件 | `src/lib/export-zip.ts:10`、`src/app/api/admin/export/route.ts:56-69` | 仅靠后台导出无法完整恢复图片/私密照片 | 把导出说明继续保持显著；恢复依赖 `scripts/backup.sh` 的 uploads 卷备份 |
| 中 | 多处限流/去重为进程内 Map，不支持多实例或重启保持 | login rate limit `src/lib/auth/rate-limit.ts:14-48`、post views `src/modules/posts/view.ts:6-18`、quick expense `src/modules/expenses/quick.ts:47-69`、Nominatim `src/modules/trips/nominatim.ts:16-39` | 生产单实例影响有限；多实例或重启会丢状态 | 若扩成多实例，迁移到数据库/Redis-like 存储 |
| 中 | TECH_REPORT_SPEC/计划提到 todos @dnd-kit 拖拽看板，但当前代码没有实现 | `docs/TECH_REPORT_SPEC.md:52-53`；`rg "@dnd-kit|Dnd|Sortable" -- src/app/(private)/todos src/modules/todos` 无结果；Todo schema 无 sort `prisma/schema.prisma:94-102` | 读文档者会误以为待办可拖拽排序 | 在计划或进度中标注现状；若要实现需 schema 变更 |
| 中 | Leaflet marker 图标依赖 unpkg CDN | `src/app/(private)/trips/trip-map.tsx:10-18`、`src/app/(private)/trips/footprint/footprint-map.tsx:10-18` | CDN 不可达时地图标记图标可能缺失 | 本地托管 Leaflet marker 图片或改用自定义 DivIcon |
| 中 | Markdown 渲染未看到显式 sanitize 插件 | `src/components/markdown-renderer.tsx:35-38` | 单用户后台降低风险，但公开输出仍依赖库默认处理 | 如未来允许外部输入，加入明确 sanitize 策略 |
| 中 | Activity 无外键，删除业务对象后可能产生孤儿活动 | `prisma/schema.prisma:223-232`、`src/lib/activity-diagnostics.ts:99-125` | dashboard 活动或年度统计可能引用不存在对象 | 使用现有 diagnostics 做后台提示或清理工具 |
| 低 | `next-themes` 仍在依赖中，但运行时代码使用自写 ThemeProvider | `package.json:42`、`src/components/theme-provider.tsx:85-123`、`src/components/theme-provider.test.ts:6-14` | 文档/依赖清单容易误导，依赖可能冗余 | 若确认不再需要，未来单独清理依赖并更新版本表 |
| 低 | Nominatim API 错误在 route 中统一返回 429 | `src/app/api/trips/nominatim/route.ts:13-22` | 非限流错误也会被表现为“太频繁”，排查不精确 | 区分 limiter 错误与远端错误 |
| 低 | 导入执行多为逐行串行处理 | expenses `src/modules/expenses/actions.ts:392-427`、media `src/modules/media/import-executor.ts:95-144` | 大文件导入速度有限 | 采用分块/批处理并保留可解释的失败行 |

## 第 8 节 · 重构与演进路线建议

**短期（低风险，贴近现状）。**

- 客观事实：报告发现文档/SPEC 与代码的差异主要是 todos 拖拽和 next-themes。主观建议：先更新项目进度文档或后续 Stage 说明，避免维护者按过期意图理解代码。影响面是文档，不涉及运行时。
- 客观事实：Leaflet marker 图标来自 CDN。主观建议：把 marker PNG 放到仓库已有的 public 静态资源体系中并改成本地 URL。影响面仅地图组件。
- 客观事实：special-days 只有创建入口。主观建议：补列表/编辑/删除 Server Actions 和日历内管理 UI。影响面是 SpecialDay action、calendar client 和测试。

**中期（需要 schema 或共享机制）。**

- 客观事实：Todo 没有 sort 字段，也没有 dnd-kit。主观建议：如果仍要拖拽看板，先设计 `sort` 或列内排序字段，再实现 DnD 和持久化；前置条件是 Prisma migration 和回填排序。
- 客观事实：浏览、快捷记账、Nominatim、登录限流都是内存状态。主观建议：单实例继续可接受；若部署多副本，把这些状态迁到数据库表或轻量 KV。风险是引入过期清理和事务一致性。
- 客观事实：Activity 无外键但已有 diagnostics。主观建议：做后台“活动健康检查”页面，先展示孤儿再允许清理。影响面是 admin 页面和一两个 action。

**长期（功能增强，需产品取舍）。**

- 主观建议：导入/导出体系演进为可恢复备份格式，包含 JSON manifest、schema 版本、uploads 引用完整性校验，甚至可选打包图片。风险是包体大、私密文件权限和恢复覆盖策略复杂。
- 主观建议：旅行可加入 GPX/照片 EXIF 导入与路线回放。前置条件是明确隐私策略、上传容量和坐标系处理。
- 主观建议：书影/博客/消费可做全文搜索和跨模块时间线。前置条件是选择 Postgres FTS 或外部搜索，并处理公开/私密权限边界。

## 第 9 节 · 附录

### ER 关系简述

- User 独立存管理员账号；Auth.js Credentials 用 username/passwordHash 登录（`prisma/schema.prisma:9-14`、`src/auth.ts:30-48`）。
- Setting 是独立 key/value，存 profile 和 Steam 同步时间等（`prisma/schema.prisma:16-20`）。
- Transaction 可选关联 ExpenseCategory 和 ImportBatch，删除分类/批次时交易保留但外键置空（`prisma/schema.prisma:144-188`）。
- Trip 一对多 TripDay，TripDay 删除随 Trip cascade；TripDay date 在同 Trip 内唯一（`prisma/schema.prisma:195-221`）。
- Activity 没有外键，以 module/action/refId 逻辑关联业务对象，并有唯一约束防重复活动（`prisma/schema.prisma:223-232`）。
- Game、MediaItem、Link、Todo、SpecialDay、Post 是独立业务表，靠应用层进行聚合。

### 术语表 / 约定速查

| 术语 | 含义 |
| --- | --- |
| 公开面 | 未登录可访问的 `/`、`/blog/**`、`/nav`、`/rss.xml`、uploads 等 |
| 私密面 | 登录后可见的 dashboard、todos、games、media、trips、expenses、admin 页面 |
| Server Action | `src/modules/*/actions.ts` 中的 `"use server"` 写入口，函数内再次校验 session |
| UTC+8 日期 | 通过 `src/lib/dayjs.ts` 统一为 Asia/Shanghai；`@db.Date` 比较用 `YYYY-MM-DD` |
| public upload | `/uploads/...`，公开可读，可由 Caddy 直出 |
| private upload | `/api/files/private/...`，需要登录鉴权 |
| Activity | 跨模块关键动作的时间线，不是审计日志全量记录 |
| CalendarEvent | todos/trips/specialDays/media 汇总到 FullCalendar 的统一事件结构 |

### 未解疑问

- 推测：项目仍保留 `next-themes` 依赖可能是历史实现遗留，因为当前 ThemeProvider 测试明确要求不包含 `next-themes`（`package.json:42`、`src/components/theme-provider.test.ts:6-14`）。
- 推测：TECH_REPORT_SPEC 提到 todos dnd-kit 拖拽看板，可能来自 Stage 规划或未来目标；当前代码只在 links 和 expense categories 使用 dnd-kit（`docs/TECH_REPORT_SPEC.md:52-53`、`src/app/(private)/admin/links/links-admin.tsx:5-19`、`src/app/(private)/admin/expense-categories/expense-categories-admin.tsx:5-19`）。
- 待确认：生产是否会长期保持单实例。如果未来多实例，内存 rate limit/去重需要重新设计。

## 完成核对清单

- [x] 第 0 节含 TL;DR + 模块全景表。
- [x] 第 1–2 节：技术栈与版本、四层分层约定、渲染/路由、数据层、鉴权、安全、存储、活动、日历聚合、通用 UI 均已覆盖。
- [x] 第 3 节：10 个模块各有独立小节，且每个小节 a–f 六维度齐全；各模块重点机关均已讲到。
- [x] 第 4 节：`src/app/api/**` 下每一个 `route.ts` 都有对应条目，并额外说明了 `src/app/uploads/[...path]/route.ts`。
- [x] 第 5 节：覆盖 vitest + playwright + `check` 脚本。
- [x] 第 6 节：覆盖 Docker / compose / Caddy / CI / backup，且环境变量对照两个 `.env*.example` 列全。
- [x] 第 7 节：问题按严重度排序，每条有证据定位。
- [x] 第 8 节：路线建议分短/中/长期。
- [x] 报告内所有文件路径经 `rg`/`ls` 抽查，确认真实存在。
- [x] `git diff --stat` 仅显示 `docs/` 下新增文件，无任何既有文件被修改/重命名/删除。
