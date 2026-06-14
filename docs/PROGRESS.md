# 项目进度

## 当前状态
- 进行中：Stage 11（待开始）
- 已完成：Stage 0、Stage 1、Stage 2、Stage 3、Stage 4、Stage 5、Stage 6A（本地生产化准备）、Stage 7、Stage 8、Stage 9、Stage 10
- 线上版本：（未上线）

---

## Stage 日志（倒序追加）

### Stage 10 · 书影导入与搜索补全 —— 2026-06-15 完成
- 完成内容：新增 `/media/import` 私密导入向导，支持 CSV/XLSX 上传、UTF-8/GBK CSV 解码、SheetJS 表格解析、表头自动猜测、手动列映射、默认类型与状态、状态值对应关系、前 20 行预览、重复统计和逐行容错导入；添加书影 Dialog 顶部新增联网搜索，图书走 NeoDB，电影/剧集优先 TMDB 并在失败时回退 NeoDB，选中结果后回填表单字段与外部 ID。
- 关键文件：`src/modules/media/import-parser.ts`、`src/modules/media/import-executor.ts` 与对应测试覆盖解析、评分换算、doubanId 提取、编码回退、去重和封面失败容错；`src/modules/media/metadata.ts` 封装 NeoDB/TMDB 搜索映射；`src/modules/media/actions.ts` 新增导入与搜索 Server Actions；`src/app/(private)/media/import/*` 与 `src/app/(private)/media/media-library.tsx` 实现导入页和添加 Dialog 搜索补全。
- 关键决定与偏离：新增并锁定 `xlsx@0.18.5` 与 `iconv-lite@0.7.2`；`tests/fixtures/` 原本不存在，本轮按确认创建最小脱敏豆伴样本，并在测试中用同一内容生成 GBK buffer 覆盖回退分支；未新增 `ImportBatch` 表，按 PLAN 允许的简化方案在导入页展示结果面板；封面下载失败只记录 warning 并置空，不保存外部 URL，也不阻断整行导入。
- Stage 10 验收：通过 - fixtures 单测覆盖列猜测、5 星评分乘 2、`subject/(\d+)` 提取和 UTF-8/GBK 分支；通过 - `/media/import` 四步流程已实现并在 Server Action 中做 session 校验；通过 - 导入写入按 `doubanId` 与类型 + 标题 + 年份判重，逐行容错并展示成功/跳过/失败原因；通过 - 封面经 `saveFromUrl` 转存，失败置空继续导入；通过 - 添加 Dialog 搜索补全支持 NeoDB/TMDB 与 TMDB 失败回退提示；待人工验收 - 真实豆瓣导出文件导入数量、重复导入全跳过和库内 `coverUrl` 全为 `/uploads` 路径需由用户用真实文件点验。
- 遗留 TODO：真实豆瓣导出文件体量较大时，当前向导会把解析后的行保存在客户端状态并提交给 Server Action，若后续遇到超大文件再改为临时草稿存储；TMDB 搜索结果列表的作者/导演受 search 接口字段限制，当前 TMDB 结果先回填标题、原名、年份、日期、海报和 `tmdbId`，导演可后续通过详情/credits 接口增强。
- 验证：`npx.cmd vitest run src/modules/media/media-import.test.ts src/modules/media/media-import-executor.test.ts src/modules/media/media-metadata.test.ts src/modules/media/media.test.ts` ✅（4 个测试文件、16 条测试通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run check` ✅（18 个测试文件、85 条测试通过）。

### Stage 9 · 书影模块（手动管理） —— 2026-06-14 完成
- 完成内容：新增 `MediaItem`、`MediaType`、`MediaStatus` 数据模型与迁移，完成 `/media` 私密书影收藏册页面；支持图书 / 电影 / 剧集顶层 Tab、状态计数 Tab、标签筛选、标题搜索、书影模块色统计徽章和响应式封面网格；支持手动添加书影条目、封面 URL/上传、评分、标签、想看/想读上映或出版日期；新增 `/media/[id]` 详情页，可编辑元信息、开始/完成日期、Markdown 感想和剧透开关，剧透感想默认折叠。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260614140757_add_media_items/migration.sql` 定义书影枚举和表；`src/modules/media/utils.ts`、`src/modules/media/actions.ts`、`src/modules/media/queries.ts` 封装输入归一化、筛选解析、状态日期联动、查询与 Server Actions；`src/modules/media/media.test.ts` 覆盖归一化、筛选、文案和日期联动；`src/app/(private)/media/page.tsx`、`src/app/(private)/media/media-library.tsx`、`src/app/(private)/media/[id]/page.tsx` 与 `src/app/(private)/media/[id]/media-detail-editor.tsx` 实现列表、添加 Dialog 和详情编辑。
- 关键决定与偏离：未新增第三方依赖，复用 `RatingStars`、`TagInput`、`MarkdownEditor`、`MarkdownRenderer`、`StatusBadge` 与 Stage 5 的上传/转存链路；状态联动集中在 action 层，`DOING` 且 `startedAt` 为空自动填今天，`DONE` 且 `finishedAt` 为空自动填今天，详情页仍允许手动修改两个日期；本轮尝试按 AGENTS.md 启动 WSL Docker 时当前 WSL 用户无 Docker socket 权限，但 Windows 侧 `localhost:5432` 已可达，`prisma migrate dev` 已成功生成并应用迁移。
- Stage 9 验收：通过 - 三种类型分 Tab 管理并写入 URL 参数，图书状态文案使用想读/在读/读过；通过 - 状态切换日期联动在 `src/modules/media/utils.ts` 与 action 层实现，纯逻辑单测覆盖；通过 - 剧透感想在详情页服务端渲染为默认折叠的 `<details>` 并显示“已隐藏剧透，点击展开”；通过 - 评分、标签、搜索筛选组合由查询层和页面控件实现，归一化与筛选解析有单测；通过 - 封面墙、状态徽章和统计数字使用收藏册 token 与书影模块色；通过 - `npm run check` 全绿。
- 遗留 TODO：Stage 10 接入豆瓣历史导入与联网搜索补全时复用 `MediaItem` 的 `doubanId`、`tmdbId`、`isbn`、`coverUrl`、`releaseDate` 字段，并继续遵守外部封面转存本地；Stage 16 活动流接入时在书影状态首次变为 `DONE` 时按类型记录“读完/看完《x》”。
- 验证：`npx.cmd vitest run src/modules/media/media.test.ts` 先失败于缺少 `./utils`，实现后 ✅（6 条通过）；`npx.cmd prisma migrate dev --name add_media_items` ✅；`npx.cmd prisma generate` ✅；`npx.cmd tsc --noEmit` ✅；`npm.cmd run check` ✅（15 个测试文件、75 条测试通过）；`npx.cmd prisma migrate status` 未复验成功，原因是本轮后段 `localhost:5432` 端口不可达，尝试按 AGENTS.md 通过 WSL Docker 重启 PostgreSQL 时当前 WSL 用户仍无 `/var/run/docker.sock` 权限，需用户修复 Docker 组/会话或保持数据库容器存活后重跑。

