# 项目进度

## 当前状态
- 进行中：（无）
- 已完成：Stage 0、Stage 1、Stage 2、Stage 3、Stage 4、Stage 5、Stage 6A（本地生产化准备）、Stage 7、Stage 8、Stage 9、Stage 10、Stage 11、Stage 12、Stage 13、Stage 14、Stage 15、Stage 16
- 线上版本：（未上线）

---

## 修复日志

### 2026-06-16 · 本地启动与主题告警修复
- 完成内容：`npm.cmd run dev:local` 现在会先确认 WSL Docker 里的 PostgreSQL 容器已就绪，再自动判断 `127.0.0.1:5432` 是否稳定；如果 Windows 侧端口转发不稳，会回退到 WSL 的实际 IP，并把同一个可达地址注入给 Prisma、seed 和 Next dev server。另将 `next-themes` 替换为本地主题 Provider，避免 React 19 / Next 16 下渲染 `<script>` 的控制台告警。
- 关键文件：`scripts/dev-local.ps1`、`scripts/dev-local.test.ts`、`src/components/theme-provider.tsx`、`src/components/app-shell.tsx`、`src/components/ui/sonner.tsx`、`src/components/theme-provider.test.ts`、`README.md`。
- 关键决定与偏离：不再持有 Windows 侧 `wsl.exe` 后台进程句柄，改为在 WSL 内部维持 keep-alive；主题切换继续保留 `light` / `dark` / `system` 语义，但由本地 context 接管，避免第三方注入脚本。
- 遗留 TODO：如果以后还想进一步减轻本地启动步骤，可以再把 `.env` 存在性、`node_modules` 和 WSL Docker 状态单独拆成只读预检脚本。
- 验证：`npx.cmd vitest run scripts/dev-local.test.ts src/components/theme-provider.test.ts` 通过；PowerShell Parser 解析 `scripts/dev-local.ps1` 通过；`npm.cmd run check` 通过（43 个测试文件、225 条通过）。

### 2026-06-16 · 本地一键启动脚本
- 完成内容：新增 `npm.cmd run dev:local`，一条命令串起 WSL Docker PostgreSQL、`127.0.0.1:5432` 端口等待、Prisma migrate/generate、数据库 seed 和 Next dev server。
- 关键文件：`scripts/dev-local.ps1`、`scripts/dev-local.test.ts`、`package.json`、`README.md`。
- 关键决定与偏离：脚本不自动安装依赖，也不改 `.env`；端口等待和脚本进程内的 `DATABASE_URL` 都优先使用 `127.0.0.1`，避免 Windows `localhost` 的 IPv6 抖动。
- 遗留 TODO：如果后面还想继续简化，可以再加一个只读环境检查脚本，专门提示 `.env`、`node_modules`、WSL Docker 状态。
- 验证：`npx.cmd vitest run scripts/dev-local.test.ts` 通过；`npm.cmd run check` 通过（42 个测试文件、223 条通过）。

### 2026-06-15 · 安全与导入补丁应用
- 完成内容：应用 `tiedan-web-fixes.patch`，补强 Cron / 快捷记账 Bearer Token 常量时间比较、登录跳转 `from` 参数清洗、出站 HTTP SSRF 防护（URL 字面量与 DNS 解析阶段双校验）、账单 CSV 空表头列对齐、博客浏览去重 Map 过期清理，并补充对应单测；按要求删除补丁文件。
- 关键文件：`src/lib/secure-compare.ts`、`src/lib/ssrf.ts`、`src/lib/http.ts`、`src/lib/auth/routes.ts`、`src/modules/expenses/parsers/common.ts`、`src/modules/posts/view.ts`、`src/app/api/cron/steam-sync/route.ts`、`src/app/api/quick/expense/route.ts`。
- 关键决定与偏离：未新增第三方依赖；新增 `SSRF_ALLOW_PRIVATE` 逃生开关仅用于确需访问内网资源的本地/受控场景，默认拒绝 localhost、内网、链路本地和保留地址。
- 遗留 TODO：如未来确需通过 `OUTBOUND_PROXY` 访问可信内网资源，需要显式配置 `SSRF_ALLOW_PRIVATE` 并在部署文档中说明风险边界。
- 验证：`npx.cmd vitest run src/lib/secure-compare.test.ts src/lib/ssrf.test.ts src/lib/http.test.ts src/lib/auth/routes.test.ts src/modules/expenses/import.test.ts src/modules/posts/posts.test.ts` 通过；`npm.cmd run check` 通过。

