# BUG_AUDIT_SPEC —— 漏洞审计规格（Codex /goal 引用）

> 本文件是"只找 bug、不修 bug"审计任务的契约附件。Agent 必须按本规格产出
> `docs/BUG_REPORT.md`，并在收尾时逐项对照文末"完成核对清单"自检。
> **代码是唯一事实来源**：与 `README.md`/`AGENTS.md`/`docs/PLAN.md`/`docs/PROGRESS.md`
> 冲突时以代码为准并指出。**修复只写建议，绝不改业务代码。**

---

## 0. 目标与产物

- **目标**：系统性审计全项目，尽可能多地发现**真实** bug，给出可执行的修复建议。
- **"尽可能多"无客观上界**，故"完成"以 **审计矩阵全扫 + 每条发现合规** 衡量，而非"已找全所有 bug"。
- **产物**：`docs/BUG_REPORT.md`（结构见第 6 节核对清单）。

---

## 1. 发现条目 Schema（每条 bug 必须包含）

| 字段 | 说明 |
|---|---|
| ID | `BUG-001`… 递增 |
| 标题 | 一句话概括 |
| 严重度 | Critical / High / Medium / Low（标准见第 2 节）|
| 置信度 | 已确认 / 很可能 / 疑似 |
| 类别 | 对应第 3 节维度 A–J |
| 证据 | `相对路径:行号`（+函数/导出名）；跨文件列多处 |
| 触发条件/复现路径 | 从哪个入口、什么输入/时序能走到它 |
| 根因 | 为什么会出问题 |
| 影响 | 安全/数据正确性/可用性/性能… |
| 修复建议 | 改哪、怎么改的**思路**（不要直接改代码）|
| 建议回归测试 | 极短的测试思路或断言（可选）|

---

## 2. 严重度判定标准

- **Critical**：未授权即可利用 → 数据泄露 / 越权 / 任意文件读写 / RCE；或导致数据损坏、丢失。
- **High**：认证用户可越权访问他人数据（IDOR）；SSRF 可达内网；金额/统计算错；导入数据被静默破坏。
- **Medium**：特定边界下逻辑错误；竞态导致偶发不一致；错误被吞难排查；缺校验但影响有限。
- **Low**：健壮性/体验问题；轻微不一致；缺日志；潜在但极难触发。

> 同时标"有证据 / 推测"。**推测项不得标 Critical/High，除非给出明确代码证据。**

---

## 3. 审计维度清单（A–J，每项必须扫到，按本项目技术栈定制）

### A. 认证与授权
- `(private)` 路由是否**全部**被有效保护；登录与会话（注意 `next-auth@5.0.0-beta.30` 为 beta，关注其已知风险）。
- **Server Action 鉴权**：每个 `src/modules/*/actions.ts` 导出的 server action 都是**可被直接调用的端点**——逐个确认是否做登录/权限校验（参照 `src/lib/action-auth.ts`、`src/lib/server-action-exports.test.ts`）。
- **IDOR/越权**：按 id 访问的资源（`media/[id]`、`trips/[id]`、posts、expenses 记录等）是否校验归属；先判断本应用是单用户还是多用户，据此评估越权风险。
- 受保护接口：`api/admin/export`（是否仅管理员）、`api/cron/steam-sync`（是否校验 cron secret 且用 `secure-compare`）、`api/files/private`（访问控制）。

### B. SSRF 与出站请求
- 所有出站抓取是否都经 `src/lib/ssrf.ts`：favicon（`links/favicon.ts`）、媒体元数据（`media/metadata.ts`）、nominatim（`trips/nominatim.ts`）、steam（`games/steam.ts`）。
- 防护是否可绕过：重定向跟随、DNS rebinding、IPv6/十进制/八进制 IP、`localhost`/内网段、非 http 协议、端口限制。
- 抓取是否有超时、大小上限、合规 UA（尤其 Nominatim 使用条款）。

### C. 注入与 XSS
- Prisma 是否有原始 SQL（`$queryRaw`/`$executeRaw`）及拼接风险。
- Markdown 渲染（react-markdown + remark-gfm + rehype-pretty-code/shiki）是否允许原始 HTML、是否有 `dangerouslySetInnerHTML`；用户内容（博客、链接标题、行程备注、媒体简介）是否被当 HTML 渲染。
- 开放重定向、用户提供 URL 注入到 `href`/`src`。

### D. 文件上传与路径遍历
- `api/upload` + `src/lib/storage.ts`：文件名/类型/大小校验、落盘位置、覆盖与遍历。
- `api/files/private/[...path]` 与 `src/app/uploads/[...path]`：**路径遍历**（`../`、绝对路径、编码绕过）、能否读到上传目录外文件、是否做归一化与前缀校验、私有文件鉴权。
- `sharp` 处理恶意/超大图片的异常路径。