### Stage 8 · Steam 同步 —— 2026-06-14 完成
- 完成内容：接入 Steam Web API 游戏库同步，`/games` 页面新增“同步 Steam”按钮和上次同步时间；新增 `/api/cron/steam-sync` Bearer Token 定时同步接口；同步成功写入 `Setting` 的 `steam.lastSyncAt`，cron 按成败 ping `HEALTHCHECKS_STEAM_URL`；合并规则按 `steamAppId` 幂等 upsert，Steam 端消失的游戏保留不删。
- 关键文件：`src/modules/games/steam.ts` 封装 Steam API 请求、响应解析、事务合并与 `Setting` 更新时间；`src/modules/games/steam.test.ts` 覆盖主观字段保护和 BACKLOG 自动转 PLAYING；`src/modules/games/actions.ts`、`src/modules/games/queries.ts` 与 `src/app/(private)/games/games-library.tsx` 接入手动同步、toast 和上次同步时间；`src/app/api/cron/steam-sync/route.ts` 提供宿主机 cron 入口；`src/lib/auth/routes.ts`、`src/middleware.ts` 与 `AGENTS.md` 同步公开白名单；`docs/DEPLOY.md` 增加 05:00 crontab 示例。
- 关键决定与偏离：`src/lib/http.ts` 已在 Stage 5 创建并满足 10 秒超时、一次重试和 `OUTBOUND_PROXY` 代理要求，本阶段复用而非重建；Steam CDN 封面继续作为全站外部图片转存纪律的唯一热链例外；未新增第三方依赖，复用 `undici@6.26.0`、`sonner@2.0.7` 和既有 `Game`/`Setting` 模型，无 schema 变更。
- Stage 8 验收：通过 - 合并规则单测覆盖“用户已修改 status/rating/reviewMd/tags 的游戏”再次同步时主观字段不被覆盖、客观字段正常更新；通过 - BACKLOG 且 `playtime2w > 0` 自动升级为 PLAYING；通过 - `steamAppId` 查询后创建或更新，重复同步不会按 Steam 数据产生重复记录；通过 - `/api/cron/steam-sync` 已加入公开白名单并在路由内校验 `Authorization: Bearer ${CRON_SECRET}`，错误 token 返回 401 的行为由代码路径保证；未验证 - 未在本轮连接真实 Steam 账号执行浏览器点击同步，需登录后在 `/games` 手动点击并观察真实游戏库与 `steam.lastSyncAt`；未验证 - 未在真实服务器安装 crontab 和查看 Healthchecks 面板，最终上线时按 `docs/DEPLOY.md` 执行。
- 遗留 TODO：最终上线时配置真实 `HEALTHCHECKS_STEAM_URL` 并观察至少一次每日 05:00 cron 心跳；如后续增加 Steam 愿望单或成就数据，应复用 `src/lib/http.ts` 并继续保持主观字段保护规则。
- 验证：`npx.cmd tsc --noEmit` ✅；`npx.cmd vitest run src/modules/games/steam.test.ts src/lib/auth/routes.test.ts` ✅（2 个测试文件、23 条测试通过）；`npm.cmd run check` ✅（13 个测试文件、67 条测试通过）。

