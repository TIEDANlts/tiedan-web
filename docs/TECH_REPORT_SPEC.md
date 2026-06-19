# TECH_REPORT_SPEC —— 技术报告编写规格（Codex /goal 引用）

> 本文件是 `/goal` 任务的"契约附件"。Agent 必须按本规格产出 `docs/TECH_REPORT.md`，
> 并在收尾时逐项对照文末"完成核对清单"自检。**代码是唯一事实来源**：当 `README.md` /
> `AGENTS.md` / `docs/PLAN.md` / `docs/PROGRESS.md` 与实际代码冲突时，以代码为准，并在报告中
> 明确指出冲突点。

---

## 0. 报告目标与读者

- **读者**：项目维护者本人。目标是"**不读源码、只读这份报告，就能理解项目大部分实现**"。
- **风格**：中文；聚焦"**具体是怎么实现的**"，而非罗列文件名或粘贴大段代码。
- **深度**：每个模块讲清"数据怎么存、请求怎么流、关键逻辑怎么算、有什么坑、怎么改进"。

---

## 1. 报告结构（`docs/TECH_REPORT.md` 必须包含以下章节）

### 第 0 节 · TL;DR 与模块全景
- 一段话说清：这是什么项目、给谁用、核心技术栈。
- 一张"模块全景表"：列 = 模块 / 一句话职责 / 对应 Prisma 模型 / 对应路由 / 关键依赖。

### 第 1 节 · 项目概览
- 定位与目标用户；核心场景。
- 技术栈与**版本**（前端框架、UI、状态/表单、数据层、鉴权、构建、测试、部署）——以 `package.json` 为准。
- 目录结构总览与**分层约定**：`src/modules`（领域逻辑）vs `src/app`（路由/页面）vs `src/lib`（横切）vs `src/components`（通用 UI）四者的边界与依赖方向。
- 本地运行 / 构建方式（`package.json` scripts、所需环境变量、依赖的外部服务如 Postgres/Steam/Nominatim）。

### 第 2 节 · 架构与横切设计
逐项说明（每项给出关键文件定位）：
- **渲染与路由模型**：App Router、route group `(private)` / `(public)` 的划分含义；Server Component / Server Action 的使用方式；`actions.ts` 如何作为服务端入口。
- **数据层**：Prisma + Postgres（`@prisma/adapter-pg`）；`prisma/schema.prisma` 模型概览与关系；迁移策略（`prisma/migrations/**` 的演进顺序说明了什么）。
- **鉴权与会话**：NextAuth v5、bcrypt、`src/lib/auth/*`（含 `rate-limit`、`routes`）；私有/公开路由是如何被保护的；登录流程与错误处理。
- **安全**：`src/lib/ssrf.ts`（外链抓取防护）、`secure-compare.ts`、cron 接口鉴权、上传与私有文件访问控制（`api/upload`、`api/files/private`）。逐一说明防的是什么、怎么防的。
- **文件与存储**：`src/lib/storage.ts`、`upload-client.ts`、`sharp` 图片处理；上传如何落盘/取用。
- **活动与审计**：`src/lib/activity*.ts`（记录了什么、用在哪）。
- **日历聚合**：`src/lib/calendar.ts` + 各模块 `events.ts`（todos/media/trips/special-days）如何把多模块事件汇总到日历。
- **通用 UI 与样式**：`app-shell`、`shadcn/ui`、主题（next-themes）、markdown 渲染（react-markdown + shiki/rehype-pretty-code）、图表封装（echarts）。

### 第 3 节 · 功能模块逐一详解（**核心章节**）
对下列 **10 个模块各写一个独立小节**，**每个小节必须覆盖 a–f 六个维度**：

> 模块清单：`dashboard`、`expenses`、`games`、`links`、`media`、`posts`、`settings`、`special-days`、`todos`、`trips`

每个模块小节模板：
- **a. 功能概述**：用户在这个模块能做什么（结合对应页面 `src/app/(private)/<feature>/**`）。
- **b. 数据模型**：对应的 Prisma model 与关键字段、相关迁移文件。
- **c. 实现思路与关键流程**：`actions.ts`（写）/ `queries.ts`（读）/ `utils.ts` 如何协作；把关键算法/流程讲清楚。**至少要覆盖各模块的"重点机关"**：
  - expenses：账单导入流水线（`parsers/*` → `import-parser`/`import-executor`）、自动分类 `categorize.ts`、统计 `stats.ts`、快捷记账 `quick.ts` 与 `api/quick/expense`、`xlsx` 解析。
  - games：Steam 同步 `steam.ts` + `api/cron/steam-sync`（定时任务怎么触发、怎么鉴权、怎么落库）。
  - trips：地理编码 `nominatim.ts` + `api/trips/nominatim`、地图 `map-types.ts` 与 Leaflet/`footprint` 足迹地图、行程明细编辑器。
  - todos：基于 `@dnd-kit` 的拖拽看板（状态流转、排序持久化）。
  - posts：Markdown 编辑/渲染 + 代码高亮（shiki）、浏览计数 `view.ts` + `api/posts/view` + `view-beacon`、RSS（`src/app/rss.xml`）、博客分页。
  - media：媒体库导入向导（`media-import-*`）、评分（`rating`）、元数据抓取 `metadata.ts`、封面上传。
  - links：导航书签、favicon 抓取 `favicon.ts`、公开导航页 `(public)/nav`。
  - settings / special-days / dashboard：设置项、纪念日与提醒、首页聚合查询 `dashboard/queries.ts`。
