# 个人网站完整实现方案（Vibe Coding 版 · v2 修订版）

> 一个单用户的「个人生活管理系统」：游戏 / 书影 / 旅行 / 博客 / 消费 / 待办日历 / 导航 / 首页聚合。
> 技术栈：Next.js + TypeScript + Tailwind v4 + Prisma + PostgreSQL，部署于国内云服务器（Docker Compose）。
> 隐私策略：博客与导航页公开，其余模块仅登录后可见。

> **v2 相对初版的主要修订**（评审后）：
> 1. 修复公开白名单缺 `/uploads/**` 的 bug（否则未登录访客的博客图片会被 302 到登录页，全部裂图）。
> 2. 明确 Tailwind v4（CSS-first `@theme`）写法；新增全依赖「版本锁定」纪律，防止跨会话版本漂移。
> 3. 外部图片一律服务端转存本地（Steam CDN 例外）；出海 API 统一超时 + 可选 `OUTBOUND_PROXY`；影视元数据 TMDB 不可达时回退 NeoDB。
> 4. 地图瓦片默认天地图（CGCS2000≈WGS-84，与库内坐标兼容、国内加载快），OSM/Carto 备选。
> 5. 建立机器可验的完成定义：Vitest 进 Stage 0、账单解析器改为 fixtures 测试驱动、CI 加质量门、上线后 Playwright 冒烟。
> 6. `storage.ts` 内置 sharp 图片管线：压缩、缩略图、自动旋正、重编码去 EXIF（防手机照片泄露 GPS）。
> 7. 备份加密（rclone crypt）+ Healthchecks 心跳监控；ICP 备案改为建仓当天启动（1–4 周日历时间）。
> 8. 新增缓存纪律（App Router 第一大坑）与 Prisma Decimal 跨边界序列化约定，并入坑表。
> 9. 设计系统微调：弱文字对比度按正文 AA（4.5:1）校正；私密面主色改为焦糖棕，不再与游戏模块色撞色；中文字体明确「正文系统栈 + 标题子集化」策略。
> 10. 快捷记账 API 并入 Stage 13；PWA 与数据导出并入 Stage 16；日历小屏改 listWeek；跨会话进度靠 `docs/PROGRESS.md`。

---

## 0. 这份文档怎么用

1. **建仓库**：新建一个 Git 仓库（如 `personal-site`）。
2. **放文档**：把本文档存为仓库内的 `docs/PLAN.md`；把附录 A 的内容存为仓库根目录的 `AGENTS.md`；把附录 B 的内容存为 `docs/PROGRESS.md`。这样每次 vibe coding 时，AI 都能读到完整背景、约定和当前进度。
3. **当天启动备案**：ICP 备案需要 1–4 周的**日历时间**，和写代码完全可以并行。建仓库当天就在云厂商发起域名实名认证与备案流程，不要等到 Stage 6 才开始办，否则代码写完了还要干等审核。
4. **按 Stage 推进**：全部工作划分为 5 个阶段、共 17 个 Stage（Stage 0 ~ 16）。每个 Stage 提供四样东西：
   - **目标**：这一步做完应该得到什么；
   - **实现要点**：关键设计决策、数据模型、容易踩的坑（这是 AI 最容易做错的地方，Prompt 里也会强调）；
   - **验收标准**：一份可以逐条勾选的清单，全部通过才进入下一个 Stage；
   - **Vibe Coding Prompt**：可直接复制给 Claude Code（或 Cursor 等）的指令，`{花括号}` 内容需替换成你的实际值。
5. **顺序执行**：Stage 之间有依赖关系，请按顺序做。阶段三 / 四 / 五内部相对独立，做完阶段二上线后，想先做哪个大模块可以自行调整顺序。

### Vibe Coding 工作流建议（重要，能省掉一半返工）

- **一个 Stage 一个会话**：每个 Stage 在 Claude Code 里开一个新任务，粘贴对应 Prompt。上下文干净，AI 不容易被历史信息带偏。
- **先计划后动手**：每个 Prompt 末尾都要求 AI 先列出实施计划再写代码。看一眼计划，方向不对就在写代码前纠正，成本最低。
- **小步提交**：每个 Stage 完成并验收通过后 `git commit`（甚至每个 Stage 一个分支）。出问题随时可以回滚，这是 vibe coding 最重要的安全网。
- **完成的定义是机器可验的**：每个 Stage 以 `npm run check`（类型检查 + lint + 单元测试）全绿收尾；账单解析、日期展开、Steam 合并这类纯逻辑**先写测试再实现**。这是 AI 自我纠错的闭环，比人工清单可靠得多，也是项目后期做回归测试唯一现实的办法。
- **报错原样贴回**：运行报错时，把终端 / 浏览器控制台的报错原文完整贴给 AI，不要自己转述。
- **验收清单当体验测试**：自动化测试覆盖逻辑正确性，人工清单覆盖交互与视觉（包括用浏览器开发者工具切换到 375px 看响应式），两者缺一不可。
- **跨会话记忆靠 PROGRESS.md**：每个 Stage 结束让 AI 把产出文件、关键决定、与计划的偏离追加进 `docs/PROGRESS.md`；新会话第一句让它先读 AGENTS.md 与 PROGRESS.md，而不是依赖你口头同步进度。
- **禁止顺手重构**：Prompt 里已写明"不要改动本 Stage 范围之外的代码"。如果 AI 自作主张大改其他模块，让它撤销。
- **数据库纪律**：本地用 `prisma migrate dev` 生成迁移文件并提交到 git；线上只跑 `prisma migrate deploy`。上线后任何 schema 变更前，先确认昨晚的备份存在。
- **节奏预期**：地基和简单模块每个 Stage 大约一个晚上的量级；账单解析、Steam 同步这类涉及外部数据的 Stage 留出加倍时间调试真实数据。

---
## 1. 项目总览

### 1.1 模块清单与公开性

| 模块 | 路由 | 公开性 |
|---|---|---|
| 首页（公开版 / 仪表盘） | `/` | 未登录见公开版，登录后见仪表盘 |
| 博客 | `/blog` | 公开（仅已发布文章） |
| 导航页 | `/nav` | 公开 |
| 游戏记录 | `/games` | 私密 |
| 书影记录 | `/media` | 私密 |
| 旅行记录 | `/trips` | 私密 |
| 消费记录 | `/expenses` | 私密 |
| 待办事项 | `/todos` | 私密 |
| 全局日历 | `/calendar` | 私密 |
| 后台管理（写博客、管导航等） | `/admin/*` | 私密 |

### 1.2 技术栈（定稿）

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Next.js 15+（App Router）+ TypeScript | 全栈一体，Server Components + Server Actions |
| 样式 | Tailwind CSS **v4（CSS-first，`@theme`）** + shadcn/ui + lucide-react 图标 + next-themes + 自定义设计 token | 统一 UI 风格，避免默认 shadcn 模板感；token 全部经 `@theme` 映射，组件禁止散写 hex |
| ORM / 数据库 | Prisma + PostgreSQL 16 | 标签数组、JSON 元数据原生支持 |
| 认证 | Auth.js（next-auth v5，beta，**锁定精确版本**）Credentials | 单用户，用户名 + 密码 |
| 图表 | ECharts（echarts-for-react） | 消费报表 |
| 日历 | FullCalendar（dayGridMonth + 小屏 listWeek，中文 locale） | 全局日历 |
| 地图 | Leaflet + react-leaflet（**默认天地图瓦片**，CGCS2000≈WGS-84；OSM/Carto 备选） | 旅行地图、足迹图，国内访问流畅 |
| Markdown | 编辑：双栏 textarea + 实时预览；渲染：react-markdown + remark-gfm + rehype-pretty-code（Shiki 高亮） | 博客与各模块感想 |
| 日期 | dayjs（zh-cn locale，时区 UTC+8） | |
| 文件存储 | 国内云服务器云盘 `/data/uploads`（Docker volume），分 public / private 两区；**所有图片经 sharp 管线（压缩/缩略图/旋正/去 EXIF）** | 量大后迁到 OSS/COS/OBS 等对象存储 |
| 测试 | **Vitest（单元测试）+ Playwright（部署后冒烟）** | 解析器、日期、合并规则等纯逻辑必须有单测 |
| 部署 | Docker Compose（app + postgres + caddy）+ GitHub Actions（**lint/typecheck/test 质量门**通过后构建推送） | 国内服务器继续使用 Compose；镜像优先推到云厂商容器镜像服务 |
| 备份 | 每日 cron：pg_dump + uploads 打包 → **rclone crypt 加密远端**（国内对象存储）→ **Healthchecks 心跳** | 必选项；建议同云同地域 + 异地副本；备份必须做恢复演练 |

### 1.3 架构原则

1. **单体应用，目录模块化**：所有模块共用一个 Next.js 应用和一个数据库，业务逻辑按模块放在 `src/modules/` 下，杜绝微服务。
2. **默认私密**：middleware 全站要求登录，公开路由走白名单（`/login`、`/blog/**`、`/nav`、`/`公开版、`/rss.xml`、**`/uploads/**`（仅 public 区文件）**、公开静态资源、`/api/auth/**`、`/api/quick/**`（自带 token 鉴权）、`/api/health`）。
3. **写操作一律 Server Action**，且每个 action 第一行做 session 校验（middleware 之外的第二道防线）；读私密数据的 Server Component 同样先校验。
4. **统一内容模式**：游戏 / 书影 / 旅行同构为「条目 + 状态 + 评分 + 标签 + Markdown 感想」，前端卡片、状态筛选、标签输入、MD 编辑器组件全部复用。
5. **日历聚合约定**：不建冗余事件表。每个有日期概念的模块导出 `getEvents(start, end): CalendarEvent[]`，日历页合并渲染。
6. **活动流**：`Activity` 表 + `recordActivity()` 工具函数，模块在关键动作（通关、看完、发布、完成旅行）时写一条，供首页时间线使用。
7. **金额纪律**：金额一律 Prisma `Decimal`，禁止 JS 浮点数运算；跨 Server/Client 边界传输前 `.toString()`；展示层统一格式化。
8. **导入器纪律**：所有外部导入（Steam、豆瓣、账单）遵循「解析 → 预览 → 确认 → 幂等写入（唯一键去重）」四步，重复导入永不产生重复数据。
9. **缓存纪律**：App Router 的缓存是最常见的翻车点。约定：私密页面一律按动态数据处理；每个写 action 之后对受影响路径 `revalidatePath`；公开博客可静态化，发布/编辑时精确 revalidate。拿不准时宁可动态，先正确再优化。
10. **外部资源纪律**：所有外部图片（豆瓣、TMDB、NeoDB 封面等）服务端下载转存本地后再使用，唯一例外是 Steam CDN（国内可达性历来尚可，热链 + 失败占位）；所有出海 API 统一走 `src/lib/http.ts`（超时、一次重试、可选 `OUTBOUND_PROXY`）。
11. **测试纪律**：完成的定义 = `npm run check`（类型 + lint + 单测）全绿。账单解析、日期展开、Steam 合并这类纯逻辑必须有 Vitest 单测，且尽量测试先行；CI 质量门不绿不部署。

### 1.4 目录结构

```
personal-site/
├─ AGENTS.md                    # AI 协作约定（附录 A，含版本锁定表）
├─ docs/
│  ├─ PLAN.md                   # 本文档
│  ├─ PROGRESS.md               # 进度日志（附录 B 模板，AI 每个 Stage 维护）
│  ├─ DEPLOY.md                 # 部署手册（Stage 6 产出）
│  └─ QUICK_ADD.md              # 快捷记账配置说明（Stage 13 产出）
├─ docker-compose.dev.yml       # 本地开发：仅 postgres
├─ docker-compose.prod.yml      # 生产：app + postgres + caddy
├─ Dockerfile
├─ Caddyfile
├─ scripts/
│  ├─ seed.ts                   # 初始化管理员账号、默认消费分类
│  └─ backup.sh                 # 每日备份脚本（加密 + 心跳）
├─ tests/
│  └─ fixtures/                 # 脱敏账单样本、豆伴导出样本等测试数据
├─ e2e/                         # Playwright 冒烟测试（Stage 6 起）
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
└─ src/
   ├─ middleware.ts             # 登录保护 + 公开白名单（含 /uploads/**）
   ├─ auth.ts                   # Auth.js 配置
   ├─ app/
   │  ├─ (public)/              # 公开首页、/blog、/nav、/login
   │  ├─ (private)/             # 仪表盘、/games、/media、/trips、/expenses、/todos、/calendar、/admin
   │  └─ api/                   # /api/auth、/api/upload、/api/files、/api/cron、/api/quick、/api/health、/rss.xml
   ├─ modules/                  # 各模块业务逻辑（queries.ts / actions.ts / 解析器等）
   │  ├─ games/  ├─ media/  ├─ trips/  ├─ posts/
   │  ├─ expenses/  ├─ todos/  ├─ links/  └─ dashboard/
   ├─ components/               # 通用组件（PageHeader、TagInput、MarkdownEditor…）
   └─ lib/                      # db、http、storage、money、geo、map、calendar、activity、design、dayjs、utils
```

### 1.5 环境变量总表（随 Stage 逐步用到）

| 变量 | 用途 | 引入 Stage |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 | 0 |
| `AUTH_SECRET` | Auth.js 签名密钥（`openssl rand -base64 32`） | 1 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | seed 脚本创建的唯一账号 | 1 |
| `SITE_URL` | 站点完整 URL（RSS、SEO 用） | 5 |
| `UPLOAD_DIR` | 上传根目录，默认 `/data/uploads` | 5 |
| `TZ` | 容器时区，固定 `Asia/Shanghai`（UTC+8，与账单时间一致） | 6 |
| `ICP_BEIAN_NO` | ICP 备案号，公开页页脚展示 | 6 |
| `GONGAN_BEIAN_NO` | 公安联网备案号（如已办理），公开页页脚展示 | 6 |
| `BACKUP_REMOTE` | rclone 远端名与路径，**指向 crypt 加密远端**（底层为 OSS/COS/OBS） | 6 |
| `HEALTHCHECKS_BACKUP_URL` | 备份脚本的 Healthchecks 心跳 ping 地址（可选但强烈建议） | 6 |
| `CRON_SECRET` | 定时任务接口的鉴权头 | 8 |
| `STEAM_API_KEY` / `STEAM_ID` | Steam Web API Key 与你的 SteamID64 | 8 |
| `OUTBOUND_PROXY` | 可选：出海 API（Steam/TMDB/NeoDB/Nominatim）统一走的 HTTP 代理 | 8 |
| `HEALTHCHECKS_STEAM_URL` | Steam 每日同步的心跳 ping 地址（可选但强烈建议） | 8 |
| `TMDB_API_KEY` | TMDB 搜索补全（可选，国内直连常不可用，见 1.6） | 10 |
| `QUICK_ADD_TOKEN` | 快捷记账 API 的 Bearer token（长随机串，未配置则接口禁用） | 13 |
| `TIANDITU_KEY` | 天地图浏览器端 key（地图瓦片），未配置回退 OSM | 14 |

### 1.6 国内云服务器部署约束

国内部署不只是更换服务器地址，主要差异在合规、网络和云资源选型：