### E. 数据正确性与业务逻辑
- **money**（`src/lib/money.ts` + expenses）：浮点 vs 整数分、四舍五入、币种、负数、求和/统计（`expenses/stats.ts`）准确性。
- **导入流水线**（expenses `parsers/*`、`import-parser`/`import-executor`；media `import-*`）：编码（`iconv-lite`）、表头/分隔符、空行、**重复导入去重**、**部分失败的事务性**、`xlsx` 解析边界。
- **日期/时区**（`src/lib/dayjs.ts`、calendar 聚合、stats 按月/日分桶）：本地时区 vs UTC 不一致、跨天边界。
- **排序/看板**（todos `@dnd-kit`）：重排序持久化、整数/分数索引、并发重排丢更新。
- **计数/聚合**（posts `view.ts` + `api/posts/view` + `view-beacon`）：重复计数、并发自增、beacon 滥用。
- **特殊日/提醒**（special-days `events.ts`）：周期重复、闰年/月末、提醒触发。
- **地理**（`src/lib/geo.ts`、trips footprint）：坐标合法性、距离/边界计算。

### F. 并发与事务
- 读改写未用 `prisma.$transaction` 的地方（计数、重排、导入、唯一约束竞态）。
- 关注 `20260618074000_add_activity_unique` 之前是否存在重复写入隐患；唯一约束冲突处理。

### G. 错误处理与健壮性
- server action / API 的 try-catch 缺失、错误被吞、把内部错误/堆栈泄露给前端；`action-state.ts` 错误回传一致性。
- 浮动 Promise / 缺 `await`；`Promise.all` 部分失败。
- 外部依赖（Steam/Nominatim/网络）失败时的降级。

### H. Next.js / 客户端-服务端边界
- `'use server'`/`'use client'` 边界：服务端密钥/`db`/Node-only 模块是否被打进客户端包；`NEXT_PUBLIC_` 误用泄露密钥。
- 缓存与重验证：`revalidatePath`/`revalidateTag` 缺失或过度 → 脏数据或越权缓存。
- 动态路由参数未校验（`[id]`/`[...path]`/`[slug]`/`[page]`）。
- Edge/Node runtime 不匹配。

### I. 配置与依赖
- 环境变量缺失/默认值不安全（对照 `.env.example`、`.env.production.example`）；构建期 vs 运行期变量。
- Docker/Caddy/CI（`deploy.yml`）安全项（暴露端口、密钥注入）、备份脚本 `backup.sh` 安全性。
- 依赖版本风险：`next-auth@5.0.0-beta.30`(beta)、`next@16`、`prisma@7`、`xlsx@0.18.5`（关注已知安全公告）等。

### J. 类型与静态检查（动态验证）
- 运行 `npm ci` 后执行 `npx tsc --noEmit`、`npm run lint`、`npm run check`（tsc+eslint+vitest），必要时 `npm run build`；把暴露的类型错误/告警/失败测试作为 bug 线索归档，**注明来自哪条命令、是否可复现**。

---

## 4. 覆盖矩阵（收尾自检用）

- 在报告里放一张矩阵：**行** = 10 个模块（dashboard/expenses/games/links/media/posts/settings/special-days/todos/trips）+ 横切（lib、api、部署）；**列** = 维度 A–J。每格标"已审 + 有/无发现"。
- 必须满足：**每个** `src/modules/*/actions.ts` 都过了 A（鉴权）；**每个**出站抓取点都过了 B（SSRF）；**每个** `[...path]`/`[id]`/`[slug]` 路由都过了 A/D/H。

---

## 5. 证据与质量规则（强制）

1. 每条发现必须有 `路径:行号` 证据，引用前用 `rg` 核对真实存在；**不臆造**。
2. 标注置信度；疑似项不得标 High/Critical，除非有明确代码证据。
3. 复现路径要可走通（从哪个入口、什么输入/时序触发）。
4. **不修改任何业务代码**；修复只写思路。
5. **误报控制**：对每条 High/Critical，自检一次"是否已有鉴权/SSRF/校验等防护把它挡掉了"，被挡掉的降级或剔除，并在附录"已排除项"中记录原因。
6. 临时探针文件（若有）收尾前删除。

---

## 6. 完成核对清单（逐项打勾，全过才 done）

- [ ] `docs/BUG_REPORT.md` 生成，含：**摘要**（按严重度统计的计数表）+ **覆盖矩阵** + **逐条发现**（符合第 1 节 Schema）+ **附录**（已排除的误报及原因、建议回归测试）。
- [ ] 维度 A–J **每项都被扫到**；覆盖矩阵**无空格**。
- [ ] **每个** `src/modules/*/actions.ts` 都过了鉴权审计；**每个**出站抓取点都过了 SSRF；**每个**动态路由都过了路径遍历/越权。
- [ ] 每条发现都有 **严重度 + 置信度 + `路径:行号`证据 + 修复建议**。
- [ ] 已运行 `tsc`/`lint`/`vitest`（及必要时 `build`），结果与相关发现已归档（注明命令与可复现性）。
- [ ] 报告内所有引用路径经 `rg`/`ls` 抽查存在；所有 High/Critical 已做误报自检。
- [ ] 临时探针已删除；`git diff --stat` **仅**显示 `docs/` 新增文件，**无任何既有文件被改动**，`package.json`/`package-lock.json` 未变。

> 全部勾选通过 → 任务完成、停止；任一未过 → 继续补全后再自检。
