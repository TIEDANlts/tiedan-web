# E2E 缺陷定性报告

> 本报告只做复现与定性，未执行任何修复。所有“建议修复”均等待审批后进入第二阶段。

## 摘要

- 基线：dev 与生产构建各跑一次，均为 39 条中 7 过、32 失败。
- 分类计数：应用 bug 2 项；测试用例问题 5 项；dev 环境专属 4 项；无法复现 0 项。
- 共因结论：已排除“全站 hydration/client bundle 崩溃”单一共因；失败拆分为 Steam 外链破图、测试断言/诊断误报、next dev 下动态/交互加载异常。
- 动态组件结论：地图与日历在 dev 卡 loading，在 `next build` + `next start` 下可渲染；日历 prod 后续失败来自测试 strict mode 断言。

## 共因分析

“客户端 JS 未 hydrate / client bundle 整体崩溃”假设已排除。

证据：

- prod 构建中 `/admin/links` 可打开新增弹窗、保存链接，并在 `/nav` 看到 `UI 分组` / `UI 链接`；失败只剩 `e2e/support/diagnostics.ts:31-35` 记录的 `_rsc=... net::ERR_ABORTED`。
- prod 构建中 `/trips/footprint` 出现 `.leaflet-container`、Leaflet 缩放控件与 marker；dev 同用例停留在“地图加载中...”。证据见 `test-results/triage-dev/imports-external-map-地图：旅行足迹-Leaflet-容器渲染-chromium-desktop/error-context.md` 与 `test-results/triage-prod-ok/imports-external-map-地图：旅行足迹-Leaflet-容器渲染-chromium-desktop/error-context.md`。
- prod 构建中 `/calendar` 出现 `.fc`，并同时渲染 seeded `纪念日` 与 `今日待办`；失败是 Playwright `.or()` strict mode 解析到 2 个元素。证据见 `test-results/triage-prod-ok/imports-external-map-日历：跨模块聚合事件显示-chromium-desktop/error-context.md`。
- `settings` Server Action 返回“首页资料已保存。”，`src/modules/settings/actions.ts:51-55` 已 `revalidatePath("/")`；失败原因是测试登录态访问 `/` 时命中 `src/app/page.tsx:123-156` 的 `PrivateDashboard`，而不是公开首页资料。
- 未发现能同时解释 Steam CDN `ERR_BLOCKED_BY_ORB`、sendBeacon 被观察漏掉、PNG 夹具处理失败、settings 首页期望不成立的同一个 hydration/client fatal error。

dev 专属共因范围：

- next dev 下部分 client 交互或动态组件没有在测试等待窗口内进入可用态：导入向导、部分弹窗、Leaflet、FullCalendar。该现象可以解释 E2E-003/004/006/008/009 的原始 dev 症状，但不能解释 prod 下的断言/诊断问题。
- E2E-011 的 HMR cross-origin warning 也是 dev-only 噪声；`e2e/support/diagnostics.ts:12-13` 已忽略 HMR pattern。

## 逐发现表

