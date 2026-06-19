# E2E_TEST_SPEC —— 真实浏览器功能测试规格（Codex /goal 引用）

> 本文件是"用真实浏览器逐功能验证 + 如实报告"任务的契约附件。Agent 必须按本规格产出
> `docs/E2E_REPORT.md` 与一套可复跑的 Playwright 用例，并在收尾时逐项对照文末"完成核对清单"自检。
> **代码是唯一事实来源**（与 README/AGENTS/PLAN/PROGRESS 冲突以代码为准）。
> **这是"只测不修"任务**：用例跑红若反映真实缺陷是有价值的产出，不是阻塞；
> **不得改应用代码让测试变绿**，也**不得在确属坏功能上无限重试**——记录证据后继续。

---

## 0. 目标与产物

- 在**真实浏览器**（Playwright + Chromium，含**移动视口**——项目含 PWA manifest）里逐功能验证应用是否**按预期工作**、**显示是否正常**。
- **产物**：`docs/E2E_REPORT.md` + `e2e/**` 下的 Playwright 用例 + 截图证据。
- **"完成"的定义**：覆盖矩阵全覆盖 + **每条场景有确定结论**（通过 / 失败带证据 / 受阻带原因），**而非"全部通过"**。

---

## 1. 环境与启动（本项目实测路径）

> 本应用是**单管理员账号**：`seed` 仅创建一个由 `ADMIN_USERNAME`/`ADMIN_PASSWORD` 指定的用户 + 默认消费分类，**不含示例内容**（无帖子/待办/链接/媒体/行程/游戏/账单流水）。"有数据"的显示需通过 UI 创建（这本身就是 CRUD 覆盖）或额外 e2e 夹具数据。

启动步骤：
1. 起 Postgres：`docker compose -f docker-compose.dev.yml up -d`（postgres:16，库/账号均为 `personal_site`，端口 5432）。
2. 准备测试用 `.env`（从 `.env.example` 复制；`.env` 已被 .gitignore，不污染 diff）：
   - `DATABASE_URL` 指向上面的 dev 库；
   - `AUTH_SECRET` 用 `openssl rand -base64 32`；
   - `ADMIN_USERNAME`/`ADMIN_PASSWORD` 设测试凭据（Playwright 与 seed 都读它）；
   - `SITE_URL=BASE_URL=http://127.0.0.1:3000`；
   - 外部 key（`STEAM_API_KEY`/`STEAM_ID`/`TMDB_API_KEY`/`TIANDITU_KEY`/`CRON_SECRET`/`QUICK_ADD_TOKEN`）留空或指向本地 mock。
3. 迁移 + 生成：`npx prisma migrate deploy` + `npx prisma generate`。
4. 种子：`npm run db:seed`（建管理员 + 默认消费分类）。
5. 浏览器：`npx playwright install`（必要时 `--with-deps`）。
6. 跑测：`npx playwright test`（沿用现有 `playwright.config.ts`，其 `webServer` 会自动起 `npm run dev`、等 `/api/health`；移动视口可在 config 加 project 或用 `test.use({ viewport })`）。

登录（取自现有 `e2e/smoke.spec.ts`）：访问 `/login?from=<目标路径>`，填 `用户名`/`密码` label，点 `登录` 按钮；**用 storageState 复用登录态**加速后续用例。

---

## 2. 外部依赖处理（必须逐个分类）

读代码判断每个外部触点是**浏览器发起**还是**服务端发起**，分别处理：

- **浏览器发起**（页面调用本应用自己的 API，例如 `/api/trips/nominatim`、`/api/posts/view`、`/api/calendar/events`、`/api/quick/expense`、favicon/图片代理等）→ 用 Playwright `page.route()` **拦截并返回固定响应**，实现确定性。
- **服务端发起**（server action / cron 内部直连 Steam/TMDB/Nominatim 上游，如 `games/steam.ts`、`media/metadata.ts`、`trips/nominatim.ts` 的上游调用）→ Playwright **拦不到**，改用：① 直接在库里**种入结果数据**测显示；② 若集成 base URL 可配，指向**本地 mock 服务**跑成功路径；③ 否则测"**空 key 时的优雅降级/错误提示**"，并在报告标注"成功路径需手工/集成环境验证"。
- **地图**（Tianditu/OSM 瓦片为浏览器请求）→ 可拦截或容忍；断言**地图容器、标记、控件**渲染，**不对瓦片像素断言**；瓦片加载失败单独记录。
- **红线**：不得真实大量请求受策略限制的服务（Nominatim 1req/s + 需 UA）；不得提交任何真实密钥。

---

## 3. 功能清单与验收（逐项必测；每项至少 happy path + 1 关键边界 + 显示检查）

**公开区**
- **登录/门禁**：正确凭据登录并跳转 `from`；错误凭据显示错误且不进入；**未登录访问 `(private)` 路由被挡/跳登录**。
- **博客**：`/blog` 列表渲染；`/blog/page/[page]` 分页；`/blog/[slug]` 详情（markdown + shiki 代码高亮渲染正常）；浏览计数 beacon（`view-beacon` → `/api/posts/view`）；`/rss.xml` 返回有效 RSS。
- **公开导航** `(public)/nav`：链接渲染、favicon 显示。