### 2026-06-15 · 博客分页与首页统计修复
- 完成内容：修复公开博客分页非法参数会把 `NaN` 传入 Prisma 的问题，非法 `/blog/page/*` 现在会进入 404；修复首页今日待办查询与 `Todo.date @db.Date` 写入哨兵值不一致导致今天待办被漏掉的问题；首页“今年通关”改为按 Activity 中 `games/finished` 的发生时间统计，避免后续编辑游戏资料污染年度通关数。
- 关键文件：`src/app/(public)/blog/page/[page]/page.tsx`、`src/modules/posts/utils.ts`、`src/modules/posts/queries.ts`、`src/modules/dashboard/queries.ts`、`src/modules/posts/posts.test.ts`、`src/modules/dashboard/queries.test.ts`。
- 关键决定与偏离：未新增 `Game.finishedAt` 字段和迁移，改用 Stage 16 已接入的 `Activity` 作为通关发生时间来源；这样不需要对历史游戏数据做不准确回填，也符合活动流记录关键动作的既有机制。
- 遗留 TODO：历史上在 Activity 接入前已经处于 `FINISHED` 的游戏不会被计入首页“今年通关”，如需保留旧数据口径，可后续补一次人工确认后的历史活动回填脚本。
- 验证：`npx.cmd vitest run src/modules/posts/posts.test.ts src/modules/dashboard/queries.test.ts` 通过；`npx.cmd vitest run src/lib/activity.test.ts src/lib/activity-actions.test.ts src/modules/games/games.test.ts src/modules/todos/todos.test.ts src/modules/posts/posts.test.ts src/modules/dashboard/queries.test.ts` 通过；`npm.cmd run check` 通过。

### 2026-06-15 · Server Action 初始状态导出修复
- 完成内容：修复费用页和设置页在 Next.js 16.2.9 / Turbopack 下因 `"use server"` 文件导出普通对象导致的运行时报错，并避免客户端 `useState` 在 render 阶段误触发 Server Action 引用。
- 关键文件：`src/modules/expenses/action-state.ts`、`src/modules/settings/action-state.ts`、`src/modules/expenses/actions.ts`、`src/modules/settings/actions.ts`、`src/app/(private)/expenses/expenses-ledger.tsx`、`src/app/(private)/admin/expense-categories/expense-categories-admin.tsx`、`src/app/(private)/admin/settings/settings-form.tsx`、`src/lib/server-action-exports.test.ts`。
- 验证：`npx.cmd vitest run src/lib/server-action-exports.test.ts` 通过；`npx.cmd vitest run src/modules/expenses/expenses.test.ts src/modules/settings/settings.test.ts src/lib/server-action-exports.test.ts` 通过；`npx.cmd tsc --noEmit` 通过；`npm.cmd run check` 通过。

---

## Stage 日志（倒序追加）

