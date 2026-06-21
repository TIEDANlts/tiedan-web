# tiedan-web E2E 真实浏览器测试报告

执行日期：2026-06-21  
执行环境：Playwright 1.60.0 + Chromium，桌面 `1440x960` 与移动 Pixel 5 视口；本地 Next dev server 通过 `npm run dev:local` 启动，PostgreSQL 由 WSL `Ubuntu-24.04` Docker 提供。

## 摘要

最终复跑命令：`npm.cmd run e2e -- --reporter=line`

结果：39 条测试，7 通过，32 失败，0 受阻。失败项按“只测不修”原则保留为发现；没有修改 `src/**`、Prisma schema、迁移、既有单测、`package.json` 或 lockfile。

环境核对：

- Postgres：`docker-compose.dev.yml` 中 `personal_site_postgres` 已运行。
- Prisma：`prisma migrate/generate` 由 `npm run dev:local` 启动链路执行；CP1 单独跑通过。
- Seed：`npm run db:seed` 完成管理员与默认消费分类初始化；E2E 场景额外用数据库夹具创建内容并清理。
- 浏览器：`npx.cmd playwright install chromium` 已完成。
- 登录态：`e2e/auth.setup.ts` 生成 `e2e/.auth/admin.json`，桌面/移动复用。
- 健康检查：`/api/health` 冒烟通过。

## 覆盖矩阵

| 功能 | Happy path | Edge/降级 | 显示健康 | 结论 |
| --- | --- | --- | --- | --- |
| 登录/门禁 | 正确凭据登录通过 | 错误凭据留在登录页、未登录跳登录通过 | 登录页桌面/移动截图 | 通过，错误登录会产生 Auth.js 预期服务端日志 |
| 博客列表/分页 | `/blog`、`/blog/page/2` 渲染通过 | RSS 200 且含文章 | 列表/分页/详情截图 | 失败：详情 beacon 未捕获 |
| 博客详情 Markdown | 标题和 `pre code` 可见 | `/api/posts/view` 10 秒未响应 | 详情截图 | 失败：浏览计数 beacon |
| 公开导航 | seeded 链接显示 | favicon/破图检查执行 | `/nav` 截图 | 通过 |
| Dashboard | 聚合页可访问 | Steam 破图被捕获 | `/` 截图 | 失败：Steam CDN 破图 |
| Todos | 新建和完成执行 | 删除确认缺失、拖拽控件缺失 | `/todos` 截图 | 失败 |
| Links/admin links | 访问管理页 | 新增弹窗未打开 | 管理页和公开页截图 | 失败 |
| Posts/admin posts | 新建页访问并尝试发布 | 发布流程红测 | 新建页/博客截图 | 失败 |
| Expenses 手动记账 | 访问流水页 | 记一笔弹窗在本轮失败 | 流水/统计截图 | 失败 |
| Expenses 导入 | 上传 CSV 后点解析 | 未进入“确认平台” | 导入/历史截图 | 失败 |
| Expense categories | 访问分类管理 | 新增弹窗未打开 | 分类页截图 | 失败 |
| Media 库/详情 | seeded 书影显示 | 封面上传后未回填 | 媒体列表/详情截图 | 失败 |
| Media 导入 | 上传 CSV 后点解析 | 未进入“确认列映射” | 导入页截图 | 失败 |
| Games/Steam | seeded 游戏库显示 | Steam 空 key 降级执行；新增弹窗失败 | 游戏页截图 | 失败：Steam 破图/弹窗 |
| Trips 详情/地点/照片 | seeded 行程详情显示 | Nominatim API 已 route mock | 详情截图 | 失败：地图动态组件加载中 |
| Trips footprint | 足迹页显示统计 | 瓦片不做像素断言 | 足迹截图 | 失败：地图动态组件加载中 |
| Calendar | 页面标题显示 | 聚合事件未显示 | 日历截图 | 失败：FullCalendar 加载中 |
| Special days | seeded 纪念日入库 | 日历聚合验证失败 | 日历截图 | 失败：受日历加载影响 |
| Settings/admin export | 保存表单执行 | export API 在测试中配置覆盖 | 设置截图 | 失败：保存后首页未显示更新值 |
| 全量显示/主题 | 24 个页面逐页访问 | 明暗主题截图 | desktop/mobile 各目录 | 失败：Steam 破图、动态组件加载态 |

## 逐功能结果

### 公开区

- 登录/门禁：通过。错误密码不进入私有区；匿名访问 `/todos` 跳登录；正确凭据从 `/login?from=/todos` 回到 `/todos`。
- 博客/RSS：部分通过。列表、分页、详情 Markdown 与代码块、RSS 均可见；失败点是详情页未观察到 `/api/posts/view` 200 响应。
- 公开导航：通过。seeded 链接在 `/nav` 可见。

证据：