1. **域名与备案（建仓当天就办）**：如果网站解析到中国内地云服务器并对外提供访问，先完成域名实名认证、ICP备案/接入备案，再把生产域名正式解析到服务器。备案审核通常需要 1–4 周日历时间，应在 Stage 0 当天发起、与开发并行。公开页页脚需要展示 `ICP_BEIAN_NO`；公安联网备案按实际要求办理，办好后展示 `GONGAN_BEIAN_NO`。
2. **云厂商选择**：阿里云 ECS、腾讯云 CVM、华为云 HECS/云耀、火山引擎 ECS 都可以。建议应用和对象存储先选同一家云厂商，降低内网流量、权限配置和账单复杂度。
3. **Docker Compose 仍然可用**：个人网站规模小，单台云服务器跑 `app + postgres + caddy` 足够。PostgreSQL 不对公网开放，只在 Docker 网络内访问；公网安全组只放行 80/443，SSH 只允许你的固定 IP 或临时开启。
4. **镜像与依赖源**：国内服务器直接拉 GHCR、npm、GitHub 资源可能慢或失败。生产镜像优先推到云厂商容器镜像服务（阿里云 ACR / 腾讯云 TCR / 华为云 SWR），服务器只从国内 registry 拉取；Node 包安装可配置国内 npm mirror。
5. **HTTPS 与端口**：Caddy 可以继续自动申请 HTTPS，但域名必须已备案并正确解析，云服务器安全组和系统防火墙都要放通 80/443。备案未完成前不要把正式域名长期开到国内服务器上。
6. **备份位置与加密**：不要默认依赖 Cloudflare R2。首选 OSS/COS/OBS 等国内对象存储作为主备份；预算允许时再加一个异地或跨云副本。**备份内容包含完整消费流水与私人照片清单，必须加密后上传**（rclone crypt 远端，配置一次即透明加解密）。备份必须做恢复演练，并接 Healthchecks 心跳监控——静默失败的备份等于没有备份。
7. **外部服务可用性**：Google s2 favicon、部分海外 CDN/API 在国内访问不稳定；**TMDB 的 API 与图片域名（`api.themoviedb.org` / `image.tmdb.org`）从大陆直连长期不可靠**，这是自托管影音圈的共识。对策：影视元数据以 NeoDB 兜底；出海 API 统一支持可选的 `OUTBOUND_PROXY`；**所有外部图片一律服务端抓取后转存到本站存储区**（唯一例外：Steam CDN 可热链 + 失败占位）；必须调用海外 API 的功能要有超时、失败提示和手动录入兜底。
8. **地图瓦片**：OSM / Carto 瓦片在国内加载缓慢甚至超时。默认使用**天地图**（国家平台，免费申请浏览器端 key，国内 CDN 快且合规；其坐标系 CGCS2000 与 WGS-84 差异在米级以内，与本站库内坐标直接兼容，无需像高德/腾讯瓦片那样做 GCJ-02 换算）。保留 OSM/Carto 作为可切换备选；页面按要求展示地图来源标注。

### 1.7 前端设计系统与个性化原则

这个站永远只有一个用户，视觉上不必伪装成通用 SaaS 后台。第一版就把设计 token、字体、圆角、模块色和暗色模式打进地基，避免后续每个 Stage 都沿用 shadcn 默认灰蓝、默认圆角和默认字体。

**总体方向：对外编辑部 / 对内收藏册**

- **公开面（`/` 未登录、`/blog`、`/nav`、`/login`）**：走「编辑部」方向，像一本你主编的月刊。关键词是强排版、留白、克制的酒红点缀、富媒体当版面图。公开页回答"你是谁"。
- **私密面（登录后的 `/`、游戏、书影、旅行、消费、待办、日历、后台）**：走「收藏册」方向，像一本能继续填充的私人收藏册。关键词是温暖、圆润、模块色、徽章、封面墙、成就感。私密页回答"用得顺不顺手"。
- 两者使用同一套语义 token 命名，靠 route group 根节点 class 切换：`theme-public` 与 `theme-private`。暗色模式用 `html.dark` 叠加，不另起一套组件。

**实现约定**

- 采用 **Tailwind v4 的 CSS-first 配置**：`src/app/globals.css` 中 `@import "tailwindcss"`；语义变量（`--bg`、`--surface`、`--surface-2`、`--ink`、`--ink-2`、`--ink-3`、`--border`、`--primary`、`--accent`、`--radius-sm/md/lg/xl/pill`、`--module-*`）定义在 `.theme-public` / `.theme-private` 作用域下，再用 `@theme inline` 把变量映射为工具类（`bg-bg`、`bg-surface`、`text-ink-2`、`border-border`、`rounded-lg`、各模块色等）；暗色模式声明 `@custom-variant dark (&:where(.dark, .dark *))`，配合 next-themes 的 class 策略。**不再维护 v3 式的 tailwind.config 颜色映射，组件里禁止散写 hex。**
- 模块色集中放在 `src/lib/design.ts`，供 `StatusBadge`、日历、图表、统计徽章复用。
- 暗色模式从 Stage 0 开始接入 `next-themes`，策略为 `class`；Stage 2 的组件演示页必须同时验收亮色和暗色，并**抽查文字对比度（正文与次级文字 ≥ 4.5:1）**。
- **字体策略（写死，防止 AI 打包十几 MB 字体文件）**：西文字体（Fraunces / Source Serif 4 / Newsreader / Inter / Nunito / Space Grotesk）用 `next/font` 自托管全量，体积可控；**中文正文不打包 webfont**，直接系统字体栈回退（PingFang SC、HarmonyOS Sans SC、MiSans、Noto Sans CJK SC）；中文展示字体（标题用的得意黑 / 思源宋体）**只以子集形式自托管**——用 cn-font-split 之类工具按需切片，或仅收录常用 3500 字 + 站点实际用字。禁止运行时依赖 Google Fonts CDN。

**公开面 token（编辑部，亮色 / 暗色）**

| 用途 | 亮色 | 暗色 |
|---|---|---|
| 页面纸底 `--bg` | `#FAFAF7` | `#14130F` |
| 卡片面 `--surface` | `#FFFFFF` | `#1C1A15` |
| 主文字 `--ink` | `#1A1A18` | `#F4F1E8` |
| 次文字 `--ink-2` | `#57544E` | `#A8A296` |
| 弱文字 `--ink-3` | `#76726A` | `#8A847A` |
| 细线 `--border` | `#E5E2DA` | `#2E2A22` |
| 点缀 `--accent` | `#8C2F39` | `#C25B65` |

- 字体：标题用 Fraunces + 思源宋体子集（或霞鹜文楷子集）；正文长文用 Source Serif 4 / Newsreader + 系统中文衬线回退；UI、标签、数字用 Inter + 系统中文黑体。
- 圆角：`--radius-sm: 2px`、`--radius-md: 4px`、`--radius-lg: 8px`。媒体图可 6-8px，按钮与输入 4-6px。不要全 0 直角。

**私密面 token（收藏册，亮色 / 暗色）**

| 用途 | 亮色 | 暗色 |
|---|---|---|
| 页面底 `--bg` | `#FAF6F1` | `#1E1A16` |
| 卡片面 `--surface` | `#FFFFFF` | `#29231D` |
| 次级面 `--surface-2` | `#F3EDE4` | `#332B23` |
| 主文字 `--ink` | `#2B2622` | `#F2EAE0` |
| 次文字 `--ink-2` | `#6B6259` | `#B8ABA0` |
| 弱文字 `--ink-3` | `#776D63` | `#948878` |
| 描边 `--border` | `#E7DECF` | `#3D352B` |
| 主色 `--primary` | `#9A5B2D` | `#C98A4B` |

- 字体：标题用 Nunito + 得意黑（Smiley Sans，子集化）；正文用 Nunito + 系统中文黑体；大数字可用 Space Grotesk，统一开启 `tabular-nums`。
- 圆角：`--radius-sm: 8px`、`--radius-md: 12px`、`--radius-lg: 16px`、`--radius-xl: 24px`、`--radius-pill: 9999px`。卡片 16-24px，按钮和徽章走 pill 或 12-16px。

> 注：弱文字 `--ink-3` 与私密主色均已按正文 AA（对比度 ≥ 4.5:1）校正；自行改色后请用对比度工具复测。私密面主色取**焦糖棕**而非任何模块色——主操作（按钮、链接）与模块归属（徽章、图例）是两种语义，撞色会让界面难以阅读（初版的紫色主色与游戏模块色完全相同，已修正）。

**模块色**

| 模块 | 色值 | 用途 |
|---|---|---|
| 游戏 `games` | `#8A4FA0` | 封面墙强调、状态徽章、日历事件 |
| 书影 `media` | `#D08A1E` | 封面、评分、上映/出版日事件 |
| 旅行 `trips` | `#1F9E86` | 地图、足迹、行程条带 |
| 消费 `expenses` | `#D6537E` | 报表、分类强调、消费小部件 |
| 待办 `todos` | `#3B82C4` | 任务、优先级、日历事件 |
| 博客 `posts` | `#8C2F39` | 公开页链接、文章标签 |
| 导航 `links` | `#64748B` | 导航分组、favicon 回退 |
| 重要日子 `specialDays` | `#F59E0B` | 纪念日、生日、提醒 |

**设计原则**

1. 公开页靠字体层次、留白和一抹酒红建立气质，不堆卡片。
2. 私密页可以信息密度高，但要有收藏感：封面、地图、照片、徽章、统计数字都应成为视觉资产。
3. 空状态、加载态、报错文案要像人说话，不写"暂无数据"这类模板话；例如"今天没有待办 🎉"。
4. 封面、海报、旅行照片、地图优先做大，不要全部塞进同尺寸小卡片。
5. 禁止三类 AI 默认风：米色背景 + 高对比衬线大标题 + 陶土橙；近黑背景 + 荧光绿/朱红；报纸式细线分栏 + 零圆角。

---
## 2. 数据模型总览（Prisma Schema 参考）

> 各 Stage 的 Prompt 会引用本节。实际开发时按 Stage 增量添加模型并生成迁移，不要一次性建全。
>
> **v2 说明**：schema 与初版完全一致，唯一改动是 `Activity` 增加 `@@index([happenedAt])`（首页活动流按时间倒序查询的索引）。

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}

/// 键值配置：站点标题、个人简介、上次 Steam 同步时间等
model Setting {
  key   String @id
  value String
}

// ---------- 游戏 ----------
enum GameStatus { WISHLIST BACKLOG PLAYING FINISHED SHELVED } // 想玩/库存/在玩/已通关/搁置

