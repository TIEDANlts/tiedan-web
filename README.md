# 铁蛋的个人网站

单用户个人生活管理网站：游戏 / 书影 / 旅行 / 博客 / 消费 / 待办日历 / 导航 / 首页聚合。

当前进度：Stage 16 已完成首页聚合与活动时间线，网站第一个完整版本已收官；Stage 0-15 已完成，真实上线部署与云端备份验收延后到最终上线阶段。Stage 16 已接入公开首页、私密仪表盘、活动流、PWA 清单、全站数据导出和 404/error 收尾页。

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
  - `STEAM_API_KEY` / `STEAM_ID`（Stage 8 Steam 游戏库同步）
  - `TMDB_API_KEY`（Stage 10 电影 / 剧集搜索补全，可选；失败会回退 NeoDB）
  - `CRON_SECRET`（Stage 8 定时同步接口 Bearer token）
  - `QUICK_ADD_TOKEN`（Stage 13 快捷记账 Bearer token；未配置则接口返回 404）
  - `TIANDITU_KEY`（Stage 14 旅行地图瓦片；未配置时回退 OSM 标准瓦片）
  - `HEALTHCHECKS_STEAM_URL`（可选；Stage 8 Steam 同步心跳）
  - `ICP_BEIAN_NO` / `GONGAN_BEIAN_NO`（可选；配置后公开页脚展示备案信息）
  - `BASE_URL`（e2e 使用；本地建议用 `http://127.0.0.1:3000`，避免 Windows 上 `localhost` 优先解析到未监听的 IPv6 `::1`）

`AUTH_SECRET` 应使用随机值，例如：

```powershell
node -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

## 本地启动

### 一键启动

```powershell
npm.cmd run dev:local
```

这个命令会依次做完：

1. 通过 WSL `Ubuntu-24.04` 启动 PostgreSQL。
2. 在 WSL 内确认 PostgreSQL 容器已就绪。
3. 在 WSL 内运行 `prisma migrate deploy` 和 `prisma generate`。
4. 在 WSL 内执行 `npm run db:seed`。
5. 在 WSL 内启动 Next.js 开发服务器，并监听 `0.0.0.0:3000`。

脚本会给 WSL 内部命令临时注入 `DATABASE_URL=postgresql://personal_site:personal_site@127.0.0.1:5432/personal_site?schema=public`。这样 Prisma、seed 和 Next dev server 都直接从 WSL 内访问 Docker PostgreSQL，不再依赖 Windows 到 WSL 的 `localhost:5432` 端口转发。

前提条件：

- 已把 `.env.example` 复制为 `.env`。
- 已执行过 `npm.cmd install`。
- Windows 上已安装 WSL，并且 `Ubuntu-24.04` 里可用 Docker。

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

如果 Windows 侧 `localhost` / `127.0.0.1` 到数据库不稳定，优先使用 `npm.cmd run dev:local`。它会把数据库相关命令和 Next dev server 都放在 WSL 内运行，绕开 Windows 侧端口转发抖动，不需要手工改 `.env`。

4. 初始化管理员账号：

```powershell
npm.cmd run db:seed
```

5. 启动开发服务器：

```powershell
npm.cmd run dev
```

访问 `/login` 后使用 `.env` 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录。`/todos` 是真实待办页面，`/expenses` 是消费流水页，`/admin/expense-categories` 是消费分类管理入口，未登录访问私密页面会被重定向到登录页。

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

`npm.cmd run check` 包含 TypeScript 类型检查、ESLint 和 Vitest。`npm.cmd run e2e` 使用 Playwright，会自动启动 Next dev server；需要配置 `ADMIN_USERNAME`、`ADMIN_PASSWORD`，如覆盖 `BASE_URL`，本地建议使用 `http://127.0.0.1:3000`。

Stage 2 新增 Markdown 渲染依赖：`react-markdown@10.1.0`、`remark-gfm@4.0.1`、`rehype-pretty-code@0.14.3`、`shiki@4.2.0`。

Stage 3 新增拖拽排序依赖：`@dnd-kit/core@6.3.1`、`@dnd-kit/sortable@10.0.0`、`@dnd-kit/utilities@3.2.2`。

Stage 4 未新增第三方依赖；Popover 复用已安装的 `radix-ui@1.5.0` 聚合包。

Stage 5 新增图片处理与出站请求依赖：`sharp@0.35.1`、`undici@6.26.0`。上传图片会经过 `rotate()` 旋正、长边 2000px 压缩、jpeg/webp 质量 82 重编码去 EXIF/GPS，并额外生成 480px 缩略图；外部 favicon/图片下载统一经 `src/lib/http.ts`，支持 10 秒超时、一次重试与可选 `OUTBOUND_PROXY`。