| ID | 报告原症状 | 复现结果(dev / prod) | 分类 | 根因(确认/推测)+证据 | 建议修复(层级+具体做法) | 影响面/风险 | 建议优先级 | ☐ 待你确认 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | Steam CDN 封面大量破图，dashboard/games/display health 红 | dev/prod 均复现；prod dashboard 仍有 `https://cdn.cloudflare.steamstatic.com/steam/apps/4042800/header.jpg` 破图与 `ERR_BLOCKED_BY_ORB` | 应用 bug | 确认。`test-results/triage-dev/display-health-显示健康全量扫：公开页、私有页、桌面-移动截图、错误与破图-chromium-desktop/error-context.md` 记录 236 个 Steam 破图；`test-results/triage-prod-ok/private-crud-私有：dashboard-聚合卡片显示-chromium-desktop/error-context.md` 记录 `GET ... header.jpg: net::ERR_BLOCKED_BY_ORB`；`src/app/dashboard-widgets.tsx:57-62` 的 `Cover` 直接 `<img>`，没有 `onError` fallback；`src/app/(private)/games/games-library.tsx:68-84` 的 `GameCover` 已有 fallback，说明同类页面有可复用模式 | 应用 UI/图片层：给 dashboard 与所有 Steam 热链展示点加 `onError` 占位；若要彻底避免 ORB，可在 Steam 同步或展示层引入服务端缓存/本地化策略。 | 影响 dashboard、games、display health；风险是 Steam 热链外部行为不稳定，修复应避免把外部图片失败放大成全页健康失败。 | P1 | ☐ 待你确认 |
| E2E-002 | 博客详情未捕获 `/api/posts/view` 200 beacon | dev 原测试等待 10 秒未捕获；手动探测确认实际发出 beacon 并收到 200；prod public-auth 失败另由 `_rsc` 取消请求诊断噪声造成 | 测试用例问题 | 确认。手动 browser probe 包装 `navigator.sendBeacon` 捕获 `calls: [{ url: "/api/posts/view", dataType: "Blob" }]`，Network 捕获 `POST http://127.0.0.1:3000/api/posts/view` status 200；代码 `src/app/(public)/blog/[slug]/view-beacon.tsx:9-12` 使用 fire-and-forget sendBeacon；测试 `e2e/public-auth.spec.ts:47-54` 用 `waitForResponse` 观察方式不可靠 | 测试层：不要把 sendBeacon 等同普通 fetch 等响应；改为拦截 `navigator.sendBeacon`、查数据库计数，或等待服务端副作用。 | 影响博客浏览量 E2E 可靠性；不建议改应用上报逻辑。 | P2 | ☐ 待你确认 |
| E2E-003 | 消费导入上传后不进入“确认平台” | dev 超时等 `确认平台`；prod 已进入预览，失败变成 `getByText(/将导入 2/)` strict mode，因为匹配到 2 个元素 | 测试用例问题 | 确认。dev 证据为 `test-results/triage-dev/imports-external-map-导入：消费账单-CSV-解析、预览、确认、历史-chromium-desktop/error-context.md`；prod 证据为 `test-results/triage-prod-ok/imports-external-map-导入：消费账单-CSV-解析、预览、确认、历史-chromium-desktop/error-context.md`，页面已显示“预览导入”和 2 行表格；测试断言在 `e2e/imports-external-map.spec.ts:47-50`，`/将导入 2/` 同时匹配段落和统计卡 | 测试层：使用 exact text、限定统计卡区域，或分别断言“预览导入”和两行表格；dev 卡住另按 dev 环境稳定性处理，不作为应用导入 bug。 | 影响消费导入 E2E；应用 prod 路径已能解析和预览。 | P2 | ☐ 待你确认 |
| E2E-004 | 书影导入上传后不进入“确认列映射” | dev 超时等 `确认列映射`；prod 已完成导入并在 `/media` 看到 CSV 媒体，失败只剩 `_rsc=... net::ERR_ABORTED` 诊断噪声 | 测试用例问题 | 确认。prod 证据 `test-results/triage-prod-ok/imports-external-map-导入：书影-CSV-映射、预览、执行-chromium-desktop/error-context.md` 页面显示 `书影收藏册` 与 `${prefix} CSV 媒体`；失败点为 `e2e/imports-external-map.spec.ts:30` 诊断断言，记录多个 Next RSC 预取取消请求；dev 原症状见对应 `triage-dev` error-context | 测试层：过滤 Next 正常 RSC 预取/导航取消请求，或缩小 diagnostics 生命周期；dev 卡住另按 dev 环境稳定性处理。 | 影响书影导入 E2E；当前 prod 行为已经覆盖映射、预览、执行、列表回显。 | P2 | ☐ 待你确认 |
| E2E-005 | 封面上传后 URL 字段不回填 | dev/prod 用例均复现字段为空；trace 显示请求实际发出，但 `/api/upload` 返回 500；换有效 PNG 手动上传成功 | 测试用例问题 | 确认。`test-results/triage-trace-inspect/upload-prod/0-trace.network:37` 记录 `POST /api/upload` status 500；响应体 `test-results/triage-trace-inspect/upload-prod/resources/56f81413e65fcb1c50d64565bb2143fc98bb8276.json` 为 `{"code":"PROCESSING_FAILED","error":"图片处理失败，请稍后再试或换一张图片。"}`；测试夹具由 `e2e/support/fixtures.ts:40-48` 写入固定 tiny PNG；本地 sharp 对该 fixture 转 webp 报 `vipspng: libpng read error`，有效生成 PNG 手动上传返回 `/uploads/media/...webp` | 测试层：替换为 sharp 可稳定处理的有效 PNG fixture。可选应用健壮性：上传失败时在 UI 上断言错误提示，但不应把坏夹具当成封面回填应用 bug。 | 影响上传 E2E；若保留坏 fixture，会持续误报 API/客户端回填失败。 | P2 | ☐ 待你确认 |
| E2E-006 | links/games/expense-categories 新增弹窗不打开 | dev 中 links/categories/games 可复现 `getByRole('dialog')` 超时；prod links 弹窗打开并保存成功，categories 弹窗打开但因测试未填关键词触发表单校验，games 后续主要受 Steam 破图影响 | dev 环境专属 | 确认原始“弹窗不开”只在 dev 复现。dev 证据 `test-results/triage-dev/private-crud-私有：links-后台新增并同步公开导航-chromium-desktop/error-context.md` 显示点“新增链接”后无 dialog；prod 证据 `test-results/triage-prod-ok/private-crud-私有：links-后台新增并同步公开导航-chromium-desktop/error-context.md` 显示公开 `/nav` 已有 `UI 分组` / `UI 链接`；categories prod 证据显示弹窗出现且提示“至少保留一个关键词。” | 环境/测试层：若继续在 `next dev` 跑 E2E，需要处理 dev 交互稳定性或等待策略；测试层另需给 expense category 新增用例补必填关键词。应用层不建议按“弹窗不开”修 prod。 | 影响后台 CRUD E2E；prod 核心弹窗链路可用，但测试数据仍需调整。 | P2 | ☐ 待你确认 |
| E2E-007 | Todos 删除确认不出现，且无拖拽排序控件 | dev 删除确认 dialog 超时；prod 删除确认已不再是主失败，失败为 `getByLabel(/拖拽排序/)` count 0 | 应用 bug | 确认存在一项产品/验收缺口：`test-results/triage-prod-ok/private-crud-私有：todos-新建、完成、删除、拖拽控件检查-chromium-desktop/error-context.md` 记录 `Expected: 1, Received: 0`；测试断言位于 `e2e/private-crud.spec.ts:77`。删除确认 dev-only 需另按环境处理，但“无拖拽排序控件”在 prod 真实存在。 | 应用 todo UI/动作层：若你确认 todos 需要 dnd-kit 重排，新增可访问拖拽手柄 `aria-label="拖拽排序..."`、排序持久化 action 与回显；若不需要该功能，则应审批为改测试期望。 | 影响 todos 排序功能与可访问性；实现排序会触及 UI、Server Action、数据顺序字段。 | P1 | ☐ 待你确认 |
| E2E-008 | TripMap/FootprintMap 动态组件停留“地图加载中...” | dev 复现 `.leaflet-container` 超时；prod 已渲染 Leaflet 容器、控件与 marker，失败只剩 `_rsc=... net::ERR_ABORTED` 诊断噪声 | dev 环境专属 | 确认。dev 证据 `test-results/triage-dev/imports-external-map-地图：旅行足迹-Leaflet-容器渲染-chromium-desktop/error-context.md` 页面停在“地图加载中...”；prod 证据 `test-results/triage-prod-ok/imports-external-map-地图：旅行足迹-Leaflet-容器渲染-chromium-desktop/error-context.md` 页面含 Leaflet marker/Zoom/attribution；测试断言在 `e2e/imports-external-map.spec.ts:139` 与 `:158` | 环境/测试层：地图 E2E 以 prod 构建作为准入，或为 next dev 首次动态编译加入更明确的 readiness 等待；诊断层过滤 RSC 取消请求。 | 影响旅行地图 E2E；prod 用户路径未见地图应用 bug。 | P3 | ☐ 待你确认 |
| E2E-009 | FullCalendar 动态组件停留“日历加载中...” | dev 复现 `.fc` 超时；prod `.fc` 渲染并显示 `纪念日` 与 `今日待办`，后续失败为 `.or()` strict mode 匹配 2 个元素 | dev 环境专属 | 确认原始 loading 症状仅 dev。dev 证据 `test-results/triage-dev/imports-external-map-日历：跨模块聚合事件显示-chromium-desktop/error-context.md`；prod 证据 `test-results/triage-prod-ok/imports-external-map-日历：跨模块聚合事件显示-chromium-desktop/error-context.md` 显示 `.fc` 日历与两条事件；测试 `e2e/imports-external-map.spec.ts:167-168` 的 `.or()` 在 prod 反而因两者都存在而 strict mode 失败 | 环境/测试层：日历动态组件用 prod 构建验收；测试断言改成明确 `toHaveCount(1+)` 或分别断言两条事件。应用层暂不修 FullCalendar。 | 影响日历 E2E；prod 聚合事件已显示。 | P3 | ☐ 待你确认 |
| E2E-010 | settings 保存后首页不回显 | prod 复现：settings action 显示“首页资料已保存。”，随后登录态访问 `/` 看不到保存的 profile name | 测试用例问题 | 确认。`test-results/triage-prod-ok/private-crud-私有：calendar、settings-与-admin-export-chromium-desktop/error-context.md` 快照显示 `/` 是私密仪表盘“今天的收藏册快照”；`src/app/page.tsx:123-156` 登录后返回 `PrivateDashboard`，公开首页 `PublicHome` 仅在未登录分支；`src/modules/settings/actions.ts:51-55` 已保存并 revalidate `/` 和 `/admin/settings`；测试期望在 `e2e/private-crud.spec.ts:169-175` | 测试层：保存后应验证 `/admin/settings` 表单状态、以匿名上下文访问公开 `/`，或明确产品需求为“私密 dashboard 也展示 profile name”。在现有产品行为下不是 revalidate 应用 bug。 | 影响 settings/admin export 用例；若改产品需求，才进入应用层。 | P2 | ☐ 待你确认 |
| E2E-011 | Next dev HMR cross-origin warning | dev 复现；prod 不适用；当前 diagnostics 已忽略 HMR pattern | dev 环境专属 | 确认。原始 dev terminal/report 记录 `/_next/webpack-hmr` cross-origin warning；`e2e/support/diagnostics.ts:12-13` 已忽略 `/hmr/i` 与 `/_next/webpack-hmr/i`，不影响 prod 构建 | dev 配置层可选：若希望消除 warning，可配置 Next dev allowed origins；不作为应用 bug 修复。 | 仅影响 next dev 控制台清洁度；prod 无风险。 | P4 | ☐ 待你确认 |