- `test-results/public-auth-公开区：登录门禁、博客、分页、详情、RSS、导航-chromium-desktop/error-context.md`
- `test-results/public-auth-公开区：登录门禁、博客、分页、详情、RSS、导航-chromium-mobile/error-context.md`
- `test-results/e2e-screenshots/chromium-desktop/public-blog-detail.png`
- `test-results/e2e-screenshots/chromium-mobile/public-blog-detail.png`

### 私有 CRUD

- Dashboard：页面可访问，但 Steam CDN 封面破图使健康检查失败。
- Todos：新建和完成可执行；删除按钮点击后未出现确认对话框；页面没有 `拖拽排序` 控件，无法验证 `@dnd-kit` 重排持久化。
- Links：`/admin/links` 可访问；“新增链接”未打开弹窗。
- Posts：`/admin/posts/new` 可访问；发布流程在最终套件中失败，详见对应 `error-context.md`。
- Expenses：流水页可访问；“记一笔”弹窗/字段交互在桌面和移动均失败；统计页截图已覆盖。
- Expense categories：管理页可访问；“新增分类”未打开弹窗。
- Calendar/settings/export：日历标题可见但事件未显示；settings 保存提示出现，随后首页未显示新 profile name；export API 场景未形成通过结论。

证据目录：

- `test-results/private-crud-私有：todos-新建、完成、删除、拖拽控件检查-chromium-desktop/`
- `test-results/private-crud-私有：links-后台新增并同步公开导航-chromium-desktop/`
- `test-results/private-crud-私有：expenses-手动记账、过滤、统计-chromium-mobile/`
- `test-results/private-crud-私有：calendar、settings-与-admin-export-chromium-mobile/`

### 导入、上传、外部依赖、地图

- 消费导入：失败。CSV 文件已设置到 input，点击“解析文件”后 20 秒内仍停留在“上传账单”，未进入“确认平台”。
- 书影导入：失败。CSV 文件已设置到 input，点击“解析文件”后 20 秒内仍停留在“上传文件”，未进入“确认列映射”。
- 书影封面上传：失败。文件 input 已设置，封面 URL textbox 15 秒内仍为空。
- Games/Steam：失败。seeded 游戏库可显示；“添加游戏”未打开弹窗；Steam CDN 图片大量破图。若本机存在 `STEAM_API_KEY/STEAM_ID`，测试不真实请求上游。
- Trips/地图：失败。`/api/trips/nominatim` 已拦截返回固定“Mock 西湖”，但 TripMap 和 FootprintMap 均停留在“地图加载中...”。
- Calendar：失败。页面停留在“日历加载中...”，`.fc` 未出现，聚合事件不可见。

## 缺陷发现

| ID | 严重度 | 发现 | 复现步骤 | 证据 | 修复建议 |
| --- | --- | --- | --- | --- | --- |
| E2E-001 | Medium | Steam CDN 封面大量破图，dashboard/games/display health 红 | 登录后访问 `/games` 或 `/` | `display-health-*` error-context；`display-games.png` | 对 Steam 热链加占位/失败 fallback，或服务端缓存可用封面 |
| E2E-002 | Medium | 博客详情未捕获 `/api/posts/view` 200 beacon | 访问 seeded `/blog/[slug]` 等 10 秒 | `public-auth-*` error-context | 检查客户端上报触发条件、认证态/去抖逻辑和 sendBeacon/fetch fallback |
| E2E-003 | High | 消费导入上传后不进入确认平台 | `/expenses/import` 上传 CSV 后点“解析文件” | `failure-expense-import.png` | 检查 import wizard 的 file ref、client action 触发、Server Action 返回和错误展示 |
| E2E-004 | High | 书影导入上传后不进入列映射 | `/media/import` 上传 CSV 后点“解析文件” | `failure-media-import.png` | 同上，补 UI 错误消息和解析失败可见状态 |
| E2E-005 | High | 封面上传后 URL 字段不回填 | `/media/[id]` 上传 PNG | `failure-media-cover-upload.png` | 检查 `CoverUploadInput` change handler、`/api/upload` 响应、客户端错误提示 |
| E2E-006 | High | 多个新增/编辑弹窗不打开 | `/admin/links`、`/games`、`/admin/expense-categories` 点新增 | 对应 `private-crud-*` 和 `imports-*` error-context | 检查 Dialog trigger 状态、移动/桌面事件处理、可能的 client bundle/hydration 异常 |
| E2E-007 | Medium | Todos 删除确认不出现，且无拖拽排序控件 | `/todos` 新建后点删除；查找拖拽控件 | `failure-todos-delete-dialog.png` | 检查 ConfirmDialog trigger；若需求仍包含拖拽，补 dnd-kit 控件与持久化 |
| E2E-008 | High | Leaflet TripMap/FootprintMap 一直加载中 | `/trips/[id]`、`/trips/footprint` | `failure-trip-location-photo-map.png`、`failure-trip-footprint.png` | 检查动态 import、Leaflet CSS/依赖和客户端运行错误 |
| E2E-009 | High | FullCalendar 一直加载中，聚合事件不可见 | `/calendar` | `failure-calendar-aggregation.png`、`private-calendar.png` | 检查动态 import、FullCalendar bundle、`/api/calendar/events` 调用与错误展示 |
| E2E-010 | Medium | Settings 保存后首页未显示新 profile name | `/admin/settings` 保存后回 `/` | `private-calendar-settings-export-*` | 检查 settings action、dashboard/profile 查询和 revalidate |
| E2E-011 | Low | Next dev server HMR cross-origin warning | Playwright 以 `127.0.0.1` 访问 dev server | 命令输出 | 可在开发配置允许 `127.0.0.1`，或忽略为 dev-only warning |