Stage 6A 新增冒烟测试依赖：`@playwright/test@1.60.0`。生产化准备文件包括 `Dockerfile`、`docker-compose.prod.yml`、`Caddyfile`、`.env.production.example`、`.github/workflows/deploy.yml`、`scripts/backup.sh` 和 `docs/DEPLOY.md`。真实服务器、HTTPS、对象存储加密备份、Healthchecks 和自动部署验收留到最终上线阶段。

Stage 7 未新增第三方依赖；新增数据库迁移 `20260614120731_add_games`。本地更新数据库时运行：

```powershell
npx.cmd prisma migrate dev
npx.cmd prisma generate
```

Stage 8 未新增第三方依赖；复用 Stage 5 的 `undici@6.26.0` 与 `src/lib/http.ts`。Steam 同步会读取 `STEAM_API_KEY`、`STEAM_ID` 和 `CRON_SECRET`，成功后写入 `Setting` 的 `steam.lastSyncAt`；Steam CDN 封面按项目约定允许热链，前端加载失败会回退占位块。

Stage 9 未新增第三方依赖；新增数据库迁移 `20260614140757_add_media_items`。本地更新数据库时运行：

```powershell
npx.cmd prisma migrate dev
npx.cmd prisma generate
```

Stage 10 新增导入解析依赖：`xlsx@0.18.5`、`iconv-lite@0.7.2`。`/media/import` 支持豆伴 CSV/XLSX 四步导入，CSV 会先尝试 UTF-8，失败后回退 GBK；图书搜索走 NeoDB，电影 / 剧集优先 TMDB，失败时回退 NeoDB。所有导入和搜索补全封面都会在服务端经 `src/lib/storage.ts` 转存到 `/uploads/media/...`，转存失败则留空封面，不保存外链。

Stage 11 未新增第三方依赖；新增数据库迁移 `20260614175559_add_expenses`。本地更新数据库时运行：

```powershell
npx.cmd prisma migrate dev
npx.cmd prisma generate
npm.cmd run db:seed
```

`db:seed` 会在创建 / 更新唯一管理员后，幂等补齐默认消费分类；已存在的分类不会被覆盖。

Stage 12 未新增第三方依赖；复用 `xlsx@0.18.5` 与 `iconv-lite@0.7.2`。`/expenses/import` 支持微信 UTF-8 CSV 与支付宝 GBK CSV，自动定位包含“交易时间”的表头行，过滤交易关闭 / 已全额退款行，预览重复与解析失败后再确认导入；`/expenses/import/history` 展示导入批次。测试 fixtures 包含 `tests/fixtures/alipay-sample.csv`（GBK）与 `tests/fixtures/wechat-sample.csv`（UTF-8）。

Stage 13 新增图表依赖：`echarts@6.1.0`、`echarts-for-react@3.0.6`。`/expenses/stats` 提供月 / 周 / 年消费报表；`POST /api/quick/expense` 使用 `Authorization: Bearer ${QUICK_ADD_TOKEN}` 快捷记账，配置方法见 `docs/QUICK_ADD.md`。

Stage 14 新增地图依赖：`leaflet@1.9.4`、`react-leaflet@5.0.0`、`@types/leaflet@1.9.21`。`/trips` 是旅行行程列表，`/trips/[id]` 支持按天维护地点、笔记和私密照片，`/trips/footprint` 展示已完成行程足迹；私密照片通过 `/api/files/private/**` 登录鉴权读取。

Stage 15 新增日历依赖：`@fullcalendar/core@6.1.20`、`@fullcalendar/react@6.1.20`、`@fullcalendar/daygrid@6.1.20`、`@fullcalendar/list@6.1.20`、`@fullcalendar/interaction@6.1.20`。新增数据库迁移 `20260615085002_add_special_days`，本地更新数据库时运行：

```powershell
npx.cmd prisma migrate dev
npx.cmd prisma generate
```

`/calendar` 会聚合待办、旅行、重要日子和书影上映日；桌面默认月视图，手机默认列表视图，模块图例显隐偏好保存在浏览器 localStorage。

Stage 16 未新增第三方依赖；新增数据库迁移 `20260615120240_add_activity`。本地更新数据库时运行：

```powershell
npx.cmd prisma migrate dev
npx.cmd prisma generate
```

`/` 未登录时展示公开编辑部门面，登录后展示收藏册仪表盘；`/admin/settings` 可编辑首页头像、名字和简介，并可导出全站 JSON zip；PWA 清单与图标已接入，但没有 Service Worker。