## 建议修复顺序

1. 先处理 E2E-001 Steam 图片 fallback：这是确认的应用 bug，且会连带影响 dashboard、games、display health 多个用例。
2. 再由你确认 E2E-007 的产品取舍：如果 todos 必须支持拖拽排序，则作为应用 bug 实现；如果当前 Stage 不要求 todos DnD，则改测试期望。
3. 然后批量修测试用例：E2E-002 sendBeacon 观察方式、E2E-003/009 strict mode 断言、E2E-004 诊断噪声、E2E-005 PNG fixture、E2E-010 登录态首页期望。
4. 最后处理 dev 专属稳定性：E2E-006/008/009/011 可选择改为 prod 构建跑关键动态组件 E2E，或专门治理 next dev 下动态 import/HMR 等待问题。

## 需你拍板的点

- E2E-007：todos 拖拽排序是否仍是当前阶段必须功能？若是，第二阶段修应用；若否，第二阶段改测试。
- E2E-001：Steam CDN 是否接受“展示层 fallback”作为第一步，还是要求同步时服务端缓存/本地化 Steam 封面？
- E2E-006/008/009：后续 E2E 准入是否以生产构建为准？如果仍要求 `next dev` 全绿，需要单独投入 dev 稳定性治理。
- E2E-004 以及多处 `_rsc=... net::ERR_ABORTED`：是否批准测试 diagnostics 忽略 Next RSC 正常预取/导航取消请求？

## 完成核对清单

- [x] E2E-001..011 每个都已复现并归类（四类之一），且绑定证据。
- [x] “单一共因”假设已排除，且有证据。
- [x] 每个“应用 bug”项都给了建议修复（层级+做法）+ 影响面；每个“测试/环境/无法复现”项说明了原因。
- [x] 动态组件/地图/日历已在 dev 与生产构建下各复现确认。
- [x] `docs/E2E_TRIAGE.md` 含摘要 / 共因分析 / 逐发现表（带“待你确认”审批列）/ 建议修复顺序 / 需你拍板的点。
- [x] 本报告阶段未修改任何源码、测试、配置、Prisma、依赖文件；只新增/更新 `docs/E2E_TRIAGE*.md`。
- [x] 已停在定性阶段，未执行任何修复。