model Game {
  id           String     @id @default(cuid())
  source       String     // "steam" | "manual"
  steamAppId   Int?       @unique
  name         String
  platform     String     // Steam / Switch / PS5 / Mobile / PC ...
  coverUrl     String?
  status       GameStatus @default(BACKLOG)
  rating       Int?       // 1-10
  playtimeMin  Int        @default(0)   // 总时长（分钟），Steam 同步
  playtime2w   Int        @default(0)   // 近两周时长（分钟），Steam 同步
  lastPlayedAt DateTime?
  reviewMd     String?    @db.Text
  tags         String[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

// ---------- 书影 ----------
enum MediaType   { BOOK MOVIE TV }
enum MediaStatus { WISHLIST DOING DONE DROPPED } // 想看/在看(读)/看(读)过/弃

model MediaItem {
  id            String      @id @default(cuid())
  type          MediaType
  title         String
  originalTitle String?
  creator       String?     // 作者 / 导演
  year          Int?
  coverUrl      String?
  doubanId      String?     @unique
  tmdbId        String?
  isbn          String?
  status        MediaStatus @default(WISHLIST)
  rating        Int?        // 1-10（豆瓣 5 星 ×2）
  startedAt     DateTime?   @db.Date
  finishedAt    DateTime?   @db.Date
  releaseDate   DateTime?   @db.Date    // 想看条目的上映/出版日，用于日历
  reviewMd      String?     @db.Text
  hasSpoiler    Boolean     @default(false)
  tags          String[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

// ---------- 旅行 ----------
enum TripStatus { PLANNED DONE }

model Trip {
  id           String     @id @default(cuid())
  title        String
  status       TripStatus @default(PLANNED)
  startDate    DateTime   @db.Date
  endDate      DateTime   @db.Date
  destinations String[]   // 城市名列表
  coverUrl     String?
  summaryMd    String?    @db.Text
  budget       Decimal?   @db.Decimal(12, 2)
  checklist    Json?      // [{ text, done }] 行前清单
  days         TripDay[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model TripDay {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  date      DateTime @db.Date
  noteMd    String?  @db.Text
  locations Json     @default("[]") // [{ name, lat, lng }]，WGS-84 坐标
  photos    String[] // 私密存储区的文件 key
  @@unique([tripId, date])
}

// ---------- 博客 ----------
enum PostStatus { DRAFT PUBLISHED }

model Post {
  id          String     @id @default(cuid())
  title       String
  slug        String     @unique
  contentMd   String     @db.Text
  summary     String?
  category    String?
  tags        String[]
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  views       Int        @default(0)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

// ---------- 消费 ----------
enum TxnDirection { EXPENSE INCOME NEUTRAL } // 支出/收入/不计收支

model Transaction {
  id            String        @id @default(cuid())
  platform      String        // "wechat" | "alipay" | "manual"
  txnTime       DateTime
  amount        Decimal       @db.Decimal(12, 2) // 恒为正数，方向看 direction
  direction     TxnDirection
  categoryId    String?
  category      ExpenseCategory? @relation(fields: [categoryId], references: [id])
  merchant      String?       // 交易对方
  item          String?       // 商品说明
  payMethod     String?
  txnNo         String?       // 平台交易单号，去重键
  note          String?
  importBatchId String?
  raw           Json?         // 账单原始行，便于排查
  createdAt     DateTime      @default(now())
  @@unique([platform, txnNo])
  @@index([txnTime])
}

model ExpenseCategory {
  id           String        @id @default(cuid())
  name         String        @unique
  icon         String?       // emoji 或 lucide 图标名
  keywords     String[]      // 自动分类关键词，命中 merchant/item 即归类
  sort         Int           @default(0)
  transactions Transaction[]
}

model ImportBatch {
  id        String   @id @default(cuid())
  platform  String
  filename  String
  total     Int
  inserted  Int
  skipped   Int
  createdAt DateTime @default(now())
}

// ---------- 待办与日历 ----------
model Todo {
  id        String    @id @default(cuid())
  content   String
  date      DateTime? @db.Date  // 为空表示"收集箱"，未安排日期
  priority  Int       @default(0) // 0 普通 / 1 重要 / 2 紧急
  done      Boolean   @default(false)
  doneAt    DateTime?
  createdAt DateTime  @default(now())
}

model SpecialDay {
  id           String   @id @default(cuid())
  title        String
  date         DateTime @db.Date
  yearlyRepeat Boolean  @default(true) // 生日纪念日每年重复；演出门票等一次性
  icon         String?
  note         String?
}

// ---------- 导航 ----------
model Link {
  id          String  @id @default(cuid())
  group       String  // 分组名
  title       String
  url         String
  icon        String? // 留空则自动取 favicon
  description String?
  sort        Int     @default(0)
}

// ---------- 活动流 ----------
model Activity {
  id         String   @id @default(cuid())
  module     String   // games / media / posts / trips ...
  action     String   // finished / published / done ...
  refId      String?
  title      String   // 展示文案，如「通关了《艾尔登法环》」
  happenedAt DateTime @default(now())
  @@index([happenedAt])
}
```

---

## 3. 分阶段实施

---

## 阶段一：地基（Stage 0 ~ 2）

### Stage 0 · 项目初始化

**目标**：本地可运行的空项目骨架——Next.js + Tailwind v4 + shadcn/ui + 自定义设计 token + Prisma 连上本地 Docker 里的 PostgreSQL，外加测试与质量检查脚本。

**实现要点**

- `create-next-app`：TypeScript、Tailwind、App Router、`src/` 目录、ESLint。**注意：当前 create-next-app 默认安装 Tailwind v4**，主题写法是 CSS-first（`@theme` + `@custom-variant dark`），不再有 `tailwind.config.ts` 的 `theme.extend`，不要按 v3 的旧资料配置。
- 初始化完成后立即建立**版本锁定**：项目根目录加 `.npmrc` 写入 `save-exact=true`；把实际装出来的 next / react / tailwindcss / next-auth / prisma / vitest 版本号回填到 AGENTS.md 的版本锁定表。`next-auth@beta` 必须锁精确版本（beta 各小版本间有破坏性变更）。
- `docker-compose.dev.yml` 只跑一个 `postgres:16` 容器（含数据 volume），开发时 `docker compose -f docker-compose.dev.yml up -d`。
- Prisma 初始化，本阶段只建 `User` 和 `Setting` 两个模型，跑第一次 `migrate dev`。
- shadcn/ui 初始化（用支持 Tailwind v4 的最新 CLI），先装 button、input、card、dialog、dropdown-menu、tabs、badge、sonner（toast）。
- 设计系统地基：安装 `next-themes`（暗色用 class 策略，配合 v4 的 `@custom-variant dark (&:is(.dark *))`）；`src/app/globals.css` 用 `@theme` / CSS 变量写入 1.7 节的 `theme-public` / `theme-private` 语义变量、暗色变量、圆角和模块色；`src/app/layout.tsx` 接入字体变量与 `ThemeProvider`。
- 字体加载必须走 `next/font` 或自托管文件，禁止运行时引用 Google Fonts CDN；按 1.7 节字体策略：正文中文走系统字体栈（不打包字体文件），标题展示字体后续以子集化文件接入，本阶段先把字体变量与 fallback 栈搭好。
- `src/lib/db.ts` 导出全局 PrismaClient 单例（dev 热重载防重复实例化）。
- dayjs 全局配置：zh-cn locale、utc + timezone 插件、默认时区 Asia/Shanghai，封装在 `src/lib/dayjs.ts`。
- **测试与质量脚本**：安装 Vitest；`package.json` 加 `"check": "tsc --noEmit && npm run lint && vitest run"`；写一个最小示例单测（如对 `src/lib/dayjs.ts` 的时区行为断言）保证测试链路通。后续每个 Stage 的完成定义都是 `npm run check` 全绿。
- 创建 `docs/PROGRESS.md`（模板见附录 B），作为跨会话的进度交接文件。
- `.env.example` 列出 1.5 节中 Stage 0/1 需要的变量；`.gitignore` 排除 `.env`。

**验收标准**

- [ ] `docker compose -f docker-compose.dev.yml up -d` 后 `npx prisma migrate dev` 成功
- [ ] `npm run dev` 打开首页无报错
- [ ] 首页已经使用自定义 token，而不是 shadcn 默认灰蓝；手动给 `<html>` 加 `dark` 后亮/暗变量都生效
- [ ] `npx prisma studio` 能看到 User、Setting 表
- [ ] `npm run check` 全绿（类型 + lint + 示例单测）
- [ ] `.npmrc` 含 `save-exact=true`，AGENTS.md 版本锁定表已回填真实版本号
- [ ] `docs/PROGRESS.md` 已创建并记录 Stage 0 完成
- [ ] `git init` 完成且 `.env` 不在版本控制内

**Vibe Coding Prompt**

```text
请阅读仓库根目录的 AGENTS.md 和 docs/PLAN.md 的第 1、2 节，然后初始化这个项目（PLAN.md 中的 Stage 0）：

1. 用 create-next-app 创建 Next.js 项目（TypeScript + Tailwind + App Router + src 目录 + ESLint），项目就建在当前目录。注意：当前版本默认是 Tailwind v4，主题配置走 CSS-first（@theme），不要写 v3 式 tailwind.config.ts。
2. 在项目根目录创建 .npmrc 写入 save-exact=true；之后所有依赖都锁精确版本。
3. 创建 docker-compose.dev.yml：仅包含 postgres:16 服务，数据持久化到命名 volume，端口 5432，库名/用户/密码均为 personal_site。
4. 初始化 Prisma，schema 中只添加 PLAN.md 第 2 节里的 User 和 Setting 两个模型，配置 DATABASE_URL 指向上述本地库，执行第一次 migrate dev。
5. 初始化 shadcn/ui（使用支持 Tailwind v4 的最新 CLI），安装 button、input、card、dialog、dropdown-menu、tabs、badge、sonner 组件；安装 next-themes，暗色策略用 class（v4 写法：@custom-variant dark）。
6. 按 PLAN.md 1.7 节建立设计系统地基：在 src/app/globals.css 用 @theme 与 CSS 变量写入 theme-public / theme-private 的语义变量、暗色变量、圆角刻度和模块色；在 src/app/layout.tsx 接入字体变量并包上 ThemeProvider。字体策略按 1.7 节执行：正文中文用系统字体栈，西文用 next/font 自托管，禁止运行时加载 Google Fonts CDN。
7. 创建 src/lib/db.ts（PrismaClient 全局单例，避免开发热重载时重复实例化）；安装并配置 dayjs（zh-cn locale + utc + timezone 插件，默认时区 Asia/Shanghai），封装在 src/lib/dayjs.ts。
8. 安装 Vitest，在 package.json 添加 "check": "tsc --noEmit && npm run lint && vitest run"，并为 src/lib/dayjs.ts 写一个最小单测（断言时区与格式化行为）跑通测试链路。
9. 创建 .env.example（DATABASE_URL、AUTH_SECRET、ADMIN_USERNAME、ADMIN_PASSWORD），确认 .gitignore 包含 .env。
10. 创建 docs/PROGRESS.md（按 PLAN.md 附录 B 的模板）；把 README.md 写成最小启动说明（启动数据库、迁移、npm run dev 三步），并补一句说明：主题 token 在 Stage 0 已接入，后续组件不得散写 hex。最后把实际安装的 next / react / tailwindcss / prisma / vitest 版本号回填到 AGENTS.md 的版本锁定表。

约定：后续所有界面文案使用中文。先列出你的实施计划等我确认，再开始执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再告诉我如何验证。
```

---

### Stage 1 · 认证与权限框架

**目标**：单用户登录可用；全站默认私密，公开路由白名单生效。

**实现要点**

- Auth.js v5（`next-auth@beta`，**版本已在 Stage 0 锁定，不要随手升级**）Credentials Provider，用 bcrypt 校验数据库中的密码哈希；JWT session，有效期 30 天。
- `scripts/seed.ts`：从 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 创建唯一账号（存 bcrypt 哈希），重复执行幂等。
- `src/middleware.ts` 白名单：`/login`、`/`、`/blog` 及其子路由、`/nav`、`/rss.xml`、`/uploads/**`（公开静态文件，Stage 5 起有内容，**现在就要加进白名单**，否则匿名访客看博客图片会被 302 到登录页）、`/api/auth/**`、`/api/health`、`/api/posts/view`（Stage 5 启用的浏览量上报）、`/api/quick/**`（Stage 13 启用的快捷记账，靠自身 Bearer Token 鉴权）、`/_next/**`、favicon 等静态资源；其余未登录一律 302 到 `/login?from=原路径`。
- 路由分组：`(public)` 与 `(private)` 两个 route group，private 的 `layout.tsx` 里再做一次服务端 session 校验（双保险）。
- 登录页：使用 `theme-public` 的编辑部风格，居中卡片、用户名 + 密码、错误提示；登录失败做最简限流（内存 Map 记录 IP 失败次数，5 次后锁 15 分钟）。
- `/api/health` 返回 `{ ok: true }`，给部署健康检查用。

**验收标准**

- [ ] seed 后能用环境变量里的账号登录，登录后跳回 `from` 路径
- [ ] 未登录访问 `/todos` 被重定向到登录页；访问 `/nav`、`/blog` 不需要登录
- [ ] 白名单中已包含 `/uploads/**` 与 `/api/quick/**`（即使现在还没有内容，写进去并加注释说明启用 Stage）
- [ ] 退出登录功能正常
- [ ] 连续输错密码 5 次后被暂时锁定
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 第 1 节和 Stage 1，为项目实现认证与权限框架：

1. 集成 Auth.js v5（next-auth@beta，版本以 AGENTS.md 锁定表为准，不要升级）Credentials Provider：bcrypt 校验 User 表中的密码哈希，JWT session 30 天，配置文件放 src/auth.ts。
2. 编写 scripts/seed.ts：读取 ADMIN_USERNAME / ADMIN_PASSWORD 环境变量，幂等地创建唯一管理员（密码存 bcrypt 哈希）；在 package.json 加 "db:seed" 脚本。
3. 实现 src/middleware.ts：默认全部路由要求登录；白名单为 /login、/、/blog 及子路由、/nav、/rss.xml、/uploads（公开静态文件，Stage 5 起有内容）、/api/auth、/api/health、/api/posts/view（Stage 5 启用）、/api/quick（Stage 13 启用，自带 Token 鉴权）与 Next 静态资源。未登录访问受保护页面时重定向到 /login?from=原路径。每个白名单条目加一行注释说明用途与启用 Stage。
4. 创建 (public) 与 (private) 两个 route group；(private)/layout.tsx 中再次服务端校验 session，未登录直接 redirect（双保险）。
5. 登录页 /login：使用 theme-public 的编辑部 token，居中卡片表单（shadcn 组件），中文文案，错误提示，登录成功跳回 from；对登录接口做内存级限流（同 IP 失败 5 次锁 15 分钟）。
6. 在 (private) 下建一个临时页面 /todos 显示"待办（建设中）"用于验证保护是否生效；实现退出登录；新增 /api/health 返回 { ok: true }。

注意：这是单用户系统，不要做注册功能。先给出实施计划等我确认再动手；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再列出自测步骤。
```

---

### Stage 2 · 整体布局与通用组件

**目标**：登录后的统一外壳（侧边栏 + 移动端适配）与一批后续模块复用的通用组件，并把 1.7 节的设计系统落到真实 UI。

**实现要点**

- `(private)` 布局：根节点使用 `theme-private`。桌面端左侧固定侧边栏（仪表盘 / 待办 / 日历 / 游戏 / 书影 / 旅行 / 消费 / 博客管理 / 导航管理 / 设置，lucide 图标），底部退出登录与主题切换；移动端收起为汉堡抽屉，整体适配 375px 宽度。待办与记账以后主要在手机上用，移动端体验是硬要求。
- `(public)` 布局：根节点使用 `theme-public`。极简顶栏（站点名 / 博客 / 导航 / 登录入口），公开页优先体现编辑部的排版、留白和酒红点缀。
- `src/lib/design.ts`：集中导出模块色、状态色、徽章样式辅助函数，禁止组件各自散写模块色 hex。
- 通用组件（`src/components/`）：
  - `PageHeader`（标题 + 描述 + 右侧操作区）
  - `EmptyState`（空状态插画位 + 人话文案 + 行动按钮，禁止默认写"暂无数据"）
  - `ConfirmDialog`（危险操作二次确认）
  - `TagInput`（输入回车成 chip，可删除——游戏/书影/博客共用）
  - `StatusBadge`（按状态枚举映射颜色文案的小徽章，颜色来自 `src/lib/design.ts`）
  - `RatingStars`（10 分制，显示为 5 星支持半星，可编辑/只读两态）
  - `MarkdownEditor`（编辑/预览双 Tab 的 textarea，工具栏可后续增强）
  - `MarkdownRenderer`（react-markdown + remark-gfm + rehype-pretty-code/Shiki，暗色友好的代码高亮，外链 target=_blank）
- playground 演示页要新增一块**对比度样例区**：两主题 × 亮暗共四种组合下，把 `--ink` / `--ink-2` / `--ink-3` 与 `--primary` 各排一行示例文字（含 14px 小字号），用于人工核对可读性。
- 这一步只搭壳子和组件，不实现业务。

**验收标准**

- [ ] 登录后看到侧边栏布局，所有入口可点击（指向占位页）
- [ ] 375px 宽度下侧边栏变为抽屉，操作流畅
- [ ] 写一个临时演示页渲染全部通用组件，逐个检查；MarkdownRenderer 中代码块有语法高亮
- [ ] 演示页能同时看到亮/暗模式、公开面/私密面 token 差异，StatusBadge 与模块色一致
- [ ] 对比度样例区四种组合下 `--ink-3` 小字与 `--primary` 链接色肉眼清晰可读（可抽查跑一次对比度工具，应 ≥ 4.5:1）
- [ ] 公开布局在 /nav 占位页上生效，视觉上不是默认 shadcn 灰蓝风
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 2，实现整体布局与通用组件：

1. (private) 布局：根节点加 theme-private；桌面端左侧固定侧边栏，菜单项为 仪表盘/、待办/todos、日历/calendar、游戏/games、书影/media、旅行/trips、消费/expenses、博客管理/admin/posts、导航管理/admin/links、设置/admin/settings，使用 lucide-react 图标，高亮当前路由，底部放退出登录与亮/暗/跟随系统主题切换；移动端（<768px）侧边栏收为汉堡抽屉。为每个菜单项创建中文占位页。整体必须在 375px 宽度下可用。
2. (public) 布局：根节点加 theme-public；极简顶栏（站点名、博客、导航、右侧登录/进入后台按钮），使用编辑部 token：克制留白、一抹酒红，不要默认 shadcn 灰蓝。
3. 新建 src/lib/design.ts，集中导出 moduleColors、statusColorMap、getModuleColor 等工具，颜色来源必须对应 PLAN.md 1.7 的模块色。
4. 在 src/components/ 下实现并导出以下通用组件，全部中文文案：PageHeader、EmptyState（人话文案，禁止默认"暂无数据"）、ConfirmDialog、TagInput（回车添加 chip、可删除、受控组件）、StatusBadge（接收枚举值与颜色映射，默认使用 design.ts）、RatingStars（10 分制显示为 5 星半星，editable 与 readonly 两态）、MarkdownEditor（编辑/预览双 Tab）、MarkdownRenderer（react-markdown + remark-gfm + rehype-pretty-code，代码高亮，外链新窗口打开）。
5. 新建临时页面 /admin/playground，把上述组件全部渲染一遍便于我验收；页面要能检查亮/暗模式、公开面/私密面 token、模块色徽章和 MarkdownRenderer；并增加一块对比度样例区：在 theme-public/theme-private × 亮/暗四种组合下分别渲染 --ink、--ink-2、--ink-3、--primary 的示例文字（含 14px 小字），方便我人工核对弱文字与链接色的可读性（该页面后续会删除）。

不要实现任何业务逻辑。先列实施计划确认后再写；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再说明验收方式。
```

---

## 阶段二：三个简单模块 + 上线（Stage 3 ~ 6）

### Stage 3 · 导航页

**目标**：公开的导航收藏页 + 登录后的管理界面。最简单的模块，用来打通「建模型 → Server Action → 页面」全流程。

**实现要点**

- `Link` 模型迁移；`src/modules/links/` 下 `queries.ts`（公开读取，按 group + sort 排序）与 `actions.ts`（增删改、排序，均校验 session）。
- 公开页 `/nav`：使用 `theme-public`，按分组渲染卡片（favicon + 标题 + 描述），点击新窗口打开；顶部本地搜索框即时过滤；favicon 留空时由服务端抓取目标站点 favicon 并缓存到 public 上传区，失败回退为首字母色块，避免依赖 Google s2 等国内不可稳定访问的服务。
- favicon 抓取需要落盘，因此本阶段先建一个**最小版** `src/lib/storage.ts`：只实现 `saveFromUrl(url, subdir)`（下载远程文件 → 存入 public 上传区 → 返回本地 `/uploads/...` 路径），Stage 5 再扩展成完整存储模块（sharp 处理、私密区等）。注释里写明这一点，避免 Stage 5 的 AI 重复造轮子。
- 管理页 `/admin/links`：表格 + 新增/编辑 Dialog；分组内拖拽排序（dnd-kit），松手即保存。
- 登录状态下访问 `/nav` 时，卡片角落显示编辑入口（可选增强）。

**验收标准**

- [ ] 未登录可正常浏览 `/nav`，搜索过滤即时生效
- [ ] 新增/编辑/删除链接生效，favicon 自动显示且文件落在 public 上传区，失败有回退
- [ ] 拖拽排序后刷新页面顺序保持
- [ ] 手机宽度下卡片单列/双列布局正常
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 3，实现导航模块：

1. 在 Prisma schema 中加入 PLAN.md 第 2 节的 Link 模型并迁移；创建 src/modules/links/queries.ts（公开读取，按 group + sort 排序）与 actions.ts（新增、编辑、删除、批量排序，全部校验登录 session）。
2. 公开页 /nav：theme-public 风格，按分组渲染链接卡片（favicon + 标题 + 描述），点击新窗口打开；顶部搜索框对标题/描述/分组即时本地过滤；空状态用人话文案。
3. 创建最小版 src/lib/storage.ts：实现 saveFromUrl(url, subdir)——服务端下载远程文件、按内容类型生成文件名、保存到 public 上传区、返回 /uploads/ 开头的本地路径。favicon 抓取走这个函数：当链接未填 icon 时，服务端尝试抓取目标站点的 favicon（解析 html link 标签或 /favicon.ico）并缓存为本地文件，把本地路径存进 icon 字段；抓取失败时回退为首字母色块。不要依赖 Google s2 等第三方 favicon 服务。在文件头注释写明：这是最小版，Stage 5 会扩展成完整存储模块。
4. 管理页 /admin/links：表格列出全部链接，新增/编辑用 Dialog 表单（分组、标题、URL、图标、描述），删除需 ConfirmDialog 确认；分组内用 dnd-kit 实现拖拽排序，松手即调用排序 action 保存。
5. 所有写操作完成后 revalidate 公开页 /nav，保证匿名访客看到最新内容。

先列实施计划确认后再写；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给出验收清单。
```

---

### Stage 4 · 待办模块

**目标**：日常可用的待办管理——三栏视图、快速添加、逾期顺延，移动端体验优先。

**实现要点**

- `Todo` 模型迁移；`src/modules/todos/` 的 queries 与 actions。
- `/todos` 三个分区：**今天**（含逾期，逾期单独标红显示"逾期 N 天"）、**收集箱**（date 为空）、**未来 7 天**（按日分组）。
- 顶部快速添加输入框：默认加进"今天"，支持在输入框左侧切换目标（今天/收集箱/指定日期）；回车即添加，添加后输入框保持焦点（连续录入）。
- 行内操作：勾选完成（记录 doneAt，完成项沉底显示删除线）、改优先级（0/1/2 三档，颜色用待办模块色的深浅）、改日期（Popover 日历）、删除。
- 逾期处理：未完成且 date < 今天的待办自动出现在"今天"分区顶部，并提供"顺延到今天"批量按钮。
- "今天"分区空状态显示"今天没有待办 🎉"。
- 所有日期判断基于 dayjs UTC+8 的"今天"，写一组最小单测覆盖逾期判定与顺延（跨日边界：昨天 23:59 创建的待办今天应判逾期；顺延后 date 应为今天）。

**验收标准**

- [ ] 快速添加连续录入流畅，手机上键盘不遮挡输入框
- [ ] 勾选完成、改优先级、改日期、删除全部生效且即时反馈
- [ ] 把一条待办日期改成昨天，它出现在"今天"的逾期区，"顺延到今天"生效
- [ ] 未来 7 天分组正确，跨月份边界无错乱
- [ ] 逾期判定与顺延的单测通过（含跨日边界用例）
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 4，实现待办模块：

1. 在 schema 中加入 Todo 模型并迁移；创建 src/modules/todos/ 的 queries.ts 与 actions.ts（添加、勾选完成/取消、改优先级、改日期、删除、批量顺延，均校验 session）。
2. /todos 页面分三个分区：今天（含逾期项，逾期单独标红并显示"逾期 N 天"，分区顶部提供"全部顺延到今天"按钮）、收集箱（date 为空的项）、未来 7 天（按日分组显示）。
3. 顶部快速添加：输入框 + 目标切换（今天/收集箱/选日期），回车添加并保持输入框焦点以便连续录入；移动端注意键盘遮挡问题。
4. 每条待办行内支持：勾选完成（done + doneAt，完成项删除线沉底）、切换优先级（0/1/2，用待办模块色 #3B82C4 的不同深浅）、Popover 改日期、删除。
5. 所有"今天"的判断必须使用 src/lib/dayjs.ts 的 UTC+8 逻辑，不要用浏览器本地时间或 new Date() 直接比较。
6. 为逾期判定与顺延逻辑编写最小 Vitest 单测：覆盖"昨天创建未完成今天算逾期""跨月边界""顺延后日期等于今天（UTC+8）"三类用例。

完成定义：npm run check 全绿。先列实施计划确认后再写；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给出验收清单。
```

---

### Stage 5 · 博客模块 + 文件存储

**目标**：完整的写作与阅读体验：管理端写 Markdown，公开端是体面的编辑部风格博客；同时建立全站统一的文件存储模块（含图片处理管线）。

**实现要点**

- `Post` 模型迁移。
- **完整版 `src/lib/storage.ts`**（扩展 Stage 3 的最小版）：本地磁盘存储，统一管理 `UPLOAD_DIR` 下的 `public/`（博客图、封面——可被匿名访问）与 `private/`（旅行照片等——仅登录可见）两个区；提供 `save(buffer | url, { area, subdir })` 与 `saveFromUrl` 等接口。
- **图片处理管线（内置在 storage 保存流程中，用 sharp）**：
  1. `rotate()` 按 EXIF 方向旋正（解决手机照片"躺倒"）；
  2. 长边 > 2000px 等比压缩；
  3. 重编码为 jpeg/webp（质量约 82）——重编码本身即丢弃 EXIF/GPS 等隐私元数据；
  4. 额外生成 480px 缩略图，返回 `{ url, thumbUrl }`。
  - 仅允许 jpeg/png/webp/gif 上传，**拒绝 svg**（防 XSS）；非图片文件（如未来的附件）原样存储。
- `/api/upload`：登录校验，multipart 接收，调用 storage 保存，返回 `{ url, thumbUrl }`。
- `GET /uploads/[...path]` 路由：**只回 public 区**文件，带长缓存头，防路径穿越（解析后必须仍在 public 区内）；private 区文件走 Stage 14 的专门路由。中间件白名单在 Stage 1 已放行 `/uploads/**`，本阶段务必回归确认：**无痕窗口（未登录）直接访问一张博客图片 URL 必须返回图片而不是 302**。
- 管理端 `/admin/posts`：列表（状态筛选/搜索）+ 编辑页。编辑页：标题、slug（自动从标题生成拼音或 `post-时间戳`，可手改）、分类、标签（TagInput）、摘要、MarkdownEditor 正文；支持在编辑器里**粘贴图片直接上传**并插入 Markdown；保存草稿 / 发布 / 撤回 / 删除。
- **缓存纪律**：公开博客列表页与详情页做静态渲染；发布/撤回/编辑已发布文章后必须 `revalidatePath('/blog')` 与对应详情页路径。
- 公开端 `/blog`：文章列表（标题、日期、摘要、分类标签），分页或"加载更多"；`/blog/[slug]` 详情页编辑部风格排版：大标题、正文最大宽度约 68ch、目录（TOC，桌面端右侧悬浮）、上一篇/下一篇；草稿不可见（直接 404）。
- **浏览量**：详情页不在服务端自增（会破坏静态缓存），改为客户端挂载后 `navigator.sendBeacon('/api/posts/view', { slug })` 上报，服务端对该接口做去抖（同 IP 同文章短时间只记一次即可，不必精确）。该接口已在 Stage 1 加入白名单。
- `/rss.xml`：最近 20 篇已发布文章。

**验收标准**

- [ ] 新建草稿 → 预览 → 发布全流程顺畅；公开列表与详情立即可见（revalidate 生效）
- [ ] 撤回后公开端 404，管理端仍可编辑
- [ ] 编辑器内粘贴图片成功上传并插入，公开页图片正常显示
- [ ] **无痕窗口直接打开一张博客图片 URL，返回图片本体而非跳登录页**（白名单回归点）
- [ ] 上传一张带 GPS 的手机竖拍照片：显示方向正确、用工具查看文件已无 EXIF/GPS、存在 480px 缩略图
- [ ] 上传 svg 被拒绝并有中文提示
- [ ] 详情页打开后浏览量 +1（sendBeacon 生效），刷新不重复疯涨
- [ ] 代码块语法高亮、TOC 跳转正常，移动端阅读体验良好
- [ ] RSS 能被阅读器订阅
- [ ] 重启 dev server 后已上传图片仍可访问（落盘而非内存）
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 5，实现博客模块与文件存储：

1. 在 schema 中加入 Post 模型并迁移。
2. 把 Stage 3 的最小版 src/lib/storage.ts 扩展为完整存储模块：UPLOAD_DIR 下分 public/ 与 private/ 两区；提供 save 与 saveFromUrl；内部用 sharp 实现图片管线——rotate() 按 EXIF 旋正、长边超 2000px 等比压缩、重编码 jpeg/webp 质量 82（顺带丢弃 EXIF/GPS 隐私元数据）、额外生成 480px 缩略图，返回 { url, thumbUrl }；只允许 jpeg/png/webp/gif，明确拒绝 svg 并返回中文错误。
3. 实现 POST /api/upload（登录校验，multipart，调 storage，返回 { url, thumbUrl }）与 GET /uploads/[...path]（只服务 public 区，长缓存头，防路径穿越）。回归确认 Stage 1 中间件白名单已放行 /uploads/**：未登录直接访问图片 URL 必须返回图片而非 302。
4. 管理端 /admin/posts：列表页（状态筛选、标题搜索）+ 编辑页（标题、slug 自动生成可手改、分类、TagInput 标签、摘要、MarkdownEditor 正文、粘贴图片自动上传插入）；操作：存草稿、发布、撤回、删除（ConfirmDialog）。发布/撤回/更新已发布文章后调用 revalidatePath 刷新 /blog 与对应详情页。
5. 公开端：/blog 列表（编辑部风格：标题、日期、摘要、分类标签，分页）；/blog/[slug] 详情（大标题、正文 68ch、桌面右侧 TOC、上一篇/下一篇、草稿 404）。列表与详情按静态渲染处理。
6. 浏览量：详情页客户端挂载后用 navigator.sendBeacon 向 POST /api/posts/view 上报 slug，服务端自增 views 并做同 IP 短时去抖；不要在服务端渲染时自增。
7. 实现 /rss.xml 输出最近 20 篇已发布文章。

先列实施计划确认后再写；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给出验收清单（务必包含无痕窗口访问图片、EXIF 清除、缩略图三项检查）。
```

---
### Stage 6 · 部署上线与备份

**目标**：网站以 HTTPS 跑在已备案域名上；push 代码先过质量门再自动部署到国内云服务器；每日自动**加密**备份到国内对象存储，且备份与定时任务都有心跳监控。

**前置准备（手动）**：

- 购买国内云服务器（2GB 内存起步，Ubuntu LTS，装好 Docker 与 Docker Compose 插件），建议同时购买一块可扩容云盘用于 `/data`。
- 域名与 ICP 备案：按 §0 的建议，备案应该在 Stage 0 当天就已发起，到这一步通常已通过或接近通过。备案通过前不要把正式域名长期解析到国内服务器。
- 在云厂商控制台配置安全组：公网只放行 80/443；SSH 22 端口限制来源 IP；PostgreSQL 不开放公网端口。
- 创建国内对象存储 bucket（阿里云 OSS / 腾讯云 COS / 华为云 OBS 等）与最小权限访问密钥，用于备份。
- 创建国内容器镜像仓库（阿里云 ACR / 腾讯云 TCR / 华为云 SWR 等）。如果暂时不想用 registry，也可以在服务器上 `git pull` 后本地 `docker compose build`，但自动化速度和可回滚性会差一些。
- 注册 [healthchecks.io](https://healthchecks.io)（或自建实例），创建两个 check：**每日备份**、**Steam 同步**（Stage 8 用），把 ping URL 填入 `HEALTHCHECKS_BACKUP_URL` / `HEALTHCHECKS_STEAM_URL`。定时任务静默失败是个人项目最常见的暗病，心跳监控是治它的唯一便宜药。
- GitHub 仓库配置 Secrets（SSH 私钥、服务器 IP、registry 地址、registry 用户名/密码、对象存储密钥等）。

**实现要点**

- `Dockerfile`：多阶段构建，`next.config.js` 开 `output: "standalone"`，最终镜像仅含 standalone 产物 + prisma 迁移文件；入口脚本先 `prisma migrate deploy` 再启动。**注意 sharp 含原生二进制**：standalone 输出有时不会带全 sharp 的平台二进制，构建后必须验证镜像内图片处理可用，必要时在运行阶段单独 `npm install sharp`。
- `docker-compose.prod.yml`：`app`（env_file 注入环境变量，挂载 uploads volume 到 `/data/uploads`，`TZ=Asia/Shanghai`）、`postgres`（数据 volume）、`caddy`（80/443，挂 Caddyfile 与证书 volume，**并把 uploads 卷以只读方式挂给 caddy**）。
- `Caddyfile`：已备案域名 → 默认 `reverse_proxy app:3000`，自动 HTTPS；**新增**：`handle_path /uploads/*` 直接 `file_server` 服务 uploads 卷的 public 区并配长缓存头——公开图片让 Caddy 直出，不必每张都穿过 Node；私密文件仍走 app 的鉴权路由（Stage 14）。确保安全组和系统防火墙同时放通 80/443。
- **CI 质量门**：GitHub Actions 拆两个 job——`quality`（`npm ci` + `npm run check`）先跑，绿了才进入 `build & push`（构建镜像推到国内容器镜像服务）→ SSH 到服务器执行 `docker compose pull && docker compose up -d`。如果不用 registry，则改为 SSH 后 `git pull && docker compose build && docker compose up -d`。**质量门挡住的是"AI 改坏了但本地没察觉就 push"这类事故。**
- 公开页页脚：展示 `ICP_BEIAN_NO`；如已办理公安联网备案，同时展示 `GONGAN_BEIAN_NO`。
- `scripts/backup.sh`：`pg_dump | gzip` + `tar` 打包 uploads → `rclone copy` 到国内对象存储，**远端必须配置为 rclone `crypt` 加密远端**（个人账单、行程、照片是高敏数据，不能明文躺在对象存储里）；按日期命名，保留最近 30 份（远端清理）；脚本末尾按成败 ping `HEALTHCHECKS_BACKUP_URL`（失败 ping `/fail`）；写入宿主机 crontab 每天 4:00 执行。
- **Playwright 冒烟测试**：装 Playwright，写 `e2e/smoke.spec.ts` 三条用例——`/api/health` 返回 200、**匿名访问 `/blog` 不被重定向**（白名单回归）、登录后能进 `/todos`。用 `BASE_URL` 环境变量驱动，本地与上线后都能跑；`package.json` 加 `"e2e": "playwright test"`。
- 上线后立刻演练一次恢复：从加密备份在本地把库 restore 出来确认可用。**没验证过的备份等于没有备份；没验证过解密的加密备份更危险——可能连自己都打不开。**

**验收标准**

- [ ] 域名 ICP 备案/接入备案已通过，公开页页脚展示备案号
- [ ] `https://你的域名` 可访问，HTTP 自动跳 HTTPS
- [ ] 登录、发文章、传图片、/nav 全部正常；服务器重启后数据与图片仍在
- [ ] **线上传一张图**确认 sharp 在容器内可用（缩略图生成成功）
- [ ] 公开图片由 Caddy 直出（响应头无 Next 痕迹 / 看 caddy 日志确认）
- [ ] 故意提交一个类型错误到分支：CI 的 quality job 红灯并阻断部署；修复后 push main，几分钟后线上自动更新
- [ ] 对象存储中出现当日备份且**为加密文件（直接下载打不开）**；本地用 rclone crypt 配置恢复演练成功
- [ ] Healthchecks 面板能看到备份心跳；手动把脚本改错一次，确认收到失败告警后改回
- [ ] `npm run e2e` 三条冒烟全过（本地与线上各跑一次）
- [ ] 云服务器安全组仅开放必要端口，PostgreSQL 端口未暴露到公网

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 6，为项目准备生产部署，目标环境是一台已装 Docker 的国内云服务器：

1. 编写多阶段 Dockerfile：next.config 开启 output standalone；最终镜像包含 standalone 产物、prisma 目录与迁移文件；容器入口脚本先执行 prisma migrate deploy 再启动 node server.js。注意 sharp 的原生二进制在 standalone 模式下可能缺失，请在 Dockerfile 中处理（必要时运行阶段单独安装 sharp），并告诉我如何在容器内验证。
2. 编写 docker-compose.prod.yml：app（从国内容器镜像仓库拉镜像，env_file 为 .env.production，挂载 uploads 命名卷到 /data/uploads，TZ=Asia/Shanghai）、postgres:16（数据卷，仅 Docker 内网访问）、caddy:2（80/443 端口，挂载 Caddyfile 与 caddy 数据卷，并把 uploads 卷以只读方式挂载进来）。提供 .env.production.example，包含 ICP_BEIAN_NO、GONGAN_BEIAN_NO、BACKUP_REMOTE、HEALTHCHECKS_BACKUP_URL、HEALTHCHECKS_STEAM_URL 等变量。
3. 编写 Caddyfile：{我的已备案域名} 默认反向代理到 app:3000，自动 HTTPS；增加 handle_path /uploads/* 规则，由 Caddy 直接 file_server 服务 uploads 卷中 public 区的文件并设置长缓存头（私密文件不经此路径，仍由 app 鉴权后返回）。文档里提醒安全组和系统防火墙必须放通 80/443。
4. 编写 GitHub Actions 工作流，拆成两个 job：quality（checkout、npm ci、npm run check，失败则整个流程终止）→ build-and-deploy（构建镜像推送到国内容器镜像服务，然后通过 SSH（secrets：SSH_KEY、SERVER_HOST、SERVER_USER）在服务器部署目录执行 docker compose pull 和 up -d）；如 registry 信息未配置，文档中给出服务器本地 build 的备选流程。
5. 编写 scripts/backup.sh：对 postgres 容器执行 pg_dump 并 gzip，打包 uploads 卷，用 rclone copy 上传到对象存储——远端必须是 rclone crypt 加密远端（在 docs/DEPLOY.md 给出 OSS/COS/OBS 任选一种 + crypt 包装的完整 rclone.conf 示例）；文件名含日期，清理远端 30 天前的旧备份；脚本最后根据成败 curl HEALTHCHECKS_BACKUP_URL（失败时 ping 其 /fail 端点）。给出宿主机 crontab 配置行（每天 04:00）。
6. 在公开布局页脚展示 ICP_BEIAN_NO；如 GONGAN_BEIAN_NO 不为空也展示公安联网备案号。
7. 安装 Playwright，编写 e2e/smoke.spec.ts 三条冒烟用例：GET /api/health 返回 200；匿名访问 /blog 返回 200 且未被重定向到 /login；使用测试账号登录后能访问 /todos。基础地址从 BASE_URL 环境变量读取，package.json 加 "e2e" 脚本。
8. 在 docs/DEPLOY.md 写一份从零部署手册：ICP 备案时间线说明、服务器初始化、安全组、rclone crypt 配置、Healthchecks 配置、首次部署、域名解析、查看日志、手动回滚、备份恢复演练的完整步骤。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md。我会按 DEPLOY.md 实际操作，请确保步骤可照做。
```

---

## 阶段三：游戏与书影（Stage 7 ~ 10）

### Stage 7 · 游戏模块（手动管理）

**目标**：游戏库的完整手动管理——封面墙、状态/平台/标签筛选、详情与感想。Steam 同步下一步再接。

**实现要点**

- `Game` 模型迁移。
- `/games` 主页：私密面收藏册风格，封面图是主角。封面网格（封面图 + 名称 + 平台角标 + 状态徽章 + 评分）；顶部筛选条：状态 Tab（全部/想玩/库存/在玩/已通关/搁置，带计数）、平台下拉、标签多选、名称搜索；排序：最近游玩 / 评分 / 名称。顶部一行统计做成彩色徽章（总数、已通关数、总时长换算小时）。
- 手动添加 Dialog：名称、平台、封面（URL 或上传到 public 区）、状态、评分（RatingStars）、时长（小时输入，存分钟）、标签、备注。
- 详情（Dialog 或独立页）：全部字段可编辑 + `MarkdownEditor` 写感想；状态改为"已通关"时若 rating 为空给个温和提示。
- 状态流转按钮做显眼一点（想玩 → 在玩 → 已通关 是高频操作）。

**验收标准**

- [ ] 手动添加含封面的游戏，出现在封面墙
- [ ] 各筛选维度可组合，计数正确
- [ ] 详情内修改状态/评分/感想即时保存
- [ ] 手机宽度封面墙两列显示正常
- [ ] 封面墙、状态徽章和统计数字使用收藏册 token 与游戏模块色
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 7，实现游戏模块的手动管理部分：

1. 添加 Game 模型（见 PLAN.md 第 2 节，含 GameStatus 枚举）并 migrate。
2. /games 主页：使用 theme-private 的收藏册风格，响应式封面网格（桌面 4-5 列、手机 2 列），封面图尽量做大，卡片含封面、名称、平台角标、StatusBadge、评分；无封面时显示游戏名首字的模块色占位块。顶部：状态 Tab（含各状态计数）、平台下拉筛选、标签多选筛选、名称搜索、排序切换（最近游玩/评分/名称）；再加一行统计，做成游戏模块色的彩色徽章：总数、已通关数、总时长（分钟换算为小时）。
3. 手动添加 Dialog：名称（必填）、平台（可输入的下拉：Steam/Switch/PS5/Xbox/Mobile/PC，支持自定义）、封面（填 URL 或调用已有上传接口传到 public 区）、状态、评分（RatingStars）、已玩时长（小时，存库转分钟）、标签（TagInput）、备注；source 固定为 manual。
4. 游戏详情 Dialog：展示并可编辑全部字段，感想用 MarkdownEditor；提供快捷状态流转按钮（想玩→在玩→已通关）。
5. 模块逻辑放 src/modules/games/（queries.ts 与 actions.ts，action 校验 session）。

筛选与排序通过 URL searchParams 实现以便分享/刷新保持。先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给验收清单。
```

---

### Stage 8 · Steam 同步

**目标**：一键 / 每日自动同步 Steam 游戏库与时长，且**永不覆盖手动填写的主观数据**；同步任务接入心跳监控。

**前置准备（手动）**：在 steamcommunity.com/dev 申请 Web API Key；查到自己的 SteamID64（17 位数字）；Steam 个人资料 → 隐私设置 → **"游戏详情"设为公开**（否则 API 返回空列表）。Healthchecks 的 Steam 同步 check 已在 Stage 6 建好。

**实现要点**

- 先建 `src/lib/http.ts`：全站统一的出站 HTTP 封装——10 秒超时、失败重试一次、可选走 `OUTBOUND_PROXY`（undici ProxyAgent，国内服务器访问境外 API 的逃生通道，未配置则直连）。Steam、后续的 TMDB/NeoDB/Nominatim 全部经由它。
- `src/modules/games/steam.ts`：
  - 调 `IPlayerService/GetOwnedGames/v1`（参数 `include_appinfo=1&include_played_free_games=1`）拿 appid、name、playtime_forever、playtime_2weeks、rtime_last_played。
  - 封面直接拼 Steam CDN：`https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg`，前端 `onError` 回退占位块。**这是全站"外部图片一律转存本地"纪律的唯一例外**——Steam CDN 在国内可达且游戏库量大，转存性价比低；其余外部图片（豆瓣/TMDB/NeoDB 等）仍必须转存。
- **合并规则（核心，AI 最容易做错）**：按 `steamAppId` upsert——
  - 新游戏：插入，`source=steam`、`status=BACKLOG`；
  - 已存在：**只更新** name、coverUrl、playtimeMin、playtime2w、lastPlayedAt 这些客观字段；status、rating、reviewMd、tags **绝不触碰**；
  - 唯一自动状态流转：`playtime2w > 0` 且当前 `status=BACKLOG` 时升级为 `PLAYING`（手动设的搁置/通关不被打扰）；
  - Steam 列表里消失的游戏（极少见）不删除，仅保留。
- 同步入口：`/games` 页"同步 Steam"按钮（Server Action，toast 显示「新增 x · 更新 y」）；`GET /api/cron/steam-sync` 校验 `Authorization: Bearer ${CRON_SECRET}` 供宿主机 crontab 每日调用；同步成功后把时间写入 `Setting`（key=`steam.lastSyncAt`），页面上展示"上次同步于 …"。cron 路由按成败 ping `HEALTHCHECKS_STEAM_URL`（未配置则跳过）。
- 失败处理：API 超时 / 返回异常时给出明确中文报错，不要写入半截数据（单事务）。
- **合并规则必须有单测**：构造"用户已改 status/rating/感想的游戏"，跑一次同步，断言主观字段原样、客观字段更新、BACKLOG+有两周时长的升级为 PLAYING。

**验收标准**

- [ ] 点击同步后真实游戏库出现，时长正确（分钟）
- [ ] 手动把某游戏改为"已通关"并写感想，再次同步后这些字段原样保留，时长正常更新
- [ ] 近两周玩过的 BACKLOG 游戏自动变为"在玩"
- [ ] 重复同步不产生重复记录；curl 带错误 token 调 cron 接口返回 401
- [ ] 服务器 crontab 配置每日同步成功（看 Setting 里的时间戳），Healthchecks 面板能看到同步心跳
- [ ] 合并规则单测通过
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 8，为游戏模块接入 Steam 同步。环境变量 STEAM_API_KEY、STEAM_ID、CRON_SECRET 已配置：

1. 先创建 src/lib/http.ts：导出统一的出站请求函数（基于 fetch/undici），默认 10 秒超时、失败自动重试一次；若环境变量 OUTBOUND_PROXY 存在则通过 undici 的 ProxyAgent 走该代理，否则直连。后续所有第三方 API 请求都必须经由它。
2. 实现 src/modules/games/steam.ts：通过 src/lib/http.ts 调用 Steam Web API 的 IPlayerService/GetOwnedGames/v1 接口（include_appinfo=1、include_played_free_games=1），解析 appid、name、playtime_forever、playtime_2weeks、rtime_last_played；封面 URL 按 https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg 拼接（这是 AGENTS.md 中图片转存纪律的唯一例外，前端 onError 回退占位块）。
3. 实现同步函数 syncSteamLibrary()，合并规则必须严格遵守：按 steamAppId upsert；新游戏 source=steam、status=BACKLOG；已存在的游戏只允许更新 name、coverUrl、playtimeMin、playtime2w、lastPlayedAt，绝不修改 status、rating、reviewMd、tags；唯一例外是 playtime2w>0 且当前 status=BACKLOG 时把 status 改为 PLAYING；Steam 端消失的游戏保留不删。整个同步放在一个事务中，返回 { added, updated }。
4. /games 页加"同步 Steam"按钮（Server Action 调用同步函数，toast 显示新增与更新数量），旁边显示"上次同步于 xx"（读 Setting 表 key=steam.lastSyncAt，同步成功后更新）。
5. 实现 GET /api/cron/steam-sync：校验请求头 Authorization 为 Bearer + CRON_SECRET，不符返回 401；通过则执行同步并返回 JSON 结果；结束时按成败 ping HEALTHCHECKS_STEAM_URL（失败 ping 其 /fail 端点，未配置该变量则跳过）。在 docs/DEPLOY.md 追加宿主机 crontab 配置示例（每天 05:00 curl 该接口）。
6. 用 Vitest 为合并规则写单元测试：构造"用户已修改 status/rating/reviewMd 的游戏"再跑同步逻辑（mock Steam 返回），断言主观字段未被覆盖、客观字段已更新、BACKLOG 且 playtime2w>0 的升级为 PLAYING。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给验收清单。
```

---
### Stage 9 · 书影模块（手动管理）

**目标**：书 / 电影 / 剧集的统一管理：状态、评分、起止日期与长文感想。

**实现要点**

- `MediaItem` 模型迁移。
- `/media` 页：顶层 Tab 按 type（图书 / 电影 / 剧集），内层与游戏页同构并复用收藏册封面墙风格：状态 Tab（想看 / 在看(读) / 看(读)过 / 弃，带计数）、标签筛选、搜索、封面网格。文案按 type 自适应（图书用"在读/读过"）。
- 手动添加：type、标题、原名、作者或导演、年份、封面、状态、评分、标签；想看状态可填 `releaseDate`（上映/出版日，供日历用）。
- 详情页 `/media/[id]`：信息区 + 感想区（MarkdownEditor，`hasSpoiler` 开关，开启时预览默认折叠为"已隐藏剧透，点击展开"）。
- **状态联动**：改为 `DOING` 且 startedAt 为空 → 自动填今天；改为 `DONE` 且 finishedAt 为空 → 自动填今天，并提示补个评分。日期均可手改。
- 统计行：今年读完 x 本 / 看完 x 部。

**验收标准**

- [ ] 三种类型分 Tab 管理，互不干扰，文案随类型变化
- [ ] 状态切换自动落起止日期，可手动修正
- [ ] 剧透感想默认折叠
- [ ] 评分、标签、搜索筛选组合正常
- [ ] 封面墙、状态徽章和统计数字使用收藏册 token 与书影模块色
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 9，实现书影模块的手动管理：

1. 添加 MediaItem 模型（见 PLAN.md 第 2 节，含 MediaType、MediaStatus 枚举）并 migrate。
2. /media 页：使用 theme-private 的收藏册风格。顶层按类型分 Tab（图书/电影/剧集，写入 URL 参数），每个 Tab 内为：状态 Tab（想看、在看、看过、弃，图书类型文案自动变为想读/在读/读过，均带计数）、标签筛选、标题搜索、封面网格（复用游戏模块的大封面网格风格）。顶部统计做成书影模块色徽章：今年读完 x 本、看完 x 部电影、追完 x 部剧（按 finishedAt 年份统计）。
3. 添加 Dialog：类型、标题（必填）、原名、作者/导演（标签随类型变化）、年份、封面（URL 或上传）、状态、评分（RatingStars）、标签；当状态为想看时显示可选的"上映/出版日期"字段（存 releaseDate）。
4. 详情页 /media/[id]：左侧封面与元信息（均可编辑），右侧感想区（MarkdownEditor + 含剧透开关；渲染时若 hasSpoiler 为真，默认折叠并显示"已隐藏剧透，点击展开"）。
5. 状态联动逻辑写在 action 层：切换为在看且 startedAt 为空时自动填今天；切换为看过且 finishedAt 为空时自动填今天；两个日期都允许手动修改。
6. 模块逻辑放 src/modules/media/。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给验收清单。
```

---

### Stage 10 · 书影导入与搜索补全

**目标**：① 豆瓣历史标记一次性迁入；② 日常添加时联网搜索自动填充元数据。

**背景与策略（先了解再动手）**

- 豆瓣无官方开放 API。历史数据用「豆伴」等浏览器插件把你的标记导出为 Excel/CSV，再导入本站。**不同工具导出的列名不完全一致**，所以导入器必须做成「上传 → 自动猜列 → 手动确认列映射 → 预览 → 导入」的通用流程，而不是写死某个格式。
- 日常补全两条路：**NeoDB**（开源书影音站，提供公开的条目搜索 API，数据结构近似豆瓣，书影剧全覆盖，按其开发者文档对接）；**TMDB**（电影/剧集，免费 API Key，`language=zh-CN` 时中文元数据质量好）。**但要清醒一点：TMDB 的 API 域名与图片域名 `image.tmdb.org` 在国内网络环境下基本不可直连。** 因此策略是：影视搜索优先 TMDB（经 `src/lib/http.ts`，可配 `OUTBOUND_PROXY`），**请求失败时自动回退 NeoDB**，并在界面提示当前用的是哪个源；图书走 NeoDB。
- **外部封面一律转存**：豆瓣图片域名有防盗链直接热链必裂；TMDB 图片国内访客根本加载不出来。所以不管封面来自豆瓣、TMDB 还是 NeoDB，**全部由服务端下载转存到本站 public 存储区**（复用 `storage.saveFromUrl`，自动过 sharp 管线），库里只存本地 URL。下载失败置空，绝不存外链。这与 AGENTS.md 的图片转存纪律一致（Steam CDN 是唯一例外）。
- **解析器要测试驱动**：豆伴导出文件格式杂，先把一份脱敏样本放进 `tests/fixtures/`，对列猜测、评分换算、doubanId 提取、编码探测写单测，再实现解析逻辑。

**前置准备（手动）**：用豆伴导出你的真实标记文件，删减成 10-20 行的脱敏样本（保留各种边界：有/无链接、5 星制评分、带短评、不同类型），存为 `tests/fixtures/doulist-sample.csv`（或 xlsx）。

**实现要点**

- 导入向导 `/media/import`（四步）：
  1. 上传 CSV/XLSX（SheetJS 解析，CSV 自动检测 UTF-8/GBK 编码）；
  2. 列映射：系统按表头关键词（标题/名称、评分/星、短评/评论、日期/标记时间、链接/URL、类型）预选，用户确认；同时让用户选择本文件的 type（书/影/剧）与默认状态（如"这批都是看过"），若文件里有状态列也可映射；
  3. 预览前 20 行解析结果 + 统计（可导入 x、疑似重复 y）；
  4. 执行导入：从豆瓣链接提取 `subject/(\d+)` 作为 doubanId 去重（无链接则按 type+标题+年份弱去重）；5 星制评分 ×2 存 10 分制；短评写入 reviewMd；**封面无论来自哪个域名一律转存本地**。写一条 ImportBatch 风格的结果反馈（本模块可简化为 toast + 结果页）。
- 搜索补全：添加 Dialog 顶部加"联网搜索"输入框 → 调服务端搜索 action（图书走 NeoDB；电影/剧集默认 TMDB、**失败自动回退 NeoDB 并提示**）→ 结果列表（封面缩略图 + 标题 + 年份 + 作者/导演）→ 点选回填表单（含 doubanId/tmdbId/封面，**回填时封面同样转存本地**）。
- 外部请求统一经 `src/lib/http.ts`（超时 + 重试 + 可选代理）并给友好错误提示；NeoDB 请求带 UA 标识，频率克制。
- **单测（基于 fixtures）**：列猜测命中率、5 星 → 10 分换算、`subject/(\d+)` 提取、UTF-8/GBK 编码探测分支。

**验收标准**

- [ ] fixtures 单测全绿；用真实豆伴导出文件走完四步，导入数量与预览一致
- [ ] 同一文件再导一遍，全部判重跳过
- [ ] 导入条目封面正常显示，且**库内 coverUrl 全部为本站 /uploads 路径**（抽查无外链）
- [ ] 添加电影时搜索片名 → 选中 → 表单自动填充含海报（海报已本地化）
- [ ] 断网/挡掉 TMDB 模拟不可达：影视搜索自动回退 NeoDB 且有提示
- [ ] 添加图书时 NeoDB 搜索可用
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 10（务必先读完"背景与策略"），为书影模块实现导入与搜索补全。TMDB_API_KEY 已配置，tests/fixtures/ 下已有我提供的豆伴导出脱敏样本：

1. 先为解析逻辑写 Vitest 单测（基于 fixtures 样本）：表头列自动猜测、5 星制评分 ×2 换算、从豆瓣链接用正则 subject/(\d+) 提取 doubanId、CSV 编码探测（UTF-8 失败回退 GBK）。然后实现解析逻辑直至单测全绿。
2. 通用导入向导 /media/import，四步流程：上传（支持 csv/xlsx，xlsx 用 SheetJS 解析，csv 先探测编码 UTF-8 失败回退 GBK 用 iconv-lite 解码）→ 列映射（按表头关键词自动预选标题/评分/短评/日期/链接列，用户可改；同时选择本批数据的类型与默认状态，若有状态列也可映射并提供值对应关系）→ 预览前 20 行与导入统计 → 执行导入。
3. 导入写入规则：按 doubanId 去重；无链接时按 类型+标题+年份 判重跳过；评分若为 1-5 星制则乘 2 存为 10 分制；短评存 reviewMd；标记日期按默认状态写入 finishedAt 或 startedAt。封面 URL 不论来自哪个域名，一律由服务端经 storage.saveFromUrl 下载转存到本站 public 上传区并改存本地 URL（下载失败则置空，不要让整行失败，也绝不保存外部 URL）。整批导入逐行容错，结束后展示成功/跳过/失败计数及失败原因列表。
4. 搜索补全：在书影添加 Dialog 顶部加联网搜索框，输入关键词调用服务端 action——图书走 NeoDB 公开的条目搜索 API（请先查阅 NeoDB 开发者文档确认接口路径与参数，请求带自定义 User-Agent）；电影/剧集优先 TMDB 的 search/movie 与 search/tv（language=zh-CN），请求经 src/lib/http.ts（带超时、重试与可选 OUTBOUND_PROXY），TMDB 请求失败时自动回退到 NeoDB 搜索并在结果区提示数据来源。点选结果回填表单全部字段与外部 ID，封面同样转存本地后再写入表单。
5. 所有外部请求失败时给出明确中文提示，不阻塞手动填写。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给验收清单（我会用真实豆瓣导出文件测试）。
```

---

## 阶段四：消费记录（Stage 11 ~ 13）

### Stage 11 · 记账基础（模型 + 手动记账 + 分类管理）

**目标**：消费数据底座：交易流水的手动记录、列表浏览与分类体系。

**实现要点**

- `Transaction`、`ExpenseCategory`、`ImportBatch` 模型迁移；seed 脚本追加默认分类（餐饮🍜、交通🚇、购物🛒、居住🏠、娱乐🎮、医疗💊、人情🧧、订阅📱、旅行✈️、其他📦，以及收入侧的工资、理财、其他收入），各带初始 keywords。
- `/expenses` 流水页：月份切换器（默认本月）+ 列表按日分组（每日小计），行内显示分类图标、商户、商品、金额（支出红 / 收入绿 / 不计收支灰）；筛选：方向、分类、平台、关键词；行内可直接改分类（下拉即存）；删除二次确认。
- 手动记一笔（移动端优先设计）：金额大键盘、方向切换、分类宫格、日期默认今天、商户/备注选填——目标是手机上 5 秒记完一笔。
- `/admin/expense-categories`：分类 CRUD + keywords 编辑（TagInput）+ 排序；删除分类时其下交易置为未分类。
- **金额纪律**：入库 `Decimal`，前端字符串传输，服务端 `new Prisma.Decimal()`；展示统一 `¥1,234.56` 格式化工具。注意 Decimal 对象不能直接作为 props 传给 Client Component，列表查询返回前先 `.toString()`。

**验收标准**

- [ ] 手动记账在手机宽度下流畅完成
- [ ] 流水按日分组、每日小计正确，月份切换正常
- [ ] 行内改分类即时生效；筛选可组合
- [ ] 分类管理可增删改、调 keywords
- [ ] 0.1 + 0.2 类浮点问题不存在（抽查金额合计）
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 11，实现消费模块基础：

1. 添加 Transaction、ExpenseCategory、ImportBatch 模型（见 PLAN.md 第 2 节）并 migrate；在 seed 脚本中幂等地追加 PLAN.md Stage 11 列出的默认分类（含 emoji 图标与初始关键词）。
2. /expenses 流水页：顶部月份切换器（默认本月，左右箭头切换）；交易列表按日期倒序分组，组头显示当日支出小计；每行显示分类图标、商户、商品说明、金额（支出红色、收入绿色、不计收支灰色且不计入小计）；行内分类下拉可直接修改并即时保存；支持按方向、分类、平台、关键词筛选；删除需二次确认。
3. "记一笔"入口（按钮 + 移动端底部悬浮按钮）：弹出移动端优先的表单——金额输入（大号数字）、支出/收入切换、分类宫格选择、日期（默认今天）、商户与备注选填；platform 固定 manual，txnNo 留空。
4. /admin/expense-categories：分类列表与 CRUD，keywords 用 TagInput 编辑，支持排序；删除分类时将其下交易的 categoryId 置空。
5. 金额纪律：全链路使用 Prisma Decimal，禁止 parseFloat 参与求和；在 src/lib/money.ts 提供格式化函数（千分位 + ¥ 前缀）；服务端查询结果传给客户端组件前把 Decimal 字段 .toString()。模块逻辑放 src/modules/expenses/。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给验收清单。
```

---
### Stage 12 · 微信 / 支付宝账单导入

**目标**：上传官方导出的账单 CSV → 预览 → 一键入库，自动分类，重复导入零重复。**全方案最繁琐的一步，值得单独花时间——所以这一步用测试先行的方式做。**

**前置准备（手动，v2 新增且很重要）**：

- 从支付宝导出一份真实账单 CSV，**删减脱敏成 10-20 行样本**（保留各种边界行：头部说明行、表头行、收入/支出/不计收支、交易关闭、已全额退款、底部汇总行），存为 `tests/fixtures/alipay-sample.csv`——**注意必须保持 GBK 编码**（用 VSCode 的"通过编码重新打开 GBK → 编辑 → 通过编码保存 GBK"，或先 `iconv -f gbk -t utf-8` 转出来改完再转回去）。编码本身就是要测的东西，存成 UTF-8 样本就白测了。
- 同样从微信导出账单，脱敏成 `tests/fixtures/wechat-sample.csv`（UTF-8，保留 ¥ 前缀金额、各状态行）。
- 真实完整账单留着，导入功能做完后做最终验证。

**账单格式情报（写给 AI 也写给你）**

- **支付宝**：App / 网页申请导出"交易明细"得到 CSV，**GBK 编码**；文件头部有若干行说明、底部有汇总行，真正的表头行包含「交易时间」；关键列：交易时间、交易分类、交易对方、商品说明、收/支（收入/支出/不计收支）、金额、收/付款方式、交易状态、**交易订单号**（去重键）。
- **微信**：我 → 服务 → 钱包 → 账单 → 常见问题 → 下载账单（用于个人对账），邮件收加密 zip，解压出 CSV，**UTF-8 编码**；同样有头部说明行，表头行含「交易时间」；关键列：交易时间、交易类型、交易对方、商品、收/支、金额(元)（**带 ¥ 前缀需剥离**）、支付方式、当前状态、**交易单号**（去重键）。
- 共同规则：按"收/支"列映射 direction（不计收支 → NEUTRAL）；交易状态为「交易关闭」/「已全额退款」的行跳过；退款会以独立的收入行出现，正常导入即可；金额统一存正数。

**实现要点**

- **测试先行**：先基于两份 fixtures 写 Vitest 用例（编码探测、表头定位、¥ 剥离、direction 映射、状态过滤、txnNo 提取、错误行收集），再实现解析器直到全绿。这一步格式细节极多，没有测试网兜着，AI 改一处崩三处。
- 解析器 `src/modules/expenses/parsers/`：`alipay.ts` 与 `wechat.ts` 实现统一接口 `parse(buffer): ParsedTxn[]`——定位含「交易时间」的表头行，逐行解析为标准结构，可解析失败的行收集进 errors 而非中断；入口处自动识别平台（按文件头特征），识别不了让用户手选。编码处理：先试 UTF-8，乱码特征（替换符）则用 iconv-lite 按 GBK 重解。
- 导入流程 `/expenses/import`：上传 → 解析 → **预览页**（统计：解析成功 x 行、将导入 y、因 txnNo 已存在跳过 z、状态过滤 w、解析失败 e + 失败行展示；预览表前 50 行含将命中的分类）→ 确认导入（单事务批量插入，`@@unique([platform, txnNo])` 兜底，写 ImportBatch）→ 结果页。
- **自动分类引擎** `categorize(txn)`：遍历 ExpenseCategory.keywords，对 merchant + item 做包含匹配，命中即归类（按分类 sort 优先）；支付宝的「交易分类」列可作为兜底映射（如 餐饮美食→餐饮）；都没中 → 未分类。
- **规则沉淀**：流水页手动修改分类时，弹一个小确认：「以后把『{商户名}』都归到{分类}？」确认则把商户名 append 进该分类 keywords。这是让分类越用越准的关键闭环。
- 导入历史页：ImportBatch 列表（文件名、平台、计数、时间）。

**验收标准**

- [ ] fixtures 单测全绿（编码、表头、¥ 剥离、方向映射、状态过滤、txnNo、错误收集全覆盖）
- [ ] 各导一份**真实完整**微信、支付宝账单成功，金额/时间/方向抽查无误（注意支付宝中文不乱码）
- [ ] 同一文件重复导入，全部因 txnNo 判重跳过
- [ ] 餐饮类商户被自动归类；手动改分类时可一键沉淀规则，下次导入生效
- [ ] 「不计收支」行入库为 NEUTRAL 且不计入日小计
- [ ] 解析失败的行有清晰展示，不影响其余行导入
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 12（必须先完整阅读其中的"账单格式情报"），实现微信/支付宝账单导入。tests/fixtures/ 下已有我提供的 alipay-sample.csv（GBK 编码）与 wechat-sample.csv（UTF-8）两份脱敏样本：

1. 测试先行：先基于两份 fixtures 编写 Vitest 用例，覆盖——编码自动探测（支付宝样本必须按 GBK 正确解码出中文）、以"交易时间"定位表头行并跳过头尾说明/汇总行、微信金额 ¥ 前缀剥离、收/支列到 EXPENSE/INCOME/NEUTRAL 的映射、"交易关闭"与"已全额退款"行被标记过滤、交易订单号/交易单号提取为 txnNo、坏行进入错误数组而非抛异常。
2. 在 src/modules/expenses/parsers/ 实现 alipay.ts 与 wechat.ts，统一导出 parse(buffer) 返回标准化交易数组与错误行数组，逐步实现直到第 1 步单测全绿。金额存正数字符串（后续转 Decimal）；保留原始行对象到 raw 字段。
3. 实现平台自动识别（按文件头特征判断微信或支付宝，无法识别时由用户手动选择）。
4. /expenses/import 三步页面：上传 → 预览（展示统计：成功解析、将导入、txnNo 重复跳过、状态过滤、解析失败，前 50 行预览表含自动分类结果，失败行单独列出）→ 确认导入。导入在单事务中批量执行，依赖 [platform, txnNo] 唯一约束兜底去重，完成后写入 ImportBatch 并跳转结果页。
5. 实现自动分类函数 categorize：按分类 sort 顺序，对 merchant+item 做 keywords 包含匹配；未命中时尝试用支付宝"交易分类"列做兜底映射表；仍未命中则置空。导入与手动记账共用该函数。
6. 规则沉淀：流水页行内修改分类时，若该交易有商户名，弹出确认"以后把『商户名』都归到 X 分类？"，确认则把商户名追加进该分类的 keywords。
7. /expenses/import/history：ImportBatch 历史列表。

完成后我会再用完整的真实账单文件做最终验证，请确保对照 PLAN.md 的格式说明处理所有边界情况。先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md。
```

---

### Stage 13 · 消费报表 + 快捷记账入口

**目标**：月 / 周 / 年三个视角的消费分析看板；外加一个让"锁屏说句话就记账"成立的极简 API（v2 从拓展清单提前并入，因为它直接决定记账习惯能不能养成）。

**实现要点**

- `/expenses/stats`，Tab 切换 月 / 周 / 年（ECharts 全部 `'use client'` 封装，统计查询在服务端用 SQL 聚合，**NEUTRAL 一律排除**，收入支出分开统计）：
  - **月视图**（核心）：本月支出总额 + 环比上月（涨跌箭头）、收入总额、结余；分类占比环形图（点击扇区跳转该分类流水）；每日支出柱状图（点击跳当日流水）；Top 10 商户横条图；分类明细表（金额、笔数、占比、环比）。
  - **周视图**：本周/上周对比柱状、按星期分布。
  - **年视图**：12 个月支出趋势折线（叠加收入虚线）、年度分类占比、年度总览数字。
- 月份/周期切换沿用流水页的切换器风格；空数据月份给 EmptyState。
- 图表配色从 1.7 节模块色和语义 token 派生，必须适配亮/暗模式；移动端图表自适应宽度。
- **快捷记账 API**（新增）：`POST /api/quick/expense`，鉴权方式为 `Authorization: Bearer ${QUICK_ADD_TOKEN}`（独立长随机 token，不复用登录态）；请求体 `{ text: "咖啡 35" }`——解析规则：末尾的数字（支持小数）为金额，其余文本作为商户/备注，过一遍 `categorize()` 自动归类，direction=EXPENSE，platform=`quick`，日期取当前时间。内存级限频（同 token 每分钟 ≤ 10 次）。该路径已在 Stage 1 加入中间件白名单。
- `docs/QUICK_ADD.md`：写清 iOS 快捷指令的配置步骤（"听写文本 → 通过 URL 获取内容 POST + Header"）与安卓（HTTP Request Shortcuts / Tasker）配置示例，附 curl 自测命令。

**验收标准**

- [ ] 月视图各数字与流水页手工核算一致（重点验证 Decimal 聚合）
- [ ] 环形图点击能跳转到对应分类的流水筛选
- [ ] 环比计算在上月无数据时不报错（显示"--"）
- [ ] 年趋势图 12 个月完整，无数据月份为 0
- [ ] 手机上图表不溢出、可横向滚动或自适应
- [ ] `curl -X POST -H "Authorization: Bearer 正确token" -d '{"text":"咖啡 35"}'` 成功入库且自动归到餐饮；错误 token 返回 401；未配置 `QUICK_ADD_TOKEN` 时接口整体禁用
- [ ] 真机配好快捷指令：锁屏说"咖啡 35"，流水页出现记录
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 13，实现消费报表页与快捷记账入口：

1. 安装 echarts 与 echarts-for-react，封装一个 'use client' 的图表容器组件（自适应宽度、配色读取 1.7 节语义 token 与模块色、加载态）。
2. 统计查询全部在服务端完成（src/modules/expenses/stats.ts），使用 Prisma 聚合或原生 SQL，金额用 Decimal 求和；所有统计排除 direction=NEUTRAL，收入与支出分开。
3. 月视图：顶部指标卡（本月支出、环比上月百分比与涨跌色、本月收入、结余）；分类占比环形图（点击扇区跳转 /expenses?month=xx&category=xx）；每日支出柱状图（点击跳转当日流水）；Top 10 商户横向条形图；底部分类明细表（金额、笔数、占比、环比，环比在上月无数据时显示 --）。
4. 周视图：本周与上周按日对比的分组柱状图、按星期几的平均支出分布。
5. 年视图：12 个月支出趋势折线叠加收入虚线、年度分类占比、年度总支出/总收入/结余指标卡。
6. 三个视图共用周期切换器（与流水页风格一致），通过 URL 参数记录当前周期；空数据时显示 EmptyState；移动端图表自适应。
7. 实现 POST /api/quick/expense：校验 Authorization 为 Bearer + 环境变量 QUICK_ADD_TOKEN（未配置该变量则接口直接返回 404/禁用）；请求体 { text }，解析末尾数字为金额（支持小数），剩余文本存为商户与备注，调用 categorize 自动分类，direction=EXPENSE、platform=quick、时间取当前；做内存级限频（每分钟 10 次）；返回创建结果 JSON。确认 Stage 1 的中间件白名单已放行 /api/quick/**。
8. 编写 docs/QUICK_ADD.md：iOS 快捷指令配置步骤（听写文本 → URL POST 带 Header）、安卓 HTTP Request Shortcuts 配置示例、curl 自测命令。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给验收清单（我会拿流水页手工核对数字，并用真机配置快捷指令测试）。
```

---
## 阶段五：旅行、日历与首页聚合（Stage 14 ~ 16）

### Stage 14 · 旅行模块

**目标**：旅行的记录与规划：行程 → 每日 → 地点（地图）+ 照片 + 游记，外加一张足迹地图。

**实现要点**

- `Trip`、`TripDay` 模型迁移。
- **私密文件读取**补全：`GET /api/files/private/[...path]`——登录校验后流式返回 private 区文件（旅行照片都走这里），防路径穿越。
- `/trips` 列表：收藏册风格的旅行封面册。「计划中 / 已完成」Tab，封面卡片（标题、日期范围、目的地、天数），旅行模块色用于目的地徽章、足迹统计和地图强调。
- 行程详情 `/trips/[id]`：
  - 头部：封面、基本信息、总结（Markdown）、预算；计划中的行程多一个 checklist（行前清单，勾选即存）。注意 `budget` 是 Decimal，传给客户端组件前 `.toString()`。
  - 主体左右布局（移动端上下）：左侧按天的行程编辑（每天：地点列表 + 笔记 + 照片九宫格上传，照片传 private 区，**九宫格用 sharp 生成的 `thumbUrl` 缩略图渲染，点开看原图**——几十张原图直出会把流量和首屏拖垮）；右侧 Leaflet 地图，渲染当前选中日的地点 marker 与连线，点击 marker 高亮对应条目。
  - **添加地点**：搜索框调 OSM Nominatim（服务端代理，经 `src/lib/http.ts`，带自定义 User-Agent，限频 1 req/s，结果取 name + lat/lng）；也支持手动粘贴坐标。**坐标系提示**：从高德/腾讯地图复制的坐标是 GCJ-02，提供一个"来自国内地图"勾选项，勾选后用 gcj02→wgs84 近似转换函数处理后入库（库内统一 WGS-84）。
  - 行程完成时（状态切 DONE）写一条 Activity（Stage 16 接入后生效，此处先留 TODO 注释）。
- 足迹地图 `/trips/footprint`：聚合所有 DONE 行程的全部地点，世界地图打点，按城市去重，统计「x 个城市 · y 次旅行」。地图本身是视觉主角，不要包在厚重装饰卡片里。
- **瓦片源（v2 调整）**：OSM / Carto 瓦片在国内加载慢且不稳定，地图体验会很糟。默认接**天地图**：去 [天地图开发者平台](https://console.tianditu.gov.cn) 免费申请浏览器端 Key（`TIANDITU_KEY`），底图用矢量图层 `vec_w` + 中文注记层 `cva_w` 两层叠加（**具体 URL 模板请查阅天地图官方文档**，不要凭记忆写）；天地图坐标系 CGCS2000 与 WGS-84 在此精度下可视为兼容，库内 WGS-84 坐标直接可用。把瓦片配置集中到 `src/lib/map.ts`：`TIANDITU_KEY` 未配置时自动回退 OSM 瓦片，并按各瓦片源要求渲染 attribution 来源标注。
- Leaflet 在 Next 中必须动态导入（`ssr: false`）。

**验收标准**

- [ ] 新建计划行程：checklist 可勾选、天数随日期范围生成
- [ ] 按天添加地点（搜索与手动坐标皆可），地图同步打点连线
- [ ] 勾选"来自国内地图"后，国内地点在底图上无明显偏移
- [ ] 照片上传后未登录直接访问其 URL 返回 401/403；九宫格加载的是缩略图（看网络面板请求体积）
- [ ] 配置 `TIANDITU_KEY` 后地图为天地图中文底图且加载流畅；删掉 Key 自动回退 OSM；两种情况 attribution 都正确
- [ ] 足迹地图正确聚合已完成行程的城市
- [ ] 旅行封面、照片墙、地图和统计徽章使用收藏册 token 与旅行模块色
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 14，实现旅行模块。环境变量 TIANDITU_KEY 已配置：

1. 添加 Trip、TripDay 模型（见 PLAN.md 第 2 节）并 migrate；实现 GET /api/files/private/[...path]：登录校验后流式返回 UPLOAD_DIR private 区文件，严防路径穿越，未登录返回 403。
2. 创建 src/lib/map.ts 集中管理瓦片配置：默认使用天地图——矢量底图 vec_w 加中文注记 cva_w 两层（请查阅天地图官方文档确认 URL 模板与子域参数，Key 从 TIANDITU_KEY 读取）；当 TIANDITU_KEY 未配置时回退到 OSM 标准瓦片；两种来源都要正确设置 Leaflet attribution。
3. /trips 列表页：使用 theme-private 的收藏册风格。计划中/已完成两个 Tab，封面卡片显示标题、日期范围、目的地标签、天数；目的地标签和统计徽章使用旅行模块色；新建行程 Dialog（标题、起止日期、目的地多值输入、封面上传、状态）。创建后按日期范围自动生成对应的 TripDay 记录。
4. /trips/[id] 详情页：头部为大封面与基本信息、Markdown 总结编辑、预算（Decimal 传客户端前 .toString()）；状态为计划中时显示行前清单 checklist（存 Trip.checklist JSON，勾选即保存）。主体桌面端左右布局、移动端上下：左侧按天列出行程卡（日期、地点列表、Markdown 笔记、照片网格——照片经 /api/upload 传 private 区，九宫格渲染 thumbUrl 缩略图，点击查看原图）；右侧为 Leaflet 地图（react-leaflet，组件动态导入关闭 SSR，瓦片配置来自 src/lib/map.ts），展示当前选中日的地点 marker 并按顺序连线，点击 marker 联动左侧高亮。地图和照片是视觉主角，不要塞进过小卡片。
5. 添加地点：搜索框调用服务端代理的 Nominatim 搜索（经 src/lib/http.ts，自定义 User-Agent，节流 1 秒 1 次，返回名称与经纬度供选择）；并支持手动输入坐标，附"坐标来自国内地图(高德/腾讯)"勾选项，勾选时用 GCJ-02 转 WGS-84 的近似算法转换后入库（请实现 src/lib/geo.ts 中的转换函数）。库内坐标统一为 WGS-84。
6. /trips/footprint 足迹页：聚合所有已完成行程的地点，世界地图打点（按地点名去重），顶部统计"x 个城市 · y 次旅行"，统计做成旅行模块色徽章；地图全宽展示，不要厚重装饰容器。
7. 模块逻辑放 src/modules/trips/；行程状态切换为已完成的 action 中留下 recordActivity 的 TODO 注释（Stage 16 接入）。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给验收清单。
```

---

### Stage 15 · 全局日历

**目标**：一张月历看清所有模块的时间信息：待办、旅行区间、重要日子、想看作品的上映日。

**实现要点**

- `src/lib/calendar.ts` 定义统一类型：`CalendarEvent { id, module, title, start, end?, allDay, color, href }`，以及聚合函数 `getAllEvents(start, end)`。
- 各模块实现 `getEvents(start, end)`：
  - todos：区间内有日期的任务（已完成的加 ✓ 前缀、半透明）；
  - trips：行程区间（跨多日的条带事件），计划中与已完成不同色；
  - specialDays：`yearlyRepeat=true` 的按年展开到查询区间（注意跨年查询与 2/29 边界——平年顺延到 2/28），一次性的按原日期；**展开逻辑要写单测**（跨年区间、2/29 生日在平年/闰年、一次性事件不重复）；
  - media：`status=WISHLIST` 且 `releaseDate` 在区间内的条目（「《xxx》上映/出版」）。
- `/calendar`：FullCalendar，中文 locale、周一开头；**桌面端 `dayGridMonth`，小屏（<768px）默认切到 `listWeek` 列表视图**（月视图格子在手机上塞不下事件文字），提供月/列表手动切换；颜色引用 1.7 节模块色 + 顶部图例（可点击开关某模块显隐，偏好存 localStorage）；点击事件跳 `href`；点击空白日期弹出快捷菜单（在该日加待办 / 加重要日子）。
- 事件数据走一个按月查询的 API route 或 server 端注入，月份切换时增量加载。

**验收标准**

- [ ] 四类事件同月混排显示，配色引用全站模块色且与图例一致，可单独隐藏某模块
- [ ] 跨月旅行条带正确跨越月界
- [ ] 每年重复的生日在任意年份的对应月出现；specialDays 展开单测全绿（含 2/29 与跨年用例）
- [ ] 点击事件正确跳转；点空白日期可快捷添加待办
- [ ] 手机宽度下默认进入列表视图，浏览顺畅；月视图下事件多时显示 +n 更多
- [ ] `npm run check` 全绿

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 15，实现全局日历：

1. 在 src/lib/calendar.ts 定义 CalendarEvent 类型（id、module、title、start、end 可选、allDay、color、href）与聚合函数 getAllEvents(start, end)。
2. 为四个模块实现 getEvents(start, end)：todos（有日期的任务，已完成加 ✓ 前缀并降低不透明度，href 指向 /todos）；trips（起止日期生成跨日条带事件，计划中与已完成用不同颜色，href 指向行程详情）；specialDays（yearlyRepeat 为真的事件按年份展开到查询区间内，处理跨年查询与 2 月 29 日在平年的边界——顺延到 2 月 28 日；一次性事件按原日期）；media（想看状态且 releaseDate 落在区间内的条目，标题形如「《xxx》上映」）。
3. 用 Vitest 为 specialDays 展开逻辑写单测：跨年查询区间（12 月查到次年 1 月）、2/29 生日在平年顺延 2/28 与闰年正常出现、一次性事件只出现一次。
4. /calendar 页：FullCalendar 中文 locale、周一为每周第一天；桌面端 dayGridMonth，小于 768px 的屏幕默认 listWeek 列表视图，并提供"月/列表"切换按钮；从 src/lib/design.ts 引用模块色为 todos、trips、specialDays、media 渲染事件和顶部图例，图例可点击切换该模块事件显隐（偏好存 localStorage）；点击事件跳转其 href；点击空白日期弹出快捷菜单：在该日新建待办 或 新建重要日子（复用已有表单组件）。
5. 事件按当前可见月份范围查询（前后各缓冲一周），切换月份时重新拉取；FullCalendar 相关组件 'use client' 并动态导入。
6. 单日事件过多时折叠为 +n 形式，移动端验证可用性。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、更新 docs/PROGRESS.md，再给验收清单。
```

---

### Stage 16 · 首页聚合与活动时间线（收官）

**目标**：未登录的编辑部门面 + 登录后的收藏册仪表盘与跨模块动态时间线；并入两件小而值的收尾事：PWA 清单与数据导出。

**实现要点**

- `Activity` 模型迁移（含 `@@index([happenedAt])`）；`src/lib/activity.ts` 提供 `recordActivity(module, action, refId, title)`。
- **埋点接入**（修改各模块 action，注意只在状态"变为"目标值时记录，重复保存不重复记）：游戏 → FINISHED「通关了《x》」；书影 → DONE「读完/看完《x》」；博客发布「发布了文章《x》」；旅行 → DONE「完成了旅行：x」；导入账单「导入了 x 笔账单」。
- **公开首页 `/`（未登录）**：使用 `theme-public`。头像、名字、一句话简介（存 Setting，`/admin/settings` 可编辑）+ 最新 3 篇文章 + 进入博客/导航的入口。像月刊封面，靠排版、留白、酒红点缀和最新文章建立门面，不做营销式 hero。
- **仪表盘 `/`（登录后）**：使用 `theme-private`。它不是普通统计卡堆叠，而是"今天的你"快照；网格小部件每个独立 Server Component，互不阻塞：
  - 今日待办（可直接勾选，含逾期计数）
  - 最近在玩（近两周时长 Top3，显示时长；有封面时可作为大视觉）
  - 在读 / 在看（DOING 条目封面行，封面优先做大）
  - 本月消费（总额 + 环比 + Top3 分类迷你条）
  - 下一段旅行倒计时（最近的 PLANNED 行程）
  - 未来 14 天的重要日子
  - 今年数字：通关 x 款 · 读完 x 本 · 看完 x 部 · 发文 x 篇（彩色奖章样式）
  - 活动时间线（最近 20 条，按日分组，带模块图标，可跳转）
- 每个部件点击标题进入对应模块；空态友好（如"今天没有待办 🎉"）。
- **PWA（轻量版，v2 并入）**：只做 `manifest.webmanifest`（名称/短名、亮暗两套 `theme_color`、`background_color`、`display: standalone`）+ 512/192 图标（先用站点首字母生成占位）+ `apple-touch-icon`。**不做 Service Worker**——全站登录态 + 动态数据，离线缓存收益低、缓存失效坑多。
- **数据导出（v2 并入）**：`/admin/settings` 加"导出全站数据"按钮——服务端把各核心表查出转 JSON，打成一个 zip 下载，附 `manifest.json`（导出时间、各表条数）。图片不进 zip（太大），JSON 里保留 URL/key，按钮旁注明"图片在服务器 uploads 卷与每日备份中"。
- 收尾杂项：全站 404/error 页、`<title>` 模板、删除 Stage 2 的 playground 页。

**验收标准**

- [ ] 未登录访问 `/` 是公开门面；登录后同一 URL 变仪表盘
- [ ] 未登录首页呈现编辑部气质；登录后仪表盘呈现收藏册气质，二者不是同一套默认后台样式
- [ ] 各部件数字与对应模块页一致；今日待办可直接勾选
- [ ] 通关一款游戏 / 看完一部电影后，时间线出现对应动态；重复保存不产生重复动态
- [ ] 简介信息可在设置页修改并生效
- [ ] 手机上仪表盘单列流式排布正常
- [ ] 手机"添加到主屏幕"后图标与名称正确，打开为独立窗口（无浏览器地址栏）
- [ ] 导出 zip 内各 JSON 条数与 manifest.json 一致，能正常解压阅读
- [ ] `npm run check` 全绿；`npm run e2e` 冒烟仍全过

**Vibe Coding Prompt**

```text
请阅读 AGENTS.md 与 docs/PLAN.md 的 Stage 16，完成首页聚合与活动时间线（项目收官）：

1. 添加 Activity 模型（含 happenedAt 索引）并 migrate；实现 src/lib/activity.ts 的 recordActivity(module, action, refId, title)。
2. 在以下 action 中接入埋点，注意仅在状态从其他值变为目标值时记录一次：游戏状态变为已通关（「通关了《名称》」）、书影状态变为看过（按类型生成「读完/看完《名称》」）、文章首次发布、旅行状态变为已完成、账单导入完成（「导入了 x 笔账单」）。
3. 公开首页（未登录访问 /）：使用 theme-public 的编辑部风格，头像、名字、一句话简介（从 Setting 读取，key 为 profile.name / profile.bio / profile.avatar），最新 3 篇已发布文章卡片，前往博客与导航的入口；靠排版、留白、酒红点缀和文章摘要建立门面，不做营销式 hero；在 /admin/settings 实现这几项的编辑（头像走上传接口 public 区）。
4. 登录后的 / 渲染 theme-private 收藏册仪表盘：以下小部件各自为独立 Server Component——今日待办（可勾选，显示逾期数）、最近在玩（playtime2w 前 3，有封面时可做大视觉）、在读在看（DOING 封面行）、本月消费（总额、环比、Top3 分类）、下一段旅行倒计时、未来 14 天重要日子、今年数字（通关/读完/看完/发文数，彩色奖章样式）、活动时间线（最近 20 条按日分组，带模块图标与跳转链接）。所有部件标题可点击进入对应模块，空数据用人话文案，不写"暂无数据"。
5. PWA 轻量接入：创建 manifest.webmanifest（名称、短名、theme_color 适配亮暗、background_color、display: standalone）、生成 512 与 192 尺寸图标（可先用站点名首字与主题色生成占位图）与 apple-touch-icon，在 layout 中正确引用。不要实现 Service Worker。
6. 数据导出：在 /admin/settings 加"导出全站数据"按钮，服务端将 Game、MediaItem、Trip（含 TripDay）、Post、Transaction、ExpenseCategory、Todo、SpecialDay、Link、Activity 各表导出为 JSON 打包成 zip 下载，附 manifest.json 记录导出时间与各表条数；图片不打包，JSON 中保留 URL/key，按钮旁注明图片随服务器每日备份。
7. 收尾：全站 404 与 error 页面、统一 <title> 模板（页面名 · 站点名）、删除 /admin/playground。
8. 移动端仪表盘单列排布，部件顺序为：今日待办、本月消费、最近在玩、其余。

先列实施计划确认后执行；完成后运行 npm run check 确认全绿、跑一遍 npm run e2e、更新 docs/PROGRESS.md，再给验收清单。做完这一步，整个网站的第一个完整版本就竣工了。
```

---
## 4. 常见坑速查表

开发中卡住时先来这里对一眼：

| # | 坑 | 对策 |
|---|---|---|
| 1 | 支付宝 CSV 是 GBK 编码，直接按 UTF-8 读全是乱码 | iconv-lite 解码；解析器先探测编码 |
| 2 | 金额用 JS 浮点数累加出现 0.30000000000000004 | 全链路 Prisma Decimal，展示层才格式化 |
| 3 | 重复导入账单产生重复数据 | `@@unique([platform, txnNo])` 数据库层兜底 + 导入前预检 |
| 4 | Steam 同步把手动改的状态/评分/感想冲掉 | 合并白名单：只更新客观字段（Stage 8 规则） |
| 5 | Steam API 返回空列表 | 个人资料隐私设置中"游戏详情"未公开 |
| 6 | 豆瓣封面图裂图 | 豆瓣图片域名有防盗链，导入时服务端转存本地 |
| 7 | 国内地图复制的坐标在 OSM 上偏移几百米 | GCJ-02 → WGS-84 转换（Stage 14 的 geo.ts） |
| 8 | 线上数据库结构混乱 | 本地 `migrate dev` 提交迁移文件，线上只 `migrate deploy`，永不 `db push` |
| 9 | next/image 加载外域封面报错 | next.config 配置 remotePatterns（Steam CDN、自己的域名）；其余外部图片本就该转存本地 |
| 10 | 服务器重启后图片全丢 | uploads 必须是 Docker 命名卷，且纳入每日备份 |
| 11 | Leaflet / FullCalendar / ECharts 在服务端渲染报 window is not defined | 'use client' + next/dynamic 动态导入关闭 SSR |
| 12 | 账单时间差 8 小时 | 容器 TZ=Asia/Shanghai，dayjs 统一 UTC+8 解析 |
| 13 | Server Action 忘了鉴权，middleware 不是万能的 | 每个 action 第一行 auth 校验（AGENTS.md 已约定，抽查 AI 是否遵守） |
| 14 | 中文标题生成的 slug 是空串 | slug 默认 post-时间戳，允许手填英文 |
| 15 | 国内服务器绑定域名后打不开或被拦截 | 先完成 ICP 备案/接入备案，再正式解析到国内云服务器；页脚展示备案号 |
| 16 | 服务器拉 GHCR / GitHub / npm 很慢或失败 | 镜像推到 ACR/TCR/SWR 等国内容器镜像服务；Node 依赖配置国内 npm mirror |
| 17 | Caddy 自动 HTTPS 失败 | 检查域名解析、备案状态、安全组、系统防火墙和 80/443 端口占用 |
| 18 | 导航页 favicon 在国内加载失败 | 不用 Google s2；服务端抓取 favicon 后缓存到 public 存储，失败显示首字母色块 |
| 19 | 字体运行时依赖 Google Fonts，或中文字体全量打包动辄 10MB+ | `next/font` 自托管西文；中文正文走系统字体栈不打包；中文展示字体子集化后再自托管（1.7 节字体策略） |
| 20 | Prisma Decimal 传给 Client Component 报序列化错误 | 服务端查询结果在边界处 `.toString()`（金额、预算字段都中招） |
| 21 | 发了新文章 / 改了导航，匿名访客看到的还是旧内容 | 静态页 + 写操作后忘了 revalidate；遵守 AGENTS.md 缓存纪律：私密页动态渲染，公开页写后 `revalidatePath` |
| 22 | 匿名访客看博客图片全裂，302 到登录页 | 中间件白名单漏了 `/uploads/**`（Stage 1 就要加，Stage 5 回归验证） |
| 23 | AI 写的配置和装的库版本对不上（Tailwind v3 语法配 v4、next-auth beta 接口变了） | AGENTS.md 版本锁定表 + `.npmrc save-exact`；Tailwind v4 用 `@theme`，禁止 v3 旧写法 |
| 24 | TMDB API/图片国内连不上，影视搜索整个不可用 | 经 `src/lib/http.ts`（可配 OUTBOUND_PROXY）；失败自动回退 NeoDB；海报一律转存本地 |
| 25 | OSM/Carto 瓦片国内加载半天，地图体验稀烂 | 默认天地图（免费 Key，vec_w+cva_w），未配 Key 才回退 OSM（Stage 14 的 map.ts） |
| 26 | 手机照片显示躺倒/倒置、单张 8MB 拖垮页面、原图带 GPS 泄露住址 | storage 内置 sharp 管线：EXIF 旋正 + 压缩 + 重编码去元数据 + 缩略图；上传拒绝 svg |
| 27 | 本地图片处理正常，线上容器里 sharp 报错 | standalone 输出可能缺 sharp 原生二进制；构建后容器内验证，必要时运行阶段单独安装（Stage 6） |
| 28 | 账单/照片明文躺在对象存储，等于把隐私交给云厂商 | 备份走 rclone crypt 加密远端；恢复演练时同时验证解密链路 |
| 29 | 备份脚本/Steam 同步悄悄挂了几个月才发现 | Healthchecks 心跳：任务结束 ping，失败 ping /fail，没心跳自动告警 |
| 30 | `@db.Date` 字段读出来差一天（昨天 16:00Z） | 全链路 dayjs UTC+8；日期比较用 `format('YYYY-MM-DD')` 字符串，禁止 `toISOString()` 截取 |

---

## 5. 后续拓展思路

第一版竣工后，按"数据已经在手里，能玩出什么花"来排优先级：

### 5.1 性价比最高的一批

- **年度总结页**：仿 Spotify Wrapped 的 `/year/2026`——今年通关的游戏墙、读完的书、足迹地图动画、消费画像、写作字数。所有数据现成，纯前端表现层；依赖 Stage 0/2 已经打好的设计 token、模块色、徽章和富媒体系统，年底发朋友圈极有成就感。
- **全站搜索**：顶栏 ⌘K 命令面板，跨游戏/书影/文章/流水/链接搜索（PostgreSQL `pg_trgm` 或 FTS 即可，数据量小不需要引搜索引擎）。

> 初版列在这里的"快捷记账入口"与"数据导出"已在 v2 中分别并入 Stage 13 与 Stage 16 正篇。

### 5.2 AI 能力（你已经有全套个人数据，这是最大的想象空间）

- **账单 AI 分类**：规则没命中的交易批量丢给 LLM 归类，置信度低的标记人工复核；逐步取代关键词规则。
- **对话式查询**：「我今年在外卖上花了多少？」「上次去大阪是什么时候？」——一个挂了只读查询工具的对话页（MCP 或 function calling），把网站变成可以"问"的。
- **读书感想助手**：写完感想后让 AI 提炼金句、生成标签；或对"在读"的书做章节笔记整理。
- **月度小结自动生成**：每月 1 号定时任务汇总上月数据（消费、游戏时长、读完的书、完成的待办率）生成一篇草稿日志，你过目后发布。

### 5.3 新模块（同一套「条目+状态+标签+感想」骨架可以无限复制）

- **健康记录**：体重/运动打卡，Apple Health 导出文件解析，曲线图。
- **习惯打卡**：habit tracker 热力图，与待办模块联动。
- **相册**：旅行照片之外的独立照片流；或直接自托管 Immich，导航页挂个入口。
- **RSS 阅读器**：订阅源聚合，「稍后读」与书影模块打通。
- **播客 / 音乐记录**：MediaType 加 PODCAST / ALBUM 即可复用整套书影逻辑；音乐可接 Last.fm API 自动同步听歌记录。

### 5.4 同步源增强

- **Bangumi API** 同步动画/游戏标记（对动画用户是比豆瓣更好的源）。
- **Letterboxd / Goodreads / Trakt** 导入器（都提供 CSV 导出，复用 Stage 10 的通用导入向导，只需加映射预设）。
- **银行 / 信用卡账单解析器**：复用 Stage 12 的可插拔解析器架构，按你实际使用的银行 / 信用卡 CSV 格式各写一个 parser。
- **Steam 愿望单同步**、成就数据展示。

### 5.5 站点与运维

- 博客评论（giscus，基于 GitHub Discussions，零后端）与友链页。
- 访问统计自托管 umami；服务可用性监控 Uptime Kuma（定时任务的心跳监控 Healthchecks 已在 v2 并入 Stage 6/8 正篇）。
- 季节主题 / 年度主题皮肤：基于已有语义 token 扩展，不改组件结构。
- 多用户/家庭版：记账模块共享给家人——动这个之前先想清楚权限模型，改动不小。

> 初版列在这里的 PWA 已在 v2 并入 Stage 16 正篇（manifest + 图标的轻量版）。

### 5.6 已知技术债务（v2 新增：现在不修，但记在账上）

| 债 | 现状与触发条件 | 还法 |
|---|---|---|
| `tags String[]` 不是实体 | 三个模块各自一份字符串数组，改名/合并标签要扫全表；做"跨模块标签页"时会疼 | 届时抽 Tag 表 + 多对多，写一次性迁移脚本归一 |
| `TripDay.locations` 是 Json | 地点无法被单独查询/索引；做"城市维度统计""地点搜索"时受限 | 城市实体化时抽 Location 表 |
| `Post.views` 含爬虫噪音 | sendBeacon 简单去抖挡不住爬虫；数字看个乐 | 接 umami 后改读真实 PV，views 字段退役或仅做兜底 |
| 登录/快捷记账限流在内存 | 单实例没问题；重启清零，多实例完全失效 | 上多实例或被扫爆时换 Redis 限流 |

---
## 附录 A · AGENTS.md（复制到仓库根目录）

```markdown
# AGENTS.md

## 项目是什么
单用户的个人生活管理网站：游戏 / 书影 / 旅行 / 博客 / 消费 / 待办日历 / 导航 / 首页聚合。
完整实施方案见 docs/PLAN.md（按 Stage 推进，当前做到哪个 Stage 见 docs/PROGRESS.md 与我的指示）。

## 技术栈
Next.js (App Router) + TypeScript + Tailwind v4（CSS-first，@theme）+ shadcn/ui + lucide-react + next-themes + 自定义设计 token；
Prisma + PostgreSQL；Auth.js v5 Credentials（单用户）；
dayjs（zh-cn，UTC+8）；ECharts / FullCalendar / Leaflet 按需动态导入；
Vitest（单测）+ Playwright（冒烟）。

## 版本锁定（Stage 0 回填，之后只增不改）
| 包 | 版本 | 备注 |
|---|---|---|
| next / react | 待回填 | |
| tailwindcss | 待回填 | v4，CSS-first，禁止 v3 写法 |
| next-auth | 待回填 | beta，必须锁精确版本 |
| prisma / @prisma/client | 待回填 | |
| vitest / @playwright/test | 待回填 | |

- 根目录 `.npmrc` 已含 `save-exact=true`；新增任何依赖先在回复中说明用途与版本，并登记到本表。
- 禁止擅自升级大版本；遇到"教程写法与装的版本对不上"，以装的版本的官方文档为准。

## 硬性约定
1. 界面文案全部中文；本项目永远只有一个用户，禁止做注册/多租户。
2. 默认 Server Component；交互组件才 'use client'。
3. 所有写操作用 Server Action，且函数第一行校验 session（不信任 middleware 单层防护）。
4. 公开路由白名单：/login、/、/blog/**、/nav、/rss.xml、/uploads/**、/api/auth/**、/api/health、/api/posts/view、/api/quick/**（自带 Token 鉴权）；其余一律登录可见。改动白名单必须同步更新本条。
5. 金额一律 Prisma Decimal，禁止浮点参与计算；货币格式化用 src/lib/money.ts；Decimal 传给 Client Component 前必须 .toString()。
6. 日期时间统一 dayjs 处理，时区 UTC+8；@db.Date 字段比较用 format('YYYY-MM-DD')，禁止 toISOString() 截取。
7. schema 变更必须 prisma migrate dev 生成迁移文件并提交；禁止 db push。
8. 文件上传走 src/lib/storage.ts（public/private 两区，内置 sharp 管线：旋正/压缩/去 EXIF/缩略图），禁止散落各处自行写盘；图片上传只允许 jpeg/png/webp/gif，拒绝 svg。
9. 出站 HTTP 一律经 src/lib/http.ts（超时 + 重试 + 可选 OUTBOUND_PROXY）；外部图片（豆瓣/TMDB/NeoDB 等）必须服务端转存本地后存本地 URL，唯一例外是 Steam CDN 封面可热链。
10. 导入类功能遵循：解析 → 预览 → 确认 → 幂等写入（唯一键去重），重复导入零重复。
11. 跨模块机制：日历事件实现各模块 getEvents(start, end)；关键动作调 recordActivity()。
12. 移动端 375px 宽度必须可用，待办与记账页面以移动端优先设计。
13. 全站使用 docs/PLAN.md 1.7 的设计系统：公开页走编辑部，私密页走收藏册；禁止散写主题色、模块色和圆角。
14. 缓存纪律：私密页面动态渲染（不缓存）；公开博客/导航等静态化，任何影响公开内容的写操作后必须 revalidatePath 对应路径。
15. 每个 Stage 的完成定义是 npm run check（tsc + lint + vitest）全绿；格式解析、合并规则、日期边界这类逻辑必须先写或同步写单测。
16. 每个 Stage 结束更新 docs/PROGRESS.md：完成内容、关键文件、与 PLAN 的偏离、遗留 TODO。

## 设计规范
- 公开面（未登录首页、博客、导航、登录）使用「编辑部」方向：强排版、留白、克制酒红点缀，像一本你主编的月刊。
- 私密面（仪表盘、记录模块、后台）使用「收藏册」方向：温暖、圆润、模块色、徽章、封面墙和成就感。
- 颜色、圆角、模块色必须来自 `globals.css` 语义 token 与 `src/lib/design.ts`，不要在组件里散写 hex。
- 正文文字与背景对比度 ≥ 4.5:1（弱文字 --ink-3 也要达标）；改色后用对比度工具复测。
- 暗色模式必须同步可用；字体策略：正文中文用系统字体栈不打包，中文展示字体子集化自托管，西文 next/font 自托管；禁止运行时依赖 Google Fonts CDN。
- 富媒体是主角：游戏封面、书影封面、旅行照片、地图优先做大，不要全部塞进小卡片。
- 空状态、加载态、报错文案用自然中文，不写"暂无数据"这类模板话。
- 避开 AI 默认风：米色背景 + 高对比衬线大标题 + 陶土橙；近黑背景 + 荧光绿/朱红；报纸式细线分栏 + 零圆角。

## 工作方式
- 只做我当前指定 Stage 范围内的事，不顺手重构无关代码。
- 动手前先列实施计划，得到确认再写。
- 完成后：运行 npm run check 确认全绿 → 更新 docs/PROGRESS.md → 给出可逐条执行的自测/验收步骤。
```

---

## 附录 B · docs/PROGRESS.md 模板（复制到仓库 docs/ 目录）

```markdown
# 项目进度

## 当前状态
- 进行中：Stage 0
- 已完成：（无）
- 线上版本：（未上线）

---

## Stage 日志（倒序追加）

### Stage X · 名称 —— YYYY-MM-DD 完成
- 完成内容：一两句话。
- 关键文件：本 Stage 新增/大改的文件清单（含一句话用途）。
- 关键决定与偏离：与 PLAN.md 不一致的地方及原因（没有就写"无"）。
- 遗留 TODO：留给后续 Stage 的钩子（如 recordActivity 注释位置）。
- 验证：npm run check ✅ / 手工验收要点。
```

---

*文档完。建好仓库、放好 AGENTS.md 与 docs/PROGRESS.md，当天就发起 ICP 备案，然后从 Stage 0 开始吧。*