生产 Compose 配置检查（通过 WSL Docker）：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && APP_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.prod.yml config"
```

## 当前功能

- 公开路由：`/login`、`/`、`/blog/**`、`/nav`、`/rss.xml`、`/uploads/**`、`/api/auth/**`、`/api/health`、`/api/posts/view`、`/api/cron/steam-sync`、`/api/quick/**`。
- 私密路由：除白名单外默认要求登录；登录后 `/` 显示收藏册仪表盘和私密侧边栏。
- 登录：Auth.js v5 Credentials，bcrypt 校验 `User.passwordHash`，JWT session 30 天。
- Seed：`scripts/seed.ts` 幂等创建 / 更新唯一管理员，并补齐默认消费分类。
- 私密布局：桌面端固定侧边栏，移动端汉堡抽屉；菜单包含仪表盘、待办、日历、游戏、书影、旅行、消费、消费分类、博客管理、导航管理和设置。
- 首页聚合：匿名访问 `/` 展示公开门面，读取 `profile.name`、`profile.bio`、`profile.avatar` 并展示最新 3 篇已发布文章、博客和导航入口；登录后同一路径展示今日待办、本月消费、最近在玩、在读在看、下一段旅行、未来 14 天重要日子、今年数字和活动时间线，移动端按今日待办、本月消费、最近在玩、其余单列排布。
- 活动时间线：`Activity` 记录通关游戏、读完/看完书影、文章首次发布、完成旅行和账单导入，仪表盘最近 20 条按上海日期分组展示并跳转到对应模块。
- 全局日历：`/calendar` 使用 FullCalendar 聚合待办、旅行、重要日子和书影上映日；中文 locale、周一开头、桌面月视图、手机列表视图，支持“月 / 列表”切换、模块图例显隐、事件点击跳转和日期空白处快捷新建。
- 重要日子：日历内可新建一次性或每年重复的重要日子；重复事件按查询年份展开，2 月 29 日在平年顺延到 2 月 28 日。
- 游戏：`/games` 是私密游戏收藏册，支持状态 Tab（含计数）、平台筛选、标签多选、名称搜索和最近游玩/评分/名称排序；顶部统计显示总数、已通关数和总时长。
- 游戏管理：支持手动添加游戏、上传或填写封面、评分、时长、标签和 Markdown 感想；详情 Dialog 可编辑全部手动字段，并提供想玩/库存 → 在玩 → 已通关的快捷状态流转。
- Steam 同步：`/games` 顶部可手动同步 Steam 游戏库并显示上次同步时间；同步按 `steamAppId` 合并，只更新名称、封面、总时长、近两周时长和最近游玩时间，不覆盖评分、感想、标签和用户手动状态，唯一自动状态流转是 BACKLOG 且近两周有时长时变为 PLAYING；`GET /api/cron/steam-sync` 使用 `Authorization: Bearer ${CRON_SECRET}` 供宿主机 cron 调用。
- 书影：`/media` 是私密书影收藏册，支持图书 / 电影 / 剧集顶层 Tab，状态 Tab 含计数，图书自动使用想读 / 在读 / 读过文案；支持标签筛选、标题搜索、书影模块色统计徽章和响应式大封面网格。
- 书影管理：支持手动添加类型、标题、原名、作者 / 导演、年份、封面 URL 或上传、状态、评分和标签；想看 / 想读状态可填写上映 / 出版日期；详情页 `/media/[id]` 可编辑元信息、开始 / 完成日期、Markdown 感想和剧透开关，剧透感想默认折叠显示“已隐藏剧透，点击展开”。
- 书影状态联动：Server Action 中切换为在看 / 在读且 `startedAt` 为空时自动填今天；切换为看过 / 读过且 `finishedAt` 为空时自动填今天；两个日期都可在详情页手动修改。
- 书影导入：`/media/import` 提供上传、列映射、预览和执行四步流程；支持标题 / 评分 / 短评 / 日期 / 链接 / 年份 / 封面列自动预选，按 `doubanId` 或类型 + 标题 + 年份跳过重复，逐行容错并展示成功、跳过、失败原因。
- 书影搜索补全：添加书影 Dialog 顶部可联网搜索；图书使用 NeoDB，电影 / 剧集优先 TMDB，TMDB 不可用时自动回退 NeoDB 并提示；选中结果后回填标题、原名、作者 / 导演、年份、上映 / 出版日期、外部 ID 和本地化封面。
- 消费流水：`/expenses` 是私密消费流水页，支持月份左右切换、日期 / 方向 / 分类 / 平台 / 关键词组合筛选，按日期倒序分组，日支出小计只统计支出；支出金额使用消费模块色，收入使用绿色模块色，不计收支显示弱色。
- 消费报表：`/expenses/stats` 提供月 / 周 / 年视图；月视图包含本月支出、环比、收入、结余、分类占比、每日支出、Top 10 商户和分类明细；周视图比较本周 / 上周并按最近 8 周计算星期平均；年视图展示 12 个月支出趋势与收入虚线、年度分类占比和年度总览。
- 快捷记账：`POST /api/quick/expense` 使用独立 Bearer Token，解析“咖啡 35”这类文本末尾金额，写入 `platform=quick` 支出流水并自动分类；同一 token 每分钟最多 10 次，未配置 `QUICK_ADD_TOKEN` 时接口禁用。
- 旅行：`/trips` 是私密旅行收藏册，支持计划中 / 已完成 Tab、新建行程、封面、目的地标签和旅行模块色统计徽章；创建时按日期范围自动生成每天的 `TripDay`。
- 旅行详情：`/trips/[id]` 提供大封面、基础信息、Markdown 总结、预算、计划中行前清单、按天地点/笔记/照片九宫格和 Leaflet 地图；照片上传到 private 区，缩略图用于九宫格，原图点击打开。
- 地图与足迹：地图瓦片优先使用天地图 `vec_w` + `cva_w`，无 `TIANDITU_KEY` 时回退 OSM；地点搜索通过服务端 Nominatim 代理并限频，手动坐标可勾选“来自国内地图”做 GCJ-02 到 WGS-84 转换；`/trips/footprint` 聚合已完成行程地点。
- 手动记账：`/expenses` 顶部和移动端底部提供“记一笔”入口；表单使用大号金额输入、支出 / 收入切换、按方向过滤的分类宫格、默认今天日期、商户和备注字段，手动流水固定写入 `platform=manual`、`txnNo=null`；未手选分类时会复用导入分类规则尝试自动分类。
- 账单导入：`/expenses/import` 支持微信 / 支付宝 CSV 上传、平台自动识别、预览统计和确认导入；支付宝 CSV 按 GBK 自动解码，微信金额会剥离 `¥` 前缀，重复交易按 `[platform, txnNo]` 跳过，导入批次写入 `ImportBatch` 并可在 `/expenses/import/history` 查看。
- 数据导出：`GET /api/admin/export` 登录后可下载全站 JSON zip，包含 Game、MediaItem、Trip（含 TripDay）、Post、Transaction、ExpenseCategory、Todo、SpecialDay、Link、Activity 和 manifest.json；图片不打包，JSON 保留 URL/key。
- 分类规则沉淀：流水页行内修改分类时，如果该交易有商户名，会询问是否以后把该商户归到所选分类；确认后会把商户名追加进该分类 keywords。
- 消费分类管理：`/admin/expense-categories` 支持新增、编辑、删除和拖拽排序分类，使用 `TagInput` 管理自动分类关键词；删除分类时保留流水并将其 `categoryId` 置空。
- 金额工具：`src/lib/money.ts` 使用 Prisma Decimal 做金额格式化与求和，禁止浮点数参与合计，Server Component 传给 Client Component 前把 Decimal 转成字符串。
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
- PWA：`manifest.webmanifest`、192/512 图标和 apple-touch-icon 已接入，添加到主屏幕后使用独立窗口名称和站点图标；当前不实现 Service Worker。
- 通用组件：`PageHeader`、`EmptyState`、`ConfirmDialog`、`TagInput`、`StatusBadge`、`RatingStars`、`MarkdownEditor`、`MarkdownRenderer`。
- 全站收尾：根 layout 使用统一 `<title>` 模板；全站 404 和 error 页使用中文文案；Stage 2 临时 `/admin/playground` 已删除。
- 健康检查：`GET /api/health` 返回 `{ ok: true }`。
- 生产化准备：`next.config.ts` 已开启 standalone 输出；生产镜像入口会先执行 `prisma migrate deploy` 再启动 `server.js`；Caddy 模板会在最终上线时直出 `/uploads/**` public 文件。
- CI/CD：GitHub Actions 的 quality job 在 push/PR 自动运行；build-and-deploy job 只允许手动触发，当前阶段不会误部署。
- 备份：`scripts/backup.sh` 已提供 PostgreSQL + uploads 打包、rclone crypt 上传、30 天清理和 Healthchecks ping 逻辑；真实对象存储恢复演练最终上线时执行。

## 约定

- 全站文案使用中文；本项目永远只有一个用户，不做注册 / 多租户。
- 主题 token 已接入，后续组件不得散写 hex；颜色、圆角和模块色应来自 `src/app/globals.css` 与 `src/lib/design.ts`。
- 每个 Stage 完成后必须更新 `docs/PROGRESS.md` 和本 README，并逐条对照 `docs/PLAN.md` 的验收标准。