- **d. 关键技术细节与依赖**：用到的关键库及原因、注意点（如 SSRF、编码 `iconv-lite`、时区 `dayjs`）。
- **e. 现存问题与风险**：bug 隐患、边界条件、性能、安全、可测性、与文档不符之处——**每条标注证据**（`文件路径:行号` 或 函数名）。
- **f. 重构/优化点 + 可拓展功能**：值得重构的地方（动机+影响面）、后续可加的功能及**具体落地思路**。

### 第 4 节 · API / 服务端接口清单
逐一覆盖 `src/app/api/**` 下每个 `route.ts`（admin/export、auth、calendar/events、cron/steam-sync、files/private、health、posts/view、quick/expense、trips/nominatim、upload）。每条列：路径 / 方法 / 是否需鉴权 / 入参 / 出参或副作用 / 用途 / 主要调用方。

### 第 5 节 · 测试与质量
- vitest 单测覆盖了哪些层（大量 `*.test.ts` 与 `src/lib` 工具测试）、覆盖薄弱处。
- playwright e2e（`e2e/smoke.spec.ts`、`playwright.config.ts`）覆盖了什么。
- `npm run check`（tsc + eslint + vitest）这条质量闸的构成。

### 第 6 节 · 部署与运维
- `Dockerfile`、`docker-compose.dev.yml`/`prod`、`Caddyfile`、`.github/workflows/deploy.yml`、`scripts/backup.sh` 各自做什么，串成怎样的上线链路。
- **环境变量清单**：对照 `.env.example` 与 `.env.production.example` 逐项说明用途与是否必填。

### 第 7 节 · 全局问题清单（按严重度排序）
汇总第 3 节各模块问题 + 横切问题，按 高/中/低 严重度排序，每条：现象 / 证据定位 / 影响 / 建议。

### 第 8 节 · 重构与演进路线建议
分 **短期 / 中期 / 长期**，每条给出：动机、影响面、风险与前置条件。区分"客观事实"与"主观建议"。

### 第 9 节 · 附录
- 数据模型 ER 关系简述（各 model 间引用关系）。
- 术语表 / 约定速查。
- **未解疑问**：读代码仍无法确定的点，统一标注"推测"或"待确认"。

---

## 2. 证据与质量规则（强制）

1. **代码优先**：与 PLAN/PROGRESS/README/AGENTS 冲突时以代码为准，并指出冲突。
2. **每条非显然论断都要有证据**：标注 `相对路径:行号`（或路径 + 函数/导出名）。找不到证据的判断必须标注"**推测**"。
3. **不臆造**：报告中出现的任何文件路径、接口、字段都必须真实存在；引用前先用 `rg`/`ls` 确认。
4. **事实 vs 建议分清**："问题/重构/拓展"里要区分"代码当前确实如此"与"我建议如何改"。
5. **不做架构决策**：只描述现状并给出带权衡的建议，不替维护者拍板。
6. **篇幅克制**：长逻辑用要点+流程描述，不整段粘贴源码；但关键数据结构/核心算法可用极短代码片段示意。

---

## 3. 完成核对清单（收尾逐项打勾，全过才算 done）

- [ ] 第 0 节含 TL;DR + 模块全景表。
- [ ] 第 1–2 节：技术栈与版本、四层分层约定、渲染/路由、数据层、鉴权、安全、存储、活动、日历聚合、通用 UI 均已覆盖。
- [ ] 第 3 节：**10 个模块各有独立小节**，且每个小节 a–f 六维度齐全；各模块"重点机关"（见 1.第3节 列表）均已讲到。
- [ ] 第 4 节：`src/app/api/**` 下**每一个** `route.ts` 都有对应条目（逐一核对文件，无遗漏）。
- [ ] 第 5 节：覆盖 vitest + playwright + `check` 脚本。
- [ ] 第 6 节：覆盖 Docker / compose / Caddy / CI / backup，且环境变量对照两个 `.env*.example` 列全。
- [ ] 第 7 节：问题按严重度排序，每条有证据定位。
- [ ] 第 8 节：路线建议分短/中/长期。
- [ ] 报告内所有文件路径经 `rg`/`ls` 抽查，确认真实存在。
- [ ] `git diff --stat` 仅显示 `docs/` 下新增文件，**无任何既有文件被修改/重命名/删除**。

> 以上全部勾选通过 → 任务完成、停止；任一未过 → 继续补全后再自检。
