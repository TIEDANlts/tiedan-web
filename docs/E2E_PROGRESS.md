# E2E 执行进度

## 2026-06-21 · CP1 环境与冒烟

- 已测功能：PostgreSQL / Prisma / seed / Playwright Chromium / `/api/health` / 登录后访问 `/todos` / 匿名访问 `/blog`。
- 结果计数：通过 6（desktop smoke 3、mobile smoke 3）；失败 0；受阻 0。
- 环境结论：Windows 侧 `npm run dev` 无法访问 WSL Docker PostgreSQL，`/blog` 与登录会因 Prisma `ECONNREFUSED` 失败；改用项目既有 `npm run dev:local` 后通过。WSL 内 `prisma migrate status` 显示 14 个迁移且数据库最新，`npm run db:seed` 完成，管理员账号与默认消费分类就绪。
- 验证命令：`npx.cmd prisma generate`；`npx.cmd playwright install chromium`；`npx.cmd playwright test e2e/smoke.spec.ts --project=chromium-desktop --reporter=line`；`npx.cmd playwright test e2e/smoke.spec.ts --project=chromium-mobile --reporter=line`。
- 观察项：Next dev server 输出 `middleware` 约定弃用 warning，以及 `127.0.0.1` HMR cross-origin warning；记录为开发环境 warning，未改应用代码。
- 还差什么：CP2 需要从代码梳理完整功能清单、外部触点分类、场景计划、覆盖矩阵和报告骨架。

## 2026-06-21 · CP2 功能矩阵与用例骨架

- 已测功能：读取规格、现有 Playwright 配置、seed/env/docker、本地路由与外部触点；新增登录 storageState、WSL DB 夹具、动态 CSV/PNG 夹具、诊断截图 helper。
- 已实现用例：公开区、私有 CRUD、导入/上传/外部/地图、显示健康全量扫 4 组可复跑用例；桌面与移动 project 共享同一登录态。
- 结果计数：通过 1（`npx.cmd playwright test --list` 成功列出 setup + 桌面/移动共 15 条测试）；失败 0；受阻 0。
- 外部处理计划：`/api/trips/nominatim` 由 `page.route()` 拦截；Steam 若无 key 测空 key 降级，若本机存在真实 key 则标为受阻不请求上游；TMDB/NeoDB 成功路径用本地种子/手填覆盖，联网搜索只记录降级或待集成环境验证；地图瓦片不做像素断言。
- 还差什么：CP3-CP6 需要在真实 Chromium 中执行并记录每条场景的通过 / 失败 / 受阻结论。

## 2026-06-21 · CP3 公开区执行

- 已测功能：登录正确/错误凭据、未登录访问私有路由、博客列表、博客分页、博客详情 Markdown/代码块、`/api/posts/view` beacon、`/rss.xml`、公开 `/nav`。
- 结果计数：通过 7；失败 1；受阻 0。
- 失败摘要：博客详情页渲染正常，但 10 秒内未观察到 `/api/posts/view` 200 响应；桌面和移动均复现，证据在 `test-results/public-auth-公开区：登录门禁、博客、分页、详情、RSS、导航-*/error-context.md` 与对应截图。
- 还差什么：继续 CP4 私有 CRUD 与 CP5 外部/导入/地图。

## 2026-06-21 · CP4 私有 CRUD 执行

- 已测功能：dashboard、todos 新建/完成/删除/拖拽控件检查、links 后台新增、posts 发布、expenses 手动记账/过滤/统计、消费分类新增、calendar 聚合、settings 保存、admin export。
- 结果计数：通过 1（smoke 登录后访问待办）；失败 14；受阻 0。
- 失败摘要：多个私有页存在 Steam CDN 破图；todos 删除确认未弹出且无拖拽控件；links/games/expense categories 等新增弹窗未打开；posts 发布、expenses 弹窗、日历动态聚合、settings 保存后首页显示在本轮均失败或未完成。
- 还差什么：继续 CP5 导入/上传/外部/地图，CP6 汇总显示健康。

## 2026-06-21 · CP5 导入/上传/外部/地图执行

- 已测功能：消费导入、书影导入、书影封面上传、游戏库显示与 Steam 同步降级、旅行详情地图/地点 mock/照片、足迹地图、日历聚合。
- 结果计数：通过 0；失败 14；受阻 0。
- 失败摘要：消费/书影导入上传文件后没有进入下一步；封面上传后字段未回填；游戏新增弹窗未打开且 Steam CDN 图片破图；TripMap/FootprintMap 与 FullCalendar 动态组件停留在“加载中...”。
- 外部处理：`/api/trips/nominatim` 已用 `page.route()` 固定返回；Steam/TMDB/NeoDB 上游成功路径未真实请求，按空 key 降级/种子显示处理。
- 还差什么：CP6 全量显示健康与桌面/移动截图。

## 2026-06-21 · CP6 显示/健康全量扫

- 已测页面：`/`、`/login`、`/blog`、`/blog/page/2`、`/blog/[slug]`、`/nav`、`/todos`、`/admin/links`、`/admin/posts`、`/admin/posts/new`、`/expenses`、`/expenses/stats`、`/expenses/import`、`/expenses/import/history`、`/admin/expense-categories`、`/media`、`/media/[id]`、`/media/import`、`/games`、`/trips`、`/trips/[id]`、`/trips/footprint`、`/calendar`、`/admin/settings`。
- 结果计数：通过 0；失败 2（desktop/mobile 显示健康扫均红）；受阻 0。
- 截图：最终完整套件同一次运行生成 `test-results/e2e-screenshots/chromium-desktop/` 与 `test-results/e2e-screenshots/chromium-mobile/`，共 92 张 PNG。
- 失败摘要：Steam CDN 热链封面在 dashboard/games 等页面大量 `naturalWidth === 0`；地图和日历动态组件停留在加载态；Next dev server 输出 `middleware` 约定弃用和 HMR cross-origin warning（诊断中忽略 HMR 噪声，但在报告记录）。
- 还差什么：CP7 生成报告、覆盖矩阵与最终校验。

## 2026-06-21 · CP7 报告定稿

- 已测功能：完整 Playwright 套件在同一次运行中覆盖桌面与移动。
- 结果计数：最终命令 `npm.cmd run e2e -- --reporter=line`：39 条测试，7 通过，32 失败，0 受阻；失败均作为缺陷/显示问题记录。
- 产物：`docs/E2E_REPORT.md` 已生成；可复跑用例位于 `e2e/**`；最终证据位于 `test-results/`。
- 最终校验：`git diff --check` 通过（仅 LF/CRLF 提示）；`git diff --stat` 的已跟踪修改仅含 `playwright.config.ts`；`npm.cmd run check` 通过（tsc、eslint、Vitest 55 files / 333 tests）。
- 是否受阻：否。红测为真实测试结果，不阻塞报告产出；未改应用代码。