### Stage 7 · 游戏模块（手动管理） —— 2026-06-14 完成
- 完成内容：新增 `Game`/`GameStatus` 数据模型与迁移，完成 `/games` 私密游戏收藏册页面；支持状态、平台、标签、名称搜索和排序 URL 筛选，支持统计徽章、响应式封面墙、手动添加、封面 URL/上传、详情编辑、Markdown 感想和想玩/库存 → 在玩 → 已通关快捷状态流转。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260614120731_add_games/migration.sql` 定义游戏表；`src/modules/games/*` 封装输入归一化、筛选解析、查询与 Server Actions；`src/app/(private)/games/*` 实现收藏册页面、筛选栏、封面网格和添加/详情 Dialog。
- 关键决定与偏离：未新增第三方依赖；Stage 7 仅做手动管理，Steam 同步、cron、活动时间线埋点、日历事件和删除游戏留给后续 Stage；非 Steam 远程封面在 Server Action 中优先转存到 public uploads，Steam CDN 封面保留为 Stage 8 兼容例外。
- Stage 7 验收：通过 - 手动添加表单包含名称、平台、封面、状态、评分、时长、标签和备注；通过 - URL searchParams 覆盖状态/平台/标签/搜索/排序；通过 - 封面墙手机 2 列、桌面 4-5 列；通过 - 状态徽章、统计徽章和占位封面使用游戏模块色；通过 - `npm run check` 全绿。
- 遗留 TODO：Stage 8 接入 Steam 同步时复用 `Game` 表的 `steamAppId`、`source`、`playtime2w` 和 `lastPlayedAt` 字段，并补充合并规则单测；Stage 16 再接入游戏通关 Activity；如需要删除游戏，后续单独加 ConfirmDialog 与对应 action。
- 验证：`wsl.exe -d Ubuntu-24.04 -- sh -lc "... docker compose -f docker-compose.dev.yml up -d"` ✅；`npx.cmd prisma migrate dev --name add_games` ✅；`npx.cmd prisma generate` ✅；`npx.cmd prisma migrate status` ✅（5 个迁移，数据库结构最新；曾因 WSL 端口转发短暂失效重启保活后通过）；`npx.cmd vitest run src/modules/games/games.test.ts` ✅（4 条通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npm.cmd run check` ✅（12 个测试文件、65 个测试通过）。

### Stage 6A · 本地生产化准备 —— 2026-06-14 完成
- 完成内容：按“暂不真实上线”的策略完成生产部署基础：standalone 构建、生产 Dockerfile、`docker-compose.prod.yml`、`Caddyfile`、`.env.production.example`、手动触发的 GitHub Actions 部署门、rclone crypt 备份脚本、`docs/DEPLOY.md` 部署手册和 Playwright 冒烟测试骨架；公开页脚支持配置后展示 ICP/公安备案号。
- 关键文件：`Dockerfile` 与 `scripts/docker-entrypoint.sh` 负责容器内 `prisma migrate deploy` 后启动 standalone `server.js`；`docker-compose.prod.yml` 编排 app/postgres/caddy 与持久 uploads/postgres/caddy volumes；`Caddyfile` 预留 `{$SITE_DOMAIN}` 并直出 `/uploads/**` public 文件；`.github/workflows/deploy.yml` 自动跑 quality、手动触发 build-and-deploy；`scripts/backup.sh` 打包数据库与 uploads 并上传 rclone crypt 远端；`playwright.config.ts` 与 `e2e/smoke.spec.ts` 定义冒烟测试。
- 关键决定与偏离：新增并锁定 `@playwright/test@1.60.0`；移除 `next/font/google` 构建期网络依赖，改用 CSS 系统字体变量；为保证 `npm run build` 与 Docker/CI 构建不依赖构建期数据库，当前 `/blog`、`/blog/[slug]`、`/blog/page/[page]`、`/nav` 与 `/rss.xml` 暂时改为动态渲染，后续如恢复静态化需先设计构建期数据源或 ISR 策略；Docker builder 阶段使用占位 `DATABASE_URL` 仅供 `prisma generate` 读取配置，运行时仍由 `.env.production` 注入真实连接串。
- Stage 6A 验收：通过 - `npm run check` 全绿；通过 - `npm run build` 可生成 standalone 输出，仍有 Next 16 对 `middleware` 命名的弃用警告与 Turbopack NFT tracing 非阻塞警告；通过 - `docker compose --env-file .env.production.example -f docker-compose.prod.yml config` 可解析（本地验证使用 `APP_ENV_FILE=.env.production.example` 覆盖）；通过 - app 镜像可构建；通过 - 容器内 `sharp@0.35.1` 可加载并生成 WebP buffer；通过 - app 镜像内 `prisma migrate deploy` 可对 compose PostgreSQL 应用 4 个迁移；通过 - `npm run e2e` 三条 Playwright 冒烟用例全过；最终上线待验证 - 真实 HTTPS、Caddy 线上直出、对象存储加密备份、Healthchecks、服务器安全组、手动部署 workflow。
- 遗留 TODO：最终上线阶段配置真实 `.env.production`、registry secrets、服务器安全组、rclone crypt 和 Healthchecks，并在线上域名重跑完整 e2e；后续 Stage 8 本地开发若未配置 `HEALTHCHECKS_STEAM_URL`，Steam 同步心跳可跳过，最终上线统一补验；后续若恢复公开博客/导航静态化，需要重新验证发布/撤回后的 revalidate 行为。
- 验证：`npm.cmd run check` ✅（11 个测试文件、61 个测试通过）；`npm.cmd run build` ✅（有非阻塞 warning）；`wsl.exe ... docker compose --env-file .env.production.example -f docker-compose.prod.yml config` ✅；`wsl.exe ... docker compose --env-file .env.production.example -f docker-compose.prod.yml build app` ✅；容器内 `node -e "console.log(require('sharp').versions.sharp)"` ✅（0.35.1）；容器内 sharp 生成 WebP buffer ✅（44 bytes）；容器内 `./node_modules/.bin/prisma migrate deploy` ✅；`npx.cmd playwright install chromium` ✅；`npm.cmd run e2e` ✅（3 条通过；普通沙箱下浏览器启动曾因 `spawn EPERM` 失败，提升权限后验证通过）。

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