## 外部依赖处理

| 外部触点 | 分类 | 本轮处理 | 结论 |
| --- | --- | --- | --- |
| `/api/trips/nominatim` | 浏览器请求本应用 API | `page.route("**/api/trips/nominatim?**")` 固定 mock | 已避免真实 Nominatim 请求 |
| Nominatim 上游 | 服务端请求 | 不真实请求；只通过 API mock 测 UI | 成功路径需集成环境验证 |
| Steam Web API | 服务端请求 | 空 key 测降级；如有真实 key 不自动同步 | 不打真实上游 |
| Steam CDN 封面 | 浏览器图片热链 | 未拦截，真实检测破图 | 发现 E2E-001 |
| TMDB/NeoDB | 服务端请求 | 不联网；通过 seeded media 测显示 | 成功路径需集成环境/手工验证 |
| `/api/upload` | 浏览器请求本应用 API | 真实本地上传 tiny PNG | 发现 E2E-005 |
| `/api/calendar/events` | 浏览器请求本应用 API | 使用 seed 数据真实请求 | FullCalendar 未加载，聚合不可见 |
| 地图瓦片 | 浏览器请求 | 不做瓦片像素断言，诊断忽略瓦片失败 | 地图容器本身未渲染 |

## 截图索引

最终完整套件同一次运行生成 92 张 PNG：

- 桌面截图目录：`test-results/e2e-screenshots/chromium-desktop/`
- 移动截图目录：`test-results/e2e-screenshots/chromium-mobile/`

关键截图：

- `test-results/e2e-screenshots/chromium-desktop/display-games.png`
- `test-results/e2e-screenshots/chromium-mobile/display-games.png`
- `test-results/e2e-screenshots/chromium-desktop/failure-expense-import.png`
- `test-results/e2e-screenshots/chromium-mobile/failure-expense-import.png`
- `test-results/e2e-screenshots/chromium-desktop/failure-media-import.png`
- `test-results/e2e-screenshots/chromium-mobile/failure-media-import.png`
- `test-results/e2e-screenshots/chromium-desktop/failure-trip-footprint.png`
- `test-results/e2e-screenshots/chromium-mobile/failure-trip-footprint.png`
- `test-results/e2e-screenshots/chromium-desktop/private-calendar.png`
- `test-results/e2e-screenshots/chromium-mobile/private-calendar.png`
- `test-results/e2e-screenshots/chromium-desktop/public-blog-detail.png`
- `test-results/e2e-screenshots/chromium-mobile/public-blog-detail.png`

Playwright 错误上下文：`test-results/**/error-context.md`，最终共 32 个。

## 复跑步骤

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose -f docker-compose.dev.yml up -d"
npx.cmd prisma generate
npx.cmd playwright install chromium
npm.cmd run e2e -- --reporter=line
```

也可以分项目运行：

```powershell
npm.cmd run e2e -- --project=chromium-desktop --reporter=line
npm.cmd run e2e -- --project=chromium-mobile --reporter=line
```

注意：单独分项目运行会清理 `test-results`，若要同时保留桌面和移动截图，应使用完整命令一次跑完。

## 完成核对清单

- [x] 环境跑通：Postgres、迁移/generate/seed、Chromium、webServer、登录态、`/api/health` 均已验证。
- [x] 功能清单每项都有 Playwright 场景并已执行；覆盖矩阵无空格。
- [x] `(public)`/`(private)` 页面均被访问，并生成桌面与移动截图。
- [x] 每条场景有确定结论；失败项有严重度、复现和建议。
- [x] 外部触点已分类并说明处理方式。
- [x] 报告包含摘要、覆盖矩阵、逐功能结果、显示异常、bug、截图索引、复跑步骤和结果位置。
- [x] 未修改应用代码；`git diff --stat` 仅显示 `playwright.config.ts` 的已跟踪修改，`git status --short` 中新增文件仅为 `docs/E2E_PROGRESS.md`、`docs/E2E_REPORT.md`、`e2e/**` 及既有无关未跟踪 `docs/superpowers/`。