### Stage 16 · 首页聚合与活动时间线（收官） —— 2026-06-15 完成
- 完成内容：新增 `Activity` 数据模型、迁移和 `src/lib/activity.ts`，在游戏通关、书影读完/看完、文章首次发布、旅行完成和账单导入完成时记录活动；匿名 `/` 改为编辑部公开首页，读取 `profile.name`、`profile.bio`、`profile.avatar` 并展示最新 3 篇文章；登录后 `/` 改为收藏册仪表盘，包含今日待办、本月消费、最近在玩、在读在看、下一段旅行、未来 14 天重要日子、今年数字和活动时间线；`/admin/settings` 支持编辑首页资料、上传 public 头像和导出全站数据；新增 PWA manifest/icons、apple-touch-icon、全站 404/error 页和统一 title 模板；删除 `/admin/playground`。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260615120240_add_activity/migration.sql` 定义活动流；`src/lib/activity.ts`、`src/lib/export-zip.ts`、`src/modules/dashboard/queries.ts` 分别封装活动记录/时间线、JSON zip 和仪表盘聚合查询；`src/app/page.tsx`、`src/app/dashboard-widgets.tsx`、`src/app/(private)/admin/settings/*` 实现首页、仪表盘与设置页；`src/app/api/admin/export/route.ts` 实现私有数据导出；`public/manifest.webmanifest`、`public/icons/*`、`public/apple-touch-icon.png` 接入 PWA 图标。
- 关键决定与偏离：未新增第三方依赖，导出 zip 使用内部无压缩 ZIP writer；创建游戏/书影/旅行时若初始状态已经是目标状态不记录活动，仅记录已有条目从其他状态变为目标状态；文章发布活动按文章 id 去重并在时间线解析到当前 slug，撤回后改 slug 再发布不会重复记录；账单导入仅在实际新增 `inserted > 0` 时记录，避免“导入了 0 笔账单”；PWA 不实现 Service Worker，仅提供 manifest、图标与 theme-color。
- Stage 16 验收：通过 - 匿名 `/` 与登录 `/` 走不同外壳和内容；通过 - 仪表盘小部件为独立 Server Component，今日待办可直接勾选并 revalidate `/`；通过 - 目标动作接入活动记录且重复保存目标状态不重复记录；通过 - 设置页可保存首页资料，头像走 public 上传接口；通过 - `/api/admin/export` 私有导出 JSON zip，manifest 记录各表条数且图片不打包；通过 - PWA manifest、192/512 图标和 apple-touch-icon 已生成；通过 - 全站 404/error 页和 title 模板已接入；通过 - `/admin/playground` 路由已删除；待人工验收 - 375px 真实浏览器下仪表盘单列顺序、头像上传体验、手机添加到主屏幕、导出 zip 手动解压阅读和时间线跳转需用户登录后点验。
- 遗留 TODO：真实上线前仍需完成生产域名、HTTPS、对象存储加密备份和恢复演练；如未来需要把待办完成或重要日子创建也纳入活动流，可继续调用 `recordActivity()` 扩展。
- 验证：`npm.cmd run check` ✅（36 个测试文件、150 条通过）；`npm.cmd run e2e` ✅（3 条通过，Playwright 现在会自动启动 `127.0.0.1:3000` dev server；验证过程中曾因未启动站点和 `localhost` 解析到 IPv6 `::1` 失败，已改为稳定的 webServer 配置后重跑通过）；`wsl.exe -d Ubuntu-24.04 -u root -- sh -lc "... docker compose -f docker-compose.dev.yml up -d"` ✅；`npx.cmd prisma migrate dev --name add_activity` ✅；`npx.cmd prisma generate` ✅；`npx.cmd vitest run src/lib/activity-actions.test.ts src/lib/activity.test.ts` ✅（2 个测试文件、11 条通过）；`npx.cmd vitest run src/lib/activity.test.ts src/lib/export-zip.test.ts src/modules/settings/settings.test.ts` ✅（3 个测试文件、6 条通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npx.cmd vitest run` ✅（36 个测试文件、150 条通过）。

### Stage 15 · 全局日历 —— 2026-06-15 完成
- 完成内容：新增 `SpecialDay` 数据模型与迁移 SQL；新增 `src/lib/calendar.ts` 统一 `CalendarEvent` 类型和跨模块聚合；待办、旅行、重要日子、书影模块分别实现 `getEvents(start, end)`；新增 `/api/calendar/events` 私密事件接口；替换 `/calendar` 占位页为 FullCalendar 日历，中文 locale、周一开头、桌面月视图、小屏列表视图、模块图例显隐、事件跳转和点击空白日期快捷新建待办 / 重要日子。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260615085002_add_special_days/migration.sql` 定义重要日子表；`src/lib/calendar.ts` 与 `src/modules/*/events.ts` 负责事件聚合；`src/modules/special-days/actions.ts`、`src/modules/special-days/special-day-quick-form.tsx` 提供日历内重要日子创建；`src/app/api/calendar/events/route.ts` 提供登录态事件 API；`src/app/(private)/calendar/*` 实现动态导入和日历交互；`src/app/globals.css` 增加 FullCalendar 局部主题样式。
- 关键决定与偏离：新增并锁定 `@fullcalendar/core@6.1.20`、`@fullcalendar/react@6.1.20`、`@fullcalendar/daygrid@6.1.20`、`@fullcalendar/list@6.1.20`、`@fullcalendar/interaction@6.1.20`；重要日子本轮只支持在 `/calendar` 内新建，不新增独立管理页；书影事件标题按本轮 prompt 使用「《xxx》上映」，未区分图书出版日文案；点击空白日期通过 Dialog 内分段按钮在“新建待办 / 新建重要日子”之间切换。
- Stage 15 验收：通过 - 四类事件均接入聚合接口，配色来自 `src/lib/design.ts` 模块色，图例可单独隐藏并写入 localStorage；通过 - 旅行事件使用 FullCalendar 排他 end，跨月行程单测覆盖；通过 - 每年重复的重要日子按查询年份展开，跨年区间、2/29 平年顺延、闰年正常出现和一次性事件不重复均有单测覆盖；通过 - 点击事件使用 `href` 跳转，点击空白日期可快捷添加待办或重要日子；通过 - 小屏初始视图为 `listWeek`，月视图 `dayMaxEvents=3` 且 `moreLinkContent` 显示 `+n`；待人工验收 - 375px 真实浏览器下列表默认视图、月视图 `+n` 折叠、快捷新建提交后的体验和事件跳转需要用户登录后点验。
- 遗留 TODO：后续如需要管理重要日子的编辑 / 删除，可在 `/calendar` 或设置页补独立管理入口；Stage 16 活动流接入时，本轮新增重要日子和待办快捷创建可按需求补 `recordActivity()`。
- 验证：`wsl.exe -d Ubuntu-24.04 -u root -- sh -lc "... docker compose -f docker-compose.dev.yml up -d"` ✅；`npx.cmd prisma migrate dev --name add_special_days` ✅（同时应用了本地未应用的 Stage 14 迁移）；`npx.cmd prisma generate` ✅；`npx.cmd vitest run src/modules/special-days/special-days.test.ts src/modules/todos/events.test.ts src/modules/trips/events.test.ts src/modules/media/events.test.ts src/lib/calendar.test.ts` ✅（5 个测试文件、8 条通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npm.cmd run check` ✅（32 个测试文件、136 条通过）；`npm.cmd run dev` ✅（Next dev server Ready）；浏览器点验因当前 Codex Browser 企业网络策略阻止访问 `localhost:3000` 未完成，需用户在本机浏览器登录后复核。

### Stage 14 · 旅行模块 —— 2026-06-15 完成
- 完成内容：新增 `Trip` / `TripDay` 数据模型与迁移 SQL；实现私密文件读取 `/api/files/private/**`，登录校验后从 private 上传区流式返回文件并防路径穿越；新增 `src/lib/map.ts`，配置天地图 `vec_w` + `cva_w` 双瓦片层，缺少 `TIANDITU_KEY` 时回退 OSM；新增 `src/lib/geo.ts` 的 GCJ-02 → WGS-84 近似转换；实现 `/trips` 旅行收藏册、`/trips/[id]` 行程详情编辑、Nominatim 服务端代理搜索、private 照片九宫格和 `/trips/footprint` 足迹地图。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260615160800_add_trips/migration.sql` 定义旅行表；`src/lib/storage.ts`、`src/app/api/files/private/[...path]/route.ts` 管理 private 文件读取；`src/lib/map.ts`、`src/lib/geo.ts` 管理地图瓦片与坐标转换；`src/modules/trips/*` 封装旅行查询、Server Actions、Nominatim 限频搜索与纯逻辑；`src/app/(private)/trips/*` 实现列表、详情、动态 Leaflet 地图和足迹页。
- 关键决定与偏离：新增并锁定 `leaflet@1.9.4`、`react-leaflet@5.0.0`、`@types/leaflet@1.9.21`；天地图官方站点在当前网络环境下不可达，已按天地图常用 DataServer 模板实现 `https://t{s}.tianditu.gov.cn/DataServer?T=vec_w|cva_w&x={x}&y={y}&l={z}&tk=...`，子域为 `0-7`，后续上线前建议用真实 key 在浏览器网络面板复核；因 Windows 侧无法连通 WSL Docker PostgreSQL，本地未能执行 `prisma migrate dev` 应用迁移，迁移 SQL 已手写并提交。
- Stage 14 验收：通过 - 新建行程 action 会按起止日期生成 `TripDay`，日期展开和天数计算有单测覆盖；通过 - 地点可搜索或手动添加，勾选国内地图坐标时通过 GCJ-02 → WGS-84 转换后入库；通过 - private 上传 URL 已改为 `/api/files/private/**`，未登录读取返回 403，路径穿越由 `assertPrivateUploadPath` 阻止；通过 - 地图组件使用动态导入关闭 SSR，瓦片配置集中在 `src/lib/map.ts`；通过 - 足迹页聚合 DONE 行程地点并按地点名去重；待人工验收 - 真实 `TIANDITU_KEY` 下天地图中文瓦片加载、Nominatim 实网搜索、照片上传网络体积和 375px 移动端体验需要在本地浏览器点验；因环境阻塞未验证 - `prisma migrate status` / 实际数据库迁移应用。
- 遗留 TODO：Stage 16 接入活动流时，在 `updateTripOverviewAction` 中状态从非 `DONE` 变为 `DONE` 的 TODO 位置调用 `recordActivity()`；当前 `TripDay.locations` 仍按 PLAN 使用 JSON，后续若做城市维度高级统计可实体化 Location；修复本机 WSL Docker 端口转发后运行 `npx.cmd prisma migrate dev --name add_trips` 或 `npx.cmd prisma migrate deploy` 应用迁移并重跑手工验收。
- 验证：`npx.cmd vitest run src/lib/geo.test.ts src/lib/map.test.ts src/lib/storage.test.ts src/modules/trips/trips.test.ts src/modules/trips/nominatim.test.ts` ✅（5 个测试文件，21 条通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npm.cmd run check` ✅（27 个测试文件，128 条通过）；`npx.cmd prisma generate` ✅；`npx.cmd prisma migrate status` ❌（Schema engine error，Windows 侧 `localhost:5432` / `127.0.0.1:5432` TCP 不通，WSL Docker 端口转发阻塞）。

### Stage 13 · 消费报表 + 快捷记账入口 —— 2026-06-15 完成
- 完成内容：新增 `/expenses/stats` 私密消费报表页，支持月 / 周 / 年视图和 URL 周期参数；月视图展示本月支出、环比、收入、结余、分类占比、每日支出、Top 10 商户和分类明细；周视图展示本周 / 上周按日对比，并按最近 8 周计算星期几平均支出；年视图展示 12 个月支出趋势、收入虚线、年度分类占比和年度总览；新增 `POST /api/quick/expense` 快捷记账接口，使用 `QUICK_ADD_TOKEN` Bearer Token、内存级每分钟 10 次限频、末尾金额解析和自动分类写入 `platform=quick` 流水。
- 关键文件：`src/modules/expenses/stats.ts` 封装周期解析、Decimal 汇总和服务端统计查询；`src/components/expense-chart.tsx` 与 `src/app/(private)/expenses/stats/expense-stats-charts.tsx` 封装 ECharts 客户端图表；`src/app/(private)/expenses/stats/page.tsx` 实现报表页面；`src/modules/expenses/quick.ts` 与 `src/app/api/quick/expense/route.ts` 实现快捷记账解析、限频和 API；`docs/QUICK_ADD.md` 记录 iOS、安卓与 curl 配置。
- 关键决定与偏离：新增并锁定 `echarts@6.1.0` 与 `echarts-for-react@3.0.6`；未修改 Prisma schema、未运行迁移；图表点击跳转复用 `/expenses`，并扩展流水页支持 `date=YYYY-MM-DD` 参数；分类读取抽为 `src/modules/expenses/category-options.ts`，供手动记账、导入和快捷 API 共用；周均分布按确认口径统计当前周及之前 7 周。
- Stage 13 验收：通过 - 统计纯逻辑单测覆盖周期参数回退、Decimal 收支汇总、排除 `NEUTRAL`、上月无数据环比显示 `--`、年度 12 个月补零和最近 8 周星期平均；通过 - 快捷文本解析和内存限频单测覆盖正常文本、无金额、负数、超过两位小数和第 11 次限流；通过 - `/api/quick/**` 仍在中间件白名单；待人工验收 - 真实账单数据下月报表金额、分类占比、Top 商户和日柱状图需要用户对照流水页核对；待人工验收 - 375px 真机图表适配与快捷指令真机写入需要用户测试。
- 遗留 TODO：最终上线时在生产环境配置真实 `QUICK_ADD_TOKEN`，并用 `docs/QUICK_ADD.md` 的 iOS / 安卓步骤做一次真机验收；如果未来部署多实例或遭遇扫接口，再把内存限频替换为 Redis 限频。
- 验证：`npx.cmd vitest run src/modules/expenses/stats.test.ts src/modules/expenses/quick.test.ts src/modules/expenses/expenses.test.ts src/modules/expenses/import.test.ts` ✅（4 个测试文件、21 条通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npm.cmd run check` ✅（23 个测试文件、112 条测试通过）。

### Stage 12 · 微信 / 支付宝账单导入 —— 2026-06-15 完成
- 完成内容：新增微信 / 支付宝 CSV 账单解析器，支持 UTF-8 与 GBK 自动解码、按“交易时间”定位表头、跳过头尾说明/汇总行、金额正数字符串归一化、方向映射、状态过滤、txnNo 提取和坏行错误收集；新增 `/expenses/import` 上传 → 确认平台 → 预览 → 确认导入流程，预览展示解析成功、将导入、重复跳过、状态过滤和解析失败统计；确认导入在单事务内创建 `ImportBatch` 并逐行写入 `Transaction`，依赖 `[platform, txnNo]` 唯一约束兜底去重；新增 `/expenses/import/history` 和导入结果页；新增自动分类函数并接入导入与手动记账，流水页行内改分类可确认沉淀商户关键词。
- 关键文件：`src/modules/expenses/parsers/*` 实现支付宝 / 微信解析和平台识别；`src/modules/expenses/categorize.ts` 与 `src/modules/expenses/import-executor.ts` 封装分类和预览/入库转换；`src/modules/expenses/actions.ts`、`src/modules/expenses/queries.ts` 接入 Server Actions、导入批次查询和规则沉淀；`src/app/(private)/expenses/import/*` 与 `src/app/(private)/expenses/expenses-ledger.tsx` 实现导入 UI、历史入口和流水页交互；`tests/fixtures/alipay-sample.csv`、`tests/fixtures/wechat-sample.csv` 与 `src/modules/expenses/import.test.ts` 覆盖账单格式边界。
- 关键决定与偏离：执行时仓库仍缺少用户提供的两份真实脱敏账单 fixtures，因此本轮创建了最小脱敏样本，其中支付宝样本以 GBK 写入、微信样本以 UTF-8 写入；没有新增依赖，复用 Stage 10 已锁定的 `xlsx@0.18.5` 与 `iconv-lite@0.7.2`；未修改 Prisma schema，沿用 Stage 11 的 `ImportBatch(total, inserted, skipped)` 和 `Transaction.importBatchId`；导入写入采用逐行 create 捕获唯一键冲突，以保留单事务和准确 skipped 计数。
- Stage 12 验收：通过 - fixtures 单测覆盖支付宝 GBK 解码、微信 UTF-8 解码、表头定位、微信 `¥` 剥离、方向映射、状态过滤、txnNo 提取、raw 保留和错误收集；通过 - 自动识别可区分支付宝 / 微信样本，未知文件返回手动选择；通过 - 自动分类按 sort 优先匹配 merchant + item，支付宝交易分类可兜底映射；通过 - 同一文件重复导入会按 txnNo 查重并依赖唯一约束兜底跳过；通过 - 不计收支行解析为 `NEUTRAL`，既有日小计逻辑继续排除收入与不计收支；通过 - 解析失败行进入预览错误列表，不影响其余行导入；待人工验收 - 真实完整微信、支付宝账单的金额 / 时间 / 方向抽查和重复导入全跳过需要用户用完整文件最终验证。
- 遗留 TODO：用用户真实完整账单替换或追加 fixtures 后重跑 `npx.cmd vitest run src/modules/expenses/import.test.ts`，并在浏览器里完成一次真实导入点验；若真实账单列名出现地区或版本差异，再按 fixtures 增补列名兼容；Stage 16 活动流接入时按 PLAN 记录“导入了 x 笔账单”。
- 验证：`npx.cmd vitest run src/modules/expenses/import.test.ts` 先红灯失败于缺少解析模块，完成实现后 ✅（8 条通过）；`npx.cmd vitest run src/modules/expenses/import.test.ts src/modules/expenses/expenses.test.ts` ✅（2 个测试文件、13 条通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npm.cmd run check` ✅（21 个测试文件、104 条测试通过）。

### Stage 11 · 记账基础 —— 2026-06-15 完成
- 完成内容：新增 `Transaction`、`ExpenseCategory`、`ImportBatch` 数据模型与迁移，消费分类增加 `direction` 区分支出/收入；`scripts/seed.ts` 幂等创建默认消费分类；新增 `/expenses` 私密流水页，支持月份切换、方向/分类/平台/关键词组合筛选、按日倒序分组、日支出小计、行内改分类和二次确认删除；新增移动端优先的“记一笔” Dialog 与底部悬浮入口；新增 `/admin/expense-categories` 分类 CRUD、TagInput 关键词编辑和拖拽排序。
- 关键文件：`prisma/schema.prisma` 与 `prisma/migrations/20260614175559_add_expenses/migration.sql` 定义消费数据底座；`src/lib/money.ts` 提供 Decimal 安全金额格式化与求和；`src/modules/expenses/*` 封装默认分类、筛选、日期、金额校验、查询与 Server Actions；`src/app/(private)/expenses/*` 和 `src/app/(private)/admin/expense-categories/*` 实现流水页与分类管理页。
- 关键决定与偏离：按本轮确认给 `ExpenseCategory` 增加 `direction` 字段，避免仅靠名称或排序区分收入/支出分类；Stage 11 不实现 Stage 12 的导入 UI，但已保留 `ImportBatch` 与 `Transaction.importBatchId` 关系；默认分类 seed 只创建缺失项，不覆盖用户后续编辑；本机 WSL 普通用户仍无 Docker socket 权限，本轮使用 WSL root 启动/保活 PostgreSQL，并在命令进程内把 `DATABASE_URL` 主机临时替换为 `127.0.0.1` 以避开 localhost IPv6/端口转发抖动。
- Stage 11 验收：通过 - `Transaction`/`ExpenseCategory`/`ImportBatch` 迁移已生成并应用，`prisma migrate status` 显示 7 个迁移且数据库最新；通过 - 默认分类 seed 已执行，含支出 10 类与收入 3 类；通过 - 金额工具和分组逻辑单测覆盖 `0.10 + 0.20 = 0.30`、月份边界、手动记账校验和日小计排除收入/不计收支；通过 - `/expenses` 与 `/admin/expense-categories` 已接入私密路由、Server Action session 校验、分类删除置空交易分类；待人工验收 - 375px 手机宽度下 5 秒记账、月份切换、组合筛选、行内改分类、删除确认、分类 CRUD 与排序需要用户在本地浏览器点验。
- 遗留 TODO：Stage 12 账单导入时复用 `ImportBatch`、`Transaction` 和 `ExpenseCategory.keywords`，并接入自动分类与规则沉淀；Stage 13 快捷记账 API 可复用 `normalizeManualTransactionInput` 与金额工具；内置浏览器访问 `127.0.0.1:3000` 被企业网络策略阻止，未能在 Codex 内完成浏览器点验。
- 验证：`npx.cmd prisma migrate dev --name add_expenses` ✅；`npx.cmd prisma generate` ✅；`npm.cmd run db:seed` ✅；`npx.cmd prisma migrate status` ✅；`npx.cmd vitest run src/lib/money.test.ts src/modules/expenses/expenses.test.ts scripts/seed.test.ts` ✅（3 个测试文件、11 条测试通过）；`npx.cmd tsc --noEmit` ✅；`npm.cmd run lint` ✅；`npm.cmd run check` ✅（20 个测试文件、93 条测试通过）。

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