**私有区（登录后）**
- **dashboard**：首页聚合卡片渲染（来自 `dashboard/queries`）。
- **todos**：看板渲染；新建/编辑/完成/删除；**`@dnd-kit` 拖拽重排后顺序持久化**（刷新仍在）。
- **links + admin/links**：增/改/删链接；favicon 抓取后显示；公开 nav 同步。
- **posts + admin/posts**：新建 → 编辑器（markdown）写作 → 保存/发布 → 公开博客可见；编辑既有帖；删除。
- **expenses**：账本列表 + 过滤栏（`expense-filter-bar`）；手动记账弹窗（`manual-transaction-dialog`）增改删；分类选择；统计页 `stats`（echarts 图表渲染、数值正确）；**导入向导**（`expense-import-wizard`：上传 xlsx/csv → 预览 → 执行 → `import/result/[id]` 与 `import/history`）；`admin/expense-categories` 增改删分类。
- **media + media/import + media/[id]**：媒体库渲染；**导入向导**（`media-import-wizard`）；详情编辑（`media-detail-editor`）；评分（`rating-field`）；**封面上传**（`cover-upload-input` → `/api/upload`）；元数据抓取（TMDB，按 §2）。
- **games**：游戏库渲染（`games-library`）；**Steam 同步**按钮（按 §2：空 key 测降级，或 mock/seed 测成功）；筛选/分类。
- **trips + trips/[id] + trips/footprint**：行程库；详情编辑（概览/天卡/清单/备注/英雄图）；**地点编辑 + 地理编码**（`trip-location-editor` → `/api/trips/nominatim`，拦截 mock）；**行程地图 + 足迹地图**（Leaflet，断言容器/标记）；**行程照片上传**（`trip-photo-uploader`）。
- **calendar**：`FullCalendar` 渲染；来自 todos/media/trips/special-days 的 `events.ts` 聚合事件出现在**正确日期**（`/api/calendar/events` 可拦截或用种子数据）。
- **special-days**：新增纪念日（`special-day-quick-form`）；在日历/提醒中体现。
- **settings + admin/settings**：读取与保存设置（`settings-form`），保存后生效。
- **admin/export**（`/api/admin/export`）：鉴权后导出下载可用。

---

## 4. 显示 / 健康检查（每个被访问页面都要做）

- **截图**：桌面 + 移动视口全页截图，存固定目录并在报告建索引。
- **控制台**：捕获 `console.error` / `pageerror` / **React hydration 不匹配**，任一出现记为发现。
- **网络**：捕获 4xx/5xx 与失败请求（排除被有意 mock 的）；**图片破图**检测（`naturalWidth === 0`）。
- **错误界面**：出现 Next 错误覆盖层 / "Application error" / error boundary 即记。
- **关键元素可见性**：每个功能页断言其标志性元素（标题/列表/按钮）**可见且非空**（在已有数据下不应是空状态）。
- **主题**：`next-themes` 明/暗切换两套都渲染正常。

---

## 5. 用例与证据规则（强制）

1. 用例放 `e2e/**`，命名清晰、相互独立、**可重复**（每个 spec 自备并清理数据，避免脏状态）；用 storageState 复用登录。
2. 每条场景给**确定结论**：**通过** / **失败**（附截图 + 控制台/网络证据 + 复现步骤）/ **受阻**（说明原因，如需真实外部服务）。
3. 失败即**如实记录为发现**，给严重度（Critical/High/Medium/Low）+ 修复建议（**思路**）；**不改应用代码让其变绿**，不在坏功能上死循环重试。
4. **不臆造**；报告引用的路径/用例/截图必须真实存在。
5. 全程中文。

---

## 6. 完成核对清单（逐项打勾，全过才 done）

- [ ] **环境跑通**：Postgres 起、`prisma migrate deploy`+`db:seed` 完成、`playwright install` 完成、webServer 起、登录态可用、`/api/health` 返回 `{ok:true}`。
- [ ] §3 功能清单**每一项**都有对应 Playwright 场景并**已执行**；覆盖矩阵（功能 × {happy / edge / 显示}）**无空格**。
- [ ] 每个 `(public)`/`(private)` 页面均被访问并做了 §4 显示/健康检查 + **桌面与移动截图**。
- [ ] 每条场景都有**确定结论**（通过/失败带证据/受阻带原因）；失败项均有严重度 + 复现 + 修复建议。
- [ ] 外部触点均按 §2 **归类处理并在报告说明**（哪些拦截、哪些种子、哪些只测降级/待手工验证）。
- [ ] `docs/E2E_REPORT.md` 生成：**摘要**（通过/失败/受阻计数）+ **覆盖矩阵** + **逐功能结果** + **显示异常清单** + **bug 发现** + **截图索引** + **复跑步骤** + Playwright 运行结果（HTML/JSON report）位置。
- [ ] **未修改任何应用代码**：`git diff --stat` 改动仅限 `e2e/**`、Playwright 测试配置、测试用 env（gitignored）与 `docs/` 新增；`src/**`、`prisma/schema.prisma`、既有迁移、既有单测、`package.json`/`package-lock.json` **未变**。

> 全部勾选通过 → 任务完成、停止；任一未过 → 继续补全后再自检。
