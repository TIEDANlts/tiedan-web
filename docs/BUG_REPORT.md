# tiedan-web 缺陷审计报告

- 审计日期：2026-06-19
- 审计范围：全仓库源码、配置、迁移、测试与文档；仅产出本报告和 `docs/BUG_PROGRESS.md`。
- 审计依据：`docs/BUG_AUDIT_SPEC.md` 的 A-J 维度、严重度标准、发现条目 Schema、覆盖矩阵与误报控制规则。
- 结论概览：未发现 Critical / High 级别证据；本轮保留 17 条真实缺陷或条件性风险，其中 Medium 13 条、Low 4 条。

## 摘要

| 严重度 | 数量 | 说明 |
|---|---:|---|
| Critical | 0 | 未发现未授权数据泄露、RCE、任意文件读写或确定性数据丢失证据。 |
| High | 0 | 未发现可达内网 SSRF、跨用户 IDOR、金额统计确定性算错或导入数据静默破坏的 High 证据。 |
| Medium | 13 | 主要集中在认证限流覆盖、上传/导入边界、日期/时区、事务并发、依赖风险。 |
| Low | 4 | 主要是浏览量统计、排序健壮性与轻量数据一致性问题。 |

## 覆盖矩阵

标记含义：`已审-有` 表示该模块/维度发现至少一条报告项；`已审-无` 表示已审计但未保留发现。每格均已覆盖。

| 模块 | A 认证授权 | B SSRF | C 注入/XSS | D 上传/路径 | E 数据正确性 | F 并发事务 | G 错误健壮 | H Next 边界 | I 配置依赖 | J 静态验证 |
|---|---|---|---|---|---|---|---|---|---|---|
| dashboard | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 |
| expenses | 已审-无 | 已审-无 | 已审-无 | 已审-有 BUG-002 | 已审-有 BUG-006/010/011/012 | 已审-有 BUG-010 | 已审-有 BUG-002/012 | 已审-无 | 已审-有 BUG-005 | 已审-有 BUG-005/006 |
| games | 已审-无 | 已审-有 BUG-004 | 已审-无 | 已审-有 BUG-003 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 |
| links | 已审-无 | 已审-有 BUG-004 | 已审-无 | 已审-有 BUG-003 | 已审-有 BUG-017 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 |
| media | 已审-无 | 已审-有 BUG-004 | 已审-无 | 已审-有 BUG-002/003 | 已审-有 BUG-009 | 已审-无 | 已审-有 BUG-002 | 已审-无 | 已审-有 BUG-005 | 已审-有 BUG-005 |
| posts | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-有 BUG-015/016 | 已审-无 | 已审-有 BUG-016 | 已审-无 | 已审-无 | 已审-无 |
| settings | 已审-无 | 已审-无 | 已审-无 | 已审-有 BUG-003 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 |
| special-days | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 |
| todos | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-有 BUG-007 | 已审-无 | 已审-有 BUG-007 | 已审-有 BUG-007 | 已审-无 | 已审-无 |
| trips | 已审-无 | 已审-有 BUG-004 | 已审-无 | 已审-有 BUG-003 | 已审-有 BUG-008/012/013 | 已审-有 BUG-014 | 已审-有 BUG-012/013 | 已审-有 BUG-008/013 | 已审-无 | 已审-无 |
| lib | 已审-无 | 已审-有 BUG-004 | 已审-无 | 已审-有 BUG-003 | 已审-有 BUG-012 | 已审-无 | 已审-有 BUG-003/012 | 已审-无 | 已审-无 | 已审-无 |
| api | 已审-有 BUG-001 | 已审-有 BUG-004 | 已审-无 | 已审-有 BUG-003 | 已审-有 BUG-015/016 | 已审-无 | 已审-有 BUG-001/016 | 已审-无 | 已审-无 | 已审-无 |
| deployment | 已审-无 | 已审-有 BUG-004 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-无 | 已审-有 BUG-005 | 已审-有 BUG-005 |

## 发现列表

### BUG-001：Auth.js credentials 回调绕过登录页限流

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | A 认证与授权 / G 错误处理与健壮性 |
| 证据 | `src/app/api/auth/[...nextauth]/route.ts:3` 导出 Auth.js `GET/POST` handlers；`src/lib/auth/routes.ts:18` 将 `/api/auth/**` 公开；`src/app/(public)/login/actions.ts:28`、`:49` 的 `loginRateLimiter` 只包住登录页 Server Action；`src/auth.ts:20`、`:38` 的 `authorize()` 直接查用户并执行 `bcrypt.compare()`，没有同等限流。 |
| 触发条件/复现路径 | 未登录攻击者不走 `/login` 表单 action，而是直接请求 Auth.js credentials 登录回调路径（先获取 Auth.js 所需公开 CSRF，再提交用户名/密码）。请求进入 `src/auth.ts` 的 `authorize()`，不会经过 `loginAction()` 里的 IP 锁定逻辑。 |
| 根因 | 限流放在 UI 层 Server Action，而底层公开认证端点没有共享同一限流/锁定策略。 |
| 影响 | 可绕过自定义登录页的失败次数限制，放大单用户密码暴力尝试成本；bcrypt 会增加攻击成本，但不等于速率限制。 |
| 修复建议 | 将失败计数和锁定下沉到 `authorize()` 可达路径，或包裹 Auth.js route handler，对 IP + 用户名维度统一限流；登录页 action 与直接 Auth.js 回调共用同一 limiter。 |
| 建议回归测试 | 直接模拟 Auth.js credentials 回调连续失败，断言达到阈值后即使不经过 `loginAction()` 也返回锁定。 |

### BUG-002：消费和书影导入在 `arrayBuffer()` 前没有文件大小上限

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | D 文件上传与路径遍历 / G 错误处理与健壮性 |
| 证据 | `src/modules/expenses/actions.ts:328` 只检查 `file.size === 0`，`:332` 只检查 `.csv`，`:336` 直接 `Buffer.from(await file.arrayBuffer())`；`src/modules/media/actions.ts:345` 只检查空文件，`:349` 只检查扩展名，`:354` 直接读取完整文件；解析继续进入 `src/modules/expenses/parsers/common.ts:43` 和 `src/modules/media/import-parser.ts:87` 的 `XLSX.read()`。 |
| 触发条件/复现路径 | 登录后访问 `/expenses/import` 或 `/media/import`，上传超大 CSV/XLS/XLSX；服务端在业务解析前把整个文件读进内存。 |
| 根因 | 图片上传 API 在 `src/app/api/upload/route.ts:25-38` 先用 `assertLocalUploadSize(file.size)` 拦截，但导入 actions 没有复用类似上限，也没有流式/分块解析。 |
| 影响 | 单个认证请求即可造成高内存和 CPU 占用；个人站是单用户，影响主要是可用性和本机资源耗尽。 |
| 修复建议 | 为导入类文件设置明确上限，例如 CSV 5-10MB、XLSX 10-20MB；在 `arrayBuffer()` 之前检查 `file.size`，并在解析层限制行数/工作表尺寸。 |
| 建议回归测试 | 构造 `File` mock，`size` 超过上限时断言 action 在调用 `arrayBuffer()` 前返回错误。 |

### BUG-003：上传类型只信 MIME/扩展名，SVG 伪装成 PNG 会被接受

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | D 文件上传与路径遍历 |
| 证据 | `src/lib/storage.ts:183-190` 的 `detectImageType()` 使用 `contentType` 或文件名推断类型，只在 MIME 为 `image/svg+xml` 或文件名 `.svg` 时拒绝；`src/lib/storage.ts:306-309` 随后把该推断结果交给 `save()`；`src/lib/storage.ts:323-325` 调用 sharp 处理并写出文件。审计探针用 SVG 字节、`contentType: "image/png"`、`filename: "probe.png"` 调用 `save()`，结果返回 `/uploads/probe/...webp`，说明内容被接受并重编码。 |
| 触发条件/复现路径 | 登录后通过 `/api/upload` 上传 SVG 内容，但伪造浏览器侧 `File.type` 为 `image/png` 且文件名为 `.png`。 |
| 根因 | 上传白名单校验没有对文件魔数或 sharp metadata 的实际格式做二次确认。 |
| 影响 | 不会原样暴露 SVG XSS，因为输出为 webp/jpg；但违反“拒绝 SVG”边界，并把 SVG 解析交给 sharp/libvips，增加恶意 SVG 触发解析器问题的风险。 |
| 修复建议 | 先用 `sharp(buffer).metadata().format` 或可靠魔数库确认真实格式，只允许 jpeg/png/webp/gif；检测到 `svg` 时即使 MIME/文件名伪装也拒绝。 |
| 建议回归测试 | 用 SVG 字节 + `image/png` + `.png` 文件名调用 `save()`，断言返回 `UNSUPPORTED_TYPE`。 |

### BUG-004：配置 `OUTBOUND_PROXY` 后出站请求失去连接阶段 DNS 私网校验

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 很可能 |
| 类别 | B SSRF 与出站请求 / I 配置与依赖 |
| 证据 | 无代理时 `src/lib/http.ts:33-40` 使用 `createGuardedLookup(dnsLookup)`；但 `src/lib/http.ts:48-59` 一旦存在 `OUTBOUND_PROXY` 就返回 `new ProxyAgent(proxyUrl)`；`src/lib/http.ts:104-124` 仍只做请求前 `assertSafeOutboundUrl()`，而 `src/lib/ssrf.ts:120` 注释说明主机名需要留给连接阶段 lookup 校验；连接阶段校验实现位于 `src/lib/ssrf.ts:164`。 |
| 触发条件/复现路径 | 生产配置 `OUTBOUND_PROXY` 后，用户提交一个表面为公网域名、但解析或代理侧转发到私网地址的远程封面/favicon/元数据 URL。字面量 `127.0.0.1` 仍会被 URL 级校验挡住，但主机名的真实连接 IP 不再由本进程 `createGuardedLookup()` 校验。 |
| 根因 | `ProxyAgent` 分支没有等价的 DNS/IP 校验，安全边界依赖代理自身策略。 |
| 影响 | 条件性 SSRF 风险：若代理允许访问内网或云元数据网段，SSRF 防护退化。因为需要特定代理行为，本项不标 High。 |
| 修复建议 | 明确禁止代理访问私网，或使用支持连接目标校验的代理方案；至少在文档和启动校验中声明 `OUTBOUND_PROXY` 必须由可信出站代理执行私网拒绝。 |
| 建议回归测试 | 在测试里模拟 `OUTBOUND_PROXY` 分支，验证主机名解析到私网时仍被拒绝；如果无法本进程校验，则增加配置校验和文档测试。 |

### BUG-005：`xlsx@0.18.5` 存在 npm audit 高危公告且用于上传解析

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | I 配置与依赖 / J 类型与静态检查 |
| 证据 | `package.json:57` 和 `package-lock.json:18676-18678` 锁定 `xlsx@0.18.5`；上传解析路径在 `src/modules/expenses/parsers/common.ts:43` 与 `src/modules/media/import-parser.ts:87` 调用 `XLSX.read()`。本轮 `npm.cmd audit --json --cache .\.npm-cache` 报告 `xlsx` 存在 `GHSA-4r6h-8v6p-xvw6` Prototype Pollution 与 `GHSA-5pgg-2g8v-p4x9` ReDoS，`fixAvailable` 不可用。 |
| 触发条件/复现路径 | 登录用户上传恶意构造的 XLS/XLSX/伪 CSV 表格文件，服务端进入 `XLSX.read()`。 |
| 根因 | 使用的 SheetJS 社区版版本被 npm audit 标为受影响，且导入入口会处理用户提供文件。 |
| 影响 | 个人单用户站点下不是未授权远程攻击；但导入功能直接解析用户文件，存在解析器 DoS 或原型污染风险。 |
| 修复建议 | 评估替换为维护中的解析库，或隔离解析进程并限制文件大小、行数和超时；继续跟踪 SheetJS 修复版本，若升级不可行则在导入层做更严格资源限制。 |
| 建议回归测试 | 加入超大/畸形 XLSX fixture，断言解析能在限定时间内失败，并且不会污染对象原型。 |

### BUG-006：消费周报跨年 ISO 周年份计算错误

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | E 数据正确性与业务逻辑 / J 类型与静态检查 |
| 证据 | `src/modules/expenses/stats.ts:49-51` 的 `toWeekValue()` 用日历年 `format("YYYY")` 拼接 ISO 周；`src/modules/expenses/stats.ts:54-56` 的 `weekStart()` 按传入年份的 1 月 4 日推周起点；`src/modules/expenses/stats.ts:67` 默认周使用 `toWeekValue(current)`。审计探针：`parseExpenseStatsParams({view:"week"}, new Date("2024-12-30T04:00:00Z"))` 返回 `week:"2024-W01"`，但 2024-12-30 属于 ISO `2025-W01`。 |
| 触发条件/复现路径 | 在上海时区日期落在跨年 ISO 周时访问 `/expenses/stats?view=week`，例如 2024-12-30。 |
| 根因 | ISO 周号和 ISO week-year 是一组值，不能用日历年 `YYYY` 代替 week-year。 |
| 影响 | 周报默认范围跳到错误年份的第 1 周，周消费统计、上一周/下一周导航都不可信。 |
| 修复建议 | 使用 dayjs isoWeekYear 插件或等价逻辑生成 ISO week-year；`toWeekValue()` 和 `weekStart()` 应以同一 ISO 规则往返校验。 |
| 建议回归测试 | 增加 2024-12-30、2025-01-01、2026-12-31 等跨年样例，断言 week 值和起止范围正确。 |

### BUG-007：待办日期只验正则，非法日期会被 JS Date 静默归一化

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | E 数据正确性与业务逻辑 / H Next.js 边界 |
| 证据 | `src/modules/todos/utils.ts:55-66` 的 `normalizeDateInput()` 只检查 `YYYY-MM-DD` 正则；`src/modules/todos/utils.ts:69-70` 的 `dateToTodoDb()` 直接 `new Date()`；创建路径 `src/modules/todos/utils.ts:73-103` 会使用该日期；改期 action 在 `src/modules/todos/actions.ts:73-78` 直接调用 `dateToTodoDb(date)`。审计探针显示 `dateToTodoDb("2026-02-31")` 得到 `2026-03-03T00:00:00.000Z`。 |
| 触发条件/复现路径 | 直接调用 `createTodoAction` 或 `updateTodoDateAction`，传入 `2026-02-31` 这类不存在日期。浏览器日期控件通常不会生成该值，但 Server Action 可被直接调用。 |
| 根因 | 只做格式校验，没有做构造后的往返日期校验。 |
| 影响 | 待办会被静默移动到另一天，日历和逾期逻辑随之错误。 |
| 修复建议 | 构造日期后用 `formatShanghaiDate(date) === input` 校验；无效日期返回 action 错误而不是写库。 |
| 建议回归测试 | `readCreateTodoFormData` 和 `updateTodoDateAction` 分别覆盖 `2026-02-31`，断言拒绝。 |

### BUG-008：旅行开始/结束日期接受不存在日期并生成错误 TripDay

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | E 数据正确性与业务逻辑 / H Next.js 边界 |
| 证据 | `src/modules/trips/utils.ts:69-74` 的 `isDateInput()` 只检查正则和 `Date` 非 NaN；`src/modules/trips/utils.ts:81-87` 的 `enumerateTripDates()` 基于归一化后的 `Date` 展开；`src/modules/trips/utils.ts:138-147` 校验开始/结束日期时复用该逻辑；`src/modules/trips/actions.ts:48-55` 创建行程并生成 TripDay，更新路径在 `src/modules/trips/actions.ts:96-114` 同步天数。审计探针显示 `normalizeTripInput({startDate:"2026-02-31", endDate:"2026-03-05"})` 返回 ok，并写成 2026-03-03 到 2026-03-05。 |
| 触发条件/复现路径 | 登录后直接提交 `createTripAction` 或 `updateTripOverviewAction`，传 `startDate=2026-02-31`。 |
| 根因 | 日期有效性校验没有做往返比对，JS Date 自动把不存在日期滚到下个月。 |
| 影响 | 行程日期和 `TripDay` 明细被静默改写，照片/地点/日历事件都落在错误日期。 |
| 修复建议 | 复用严格日期解析 helper：正则、构造、`formatShanghaiDate(date) === input` 三步都通过才允许写库。 |
| 建议回归测试 | 对 `normalizeTripInput` 覆盖 `2026-02-31`、`2026-13-01`、闰年 `2024-02-29`。 |

### BUG-009：书影导入标记日期可静默写偏

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | E 数据正确性与业务逻辑 |
| 证据 | `src/modules/media/import-parser.ts:254-263` 的 `normalizeDateText()` 只从字符串中抽取年月日并补零；`src/modules/media/import-parser.ts:298` 把该值写入 `markedAt`；`src/modules/media/import-executor.ts:44-45` 的 `dbDate()` 直接构造 `Date`；`src/modules/media/import-executor.ts:48-53` 根据状态写入 `startedAt` 或 `finishedAt`。审计探针显示 `标记日期=2026-02-31` 会被解析为 `markedAt:"2026-02-31"`，后续 `new Date()` 会归一化。 |
| 触发条件/复现路径 | 在 `/media/import` 导入一行 `标题=x, 状态=DONE, 标记日期=2026-02-31`，执行导入时 `finishedAt` 会落到 2026-03-03。 |
| 根因 | 导入解析和执行层均缺少日期往返校验；手动表单的 `src/modules/media/utils.ts:191-205` 已有严格校验，但导入路径未复用。 |
| 影响 | 书影完成/在读日期错误，年度统计、日历和时间线被污染。 |
| 修复建议 | 导入解析阶段对 `markedAt` 使用同一严格日期 helper，无效日期应进入行级错误。 |
| 建议回归测试 | 在 media import fixture 中加入非法日期行，断言预览显示行错误且不会写入 `finishedAt`。 |

### BUG-010：账单导入未去重同文件 `txnNo`，事务内捕获唯一冲突可能导致整批回滚

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 很可能 |
| 类别 | E 数据正确性与业务逻辑 / F 并发与事务 |
| 证据 | 数据库唯一约束在 `prisma/schema.prisma:162`；`src/modules/expenses/import-executor.ts:91-102` 只过滤数据库中已存在的 `existingTxnNos`，没有对当前文件内重复 `txnNo` 建 seen set；执行层在 `src/modules/expenses/actions.ts:405-410` 对每行 `tx.transaction.create()` 捕获所有错误后继续，最后 `src/modules/expenses/actions.ts:414-416` 更新批次统计。 |
| 触发条件/复现路径 | CSV 中同一平台同一 `txnNo` 出现两次，且导入前数据库没有该 txnNo。第一行创建成功，第二行触发唯一约束。PostgreSQL 事务内发生唯一冲突后通常会进入 aborted 状态，即使 catch 了异常，后续 `importBatch.update` 也可能失败并回滚整批。 |
| 根因 | 预处理没有同批次去重；事务内用 catch 当作行级容错，但数据库唯一冲突不是普通可继续错误。 |
| 影响 | 重复行可能导致整批导入失败或统计不一致；用户看到的“跳过重复行”预期与实际事务语义不匹配。 |
| 修复建议 | 在 `normalizeImportRowsForCreate()` 前按 `platform + txnNo` 对当前文件去重，把同文件重复计入 skipped；唯一冲突使用 `createMany({ skipDuplicates: true })` 或逐行独立事务/保存点策略。 |
| 建议回归测试 | 构造同文件重复 `txnNo` fixture，断言只插入一条、批次 skipped 正确且 action 不抛 500。 |

### BUG-011：账单导入 skipped 统计按 Set 大小计数，会少算重复行

| 字段 | 内容 |
|---|---|
| 严重度 | Low |
| 置信度 | 已确认 |
| 类别 | E 数据正确性与业务逻辑 |
| 证据 | `src/modules/expenses/actions.ts:389` 得到数据库已存在交易号 Set；`src/modules/expenses/actions.ts:399`、`:403` 使用 `existingBefore.size + parsed.filteredRows.length` 初始化 skipped；`src/modules/expenses/import-executor.ts:71` 用行数统计 duplicate，但执行路径没有复用；`src/modules/expenses/import-executor.ts:91-92` 会过滤所有命中 Set 的重复行。 |
| 触发条件/复现路径 | 数据库已有 `txnNo=abc`，CSV 中有 3 行 `abc`。执行导入时 3 行都会被过滤，但 skipped 初始值只加 `existingBefore.size`，也就是 1。 |
| 根因 | 统计口径把“已有交易号集合大小”当成“被跳过行数”。 |
| 影响 | 导入结果页和历史记录 `inserted + skipped` 小于实际处理行数，影响用户核对账单。 |
| 修复建议 | 执行阶段按 `parsed.rows.filter(row => existingBefore.has(row.txnNo)).length` 统计已有重复行，和预览统计保持一致。 |
| 建议回归测试 | 构造数据库已有 txnNo 且 CSV 中多次出现的场景，断言 batch.skipped 等于重复行数。 |

### BUG-012：金额和旅行预算缺少应用层精度上限，超过 `Decimal(12,2)` 会写库失败

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 很可能 |
| 类别 | E 数据正确性与业务逻辑 / G 错误处理与健壮性 |
| 证据 | `src/lib/money.ts:36-48` 的 `normalizeMoneyAmount()` 只限制格式和大于 0；`src/modules/trips/utils.ts:109-120` 的 `normalizeBudget()` 也只限制格式；数据库列分别是 `prisma/schema.prisma:148` 的 `Transaction.amount Decimal @db.Decimal(12, 2)` 和 `prisma/schema.prisma:204` 的 `Trip.budget Decimal? @db.Decimal(12, 2)`；手动记账在 `src/modules/expenses/actions.ts:66-67` 直接写入。 |
| 触发条件/复现路径 | 登录后手动记账输入 `10000000000.00`，或旅行预算输入同值。应用层校验通过，但 PostgreSQL `Decimal(12,2)` 最多允许 10 位整数 + 2 位小数，写入会报错。 |
| 根因 | 应用层金额 helper 没有和数据库精度约束对齐，也没有在 action 层捕获该类 Prisma 写入错误。 |
| 影响 | 用户收到 500 或通用错误，表单状态不稳定；快捷记账 API 同类输入也会在 `src/app/api/quick/expense/route.ts:39-40` 写库时报错。 |
| 修复建议 | 在 `normalizeMoneyAmount()` 和 `normalizeBudget()` 中限制最大值不超过 `9999999999.99`，并对 Prisma decimal overflow 做友好错误。 |
| 建议回归测试 | 覆盖 `9999999999.99` 通过、`10000000000.00` 拒绝；手动记账和旅行预算都测。 |

### BUG-013：旅行地点坐标只检查 finite，不校验经纬度范围

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 已确认 |
| 类别 | E 数据正确性与业务逻辑 / H Next.js 边界 |
| 证据 | `src/modules/trips/actions.ts:181-187` 只把 `lat/lng` 转成数字并检查 `Number.isFinite()`；`src/modules/trips/actions.ts:193-200` 写回 JSON；`src/modules/trips/utils.ts:212-215` 读取历史地点时同样只检查 finite；地图直接用 `src/app/(private)/trips/trip-map.tsx:34-53` 和 `src/app/(private)/trips/footprint/footprint-map.tsx:23-46` 的坐标渲染。 |
| 触发条件/复现路径 | 登录后直接调用 `addTripLocationAction({ dayId, name:"bad", lat:999, lng:999 })`。 |
| 根因 | 缺少经纬度范围校验：纬度应为 `[-90, 90]`，经度应为 `[-180, 180]`；GCJ-02 转换前后也应保证范围。 |
| 影响 | 非法坐标会持久化，导致行程地图/足迹图定位异常，甚至触发 Leaflet 对非法 LatLng 的运行时错误。 |
| 修复建议 | 在 action 和 `parseTripLocations()` 层同时校验范围；对历史非法数据读取时过滤或迁移清洗。 |
| 建议回归测试 | `lat=999/lng=999` 应被 action 拒绝；历史 JSON 中非法点应被 `parseTripLocations()` 丢弃。 |

### BUG-014：旅行地点 JSON 读改写存在并发丢更新

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 置信度 | 很可能 |
| 类别 | F 并发与事务 / E 数据正确性与业务逻辑 |
| 证据 | `src/modules/trips/actions.ts:172-174` 先读取 `locations`，`src/modules/trips/actions.ts:188-195` 在内存追加新点，`src/modules/trips/actions.ts:198-200` 整列写回；删除路径 `src/modules/trips/actions.ts:211-223` 同样先读数组再整列写回。 |
| 触发条件/复现路径 | 两个浏览器标签页同时给同一个 `TripDay` 添加地点 A/B；两个请求都读到旧 locations，后完成的请求覆盖先完成的写入。 |
| 根因 | JSON 数组作为整体读改写，没有事务锁、版本号或原子 append 操作。 |
| 影响 | 偶发丢失地点或删除恢复，用户很难定位原因。 |
| 修复建议 | 将地点实体化为 `TripLocation` 表，或给 `TripDay` 增加版本号并在 update where 中做乐观锁；至少把 add/remove 包进事务并检测 affected rows。 |
| 建议回归测试 | 模拟两个并发 add 请求，断言最终 locations 同时包含 A/B。 |

### BUG-015：公开浏览量 API 信任客户端 `X-Forwarded-For`，可伪造 IP 绕过去重

| 字段 | 内容 |
|---|---|
| 严重度 | Low |
| 置信度 | 已确认 |
| 类别 | E 数据正确性与业务逻辑 |
| 证据 | `src/app/api/posts/view/route.ts:5-8` 优先读取请求头 `x-forwarded-for` 和 `x-real-ip`；`src/app/api/posts/view/route.ts:27` 把该值传给 `recordPostView()`；去重 key 在 `src/modules/posts/view.ts:34-44` 使用 `ip + slug`；成功更新在 `src/modules/posts/view.ts:53-60` 对 views 自增；`src/lib/auth/routes.ts:20` 将 `/api/posts/view` 公开。 |
| 触发条件/复现路径 | 未登录访问者重复 POST `/api/posts/view`，body 为同一 published slug，但每次设置不同 `X-Forwarded-For`。 |
| 根因 | 应用层信任了可由客户端伪造的转发头，没有限定可信反向代理注入来源。 |
| 影响 | 公开文章浏览量可被低成本刷高；这是统计完整性问题，不涉及私密数据。 |
| 修复建议 | 只在可信代理层覆盖并清洗 `X-Forwarded-For`，应用读取框架提供的真实客户端 IP；或改用匿名 cookie + IP 的组合限流。 |
| 建议回归测试 | 模拟同一请求源但伪造不同 `X-Forwarded-For`，断言不会重复计数。 |

### BUG-016：浏览量去重键在数据库确认成功前被消费

| 字段 | 内容 |
|---|---|
| 严重度 | Low |
| 置信度 | 很可能 |
| 类别 | E 数据正确性与业务逻辑 / G 错误处理与健壮性 |
| 证据 | `src/modules/posts/view.ts:34-44` 的 `shouldCountView()` 在数据库更新前就 `viewDebounce.set(key, now)`；`src/modules/posts/view.ts:48-65` 随后才执行 `updateMany()`，并用 `updated.count > 0` 返回是否计数。 |
| 触发条件/复现路径 | 同 IP 先 POST 一个不存在或未发布的 slug，`updated.count=0`，但 debounce key 已写入；10 分钟内该 slug 发布后，同 IP 首次真实访问会被跳过。 |
| 根因 | 去重状态更新早于持久化成功确认，失败路径没有回滚。 |
| 影响 | 少量真实浏览被漏计；排查困难，因为 API 返回 `counted:false` 但内存状态已改变。 |
| 修复建议 | 把 debounce set 移到 `updated.count > 0` 后；或者让 `shouldCountView` 只判断不写入，成功后单独 commit。 |
| 建议回归测试 | 对不存在 slug 调一次后再模拟 published slug，断言第二次仍能计数。 |

### BUG-017：排序 action 接受子集 ID，会制造重复 sort 值

| 字段 | 内容 |
|---|---|
| 严重度 | Low |
| 置信度 | 已确认 |
| 类别 | E 数据正确性与业务逻辑 / F 并发与事务 |
| 证据 | 链接排序 helper `src/modules/links/utils.ts:125-136` 只对传入且属于分组的 `orderedIds` 重新编号，未要求覆盖完整分组；`src/modules/links/actions.ts:138-151` 直接写入这些 sort。消费分类排序 `src/modules/expenses/actions.ts:248-260` 同样只更新传入 ID。 |
| 触发条件/复现路径 | 认证用户直接调用 `reorderLinksAction("工具", ["第二个链接id"])`，第二个链接被写为 `sort=0`，原第一个链接仍为 `sort=0`；消费分类传子集也会产生重复 sort。 |
| 根因 | Server Action 默认信任客户端发送完整排序列表；但 Server Action 是可直接调用端点，服务端没有校验“传入集合等于当前集合”。 |
| 影响 | 后台和公开页排序不稳定，后续拖拽可能在重复 sort 基础上继续产生混乱。 |
| 修复建议 | 服务端校验 `orderedIds` 去重后必须与当前集合完全一致；不一致时返回错误，不写入部分排序。 |
| 建议回归测试 | 传缺失 ID、重复 ID、跨分组 ID，断言 action 拒绝且数据库 sort 不变。 |

## 验证命令归档

| 命令 | 结果 | 可复现性/备注 |
|---|---|---|
| `npm.cmd ci --cache .\.npm-cache --prefer-offline=false` | 首次因 npm 缓存/注册表 tarball 权限失败。 | 普通沙箱下失败，后续使用本地缓存并授权执行。 |
| `npm.cmd ci --cache .\.npm-cache` | 通过。 | 安装后 npm 提示 6 个漏洞（5 moderate，1 high）。 |
| `npx.cmd tsc --noEmit` | 通过。 | 未暴露类型错误。 |
| `npm.cmd run lint` | 通过。 | 未暴露 lint 错误。 |
| `npx.cmd vitest run` | 首跑失败，原因是 `npm ci` 后 Prisma Client 未生成。 | 失败点为多个 suite 找不到 `.prisma/client/default`，属于环境生成步骤缺失线索。 |
| `npx.cmd prisma generate` | 通过。 | 生成 Prisma Client。 |
| `npx.cmd vitest run` | 通过，48 个测试文件 / 263 条测试。 | 生成 Prisma Client 后复跑通过。 |
| `npm.cmd run check` | 通过，包含 tsc + lint + vitest。 | 48 个测试文件 / 263 条测试。 |
| `npm.cmd audit --json --cache .\.npm-cache` | exit 1，发现依赖公告。 | `xlsx@0.18.5` 高危 2 条且无可用自动修复；`postcss`、`@hono/node-server` 为 moderate。 |
| `npx.cmd tsx -e ...` 纯函数探针 | 通过执行，确认 BUG-006/007/008/009。 | 仅只读调用纯函数，无修改业务文件。 |
| `npx.cmd tsx -e ... save(svg as png)` 上传探针 | 返回 `ACCEPTED`，确认 BUG-003。 | 写入临时 `.audit-upload-probe/`，收尾前删除。 |

未运行 `npm run build`：本轮 `tsc`、`lint`、`vitest`、`npm run check` 已覆盖 SPEC 要求的必跑静态/单测门禁；审计过程中未出现必须通过 Next build 才能判定的构建期缓存或路由问题。

## 附录 A：已排除的误报与原因

- 未鉴权 Server Action：逐个审计 `src/modules/*/actions.ts`，导出 action 均在业务读写前调用 `auth()` 或本地 `require*Session()`；`loginAction`/`signOutAction` 属语义例外。
- 受保护 API 未鉴权：`/api/upload`、`/api/files/private/[...path]`、`/api/admin/export`、`/api/calendar/events`、`/api/trips/nominatim` 均有登录或 token 校验；`/api/cron/steam-sync` 与 `/api/quick/**` 使用 Bearer Token 和 `secureTokenEqual()`。
- 单用户 IDOR：数据模型没有多用户归属列，项目约定为单用户；按 id 访问私密资源仍需要登录，因此未按多租户 IDOR 计 High。
- 上传路径遍历：`src/lib/storage.ts:153-180` 使用 `path.resolve` + `path.relative` 前缀校验；`/uploads/[...path]` 和 `/api/files/private/[...path]` 都走 `assertPublicUploadPath`/`assertPrivateUploadPath`。
- 常规远程 URL SSRF：`assertSafeOutboundUrl()` 阻止非 http(s)、localhost 和字面量私网 IP；无代理分支使用 `createGuardedLookup()` 处理真实解析 IP。仅 `OUTBOUND_PROXY` 条件性退化保留为 BUG-004。
- Markdown XSS：未发现 `rehypeRaw` 或应用源码中的 `dangerouslySetInnerHTML` 用于用户 Markdown；`react-markdown` 默认不渲染原始 HTML。
- 原始 SQL 拼接：`$queryRaw` 出现在消费统计中，使用 Prisma tagged template 参数插值；未发现字符串拼接 SQL。
- 金额浮点累计：`src/lib/money.ts:29-33` 使用 `Prisma.Decimal` 求和，未发现 JS 浮点累加金额。
- 书影手动日期表单：`src/modules/media/utils.ts:191-205` 已做日期往返校验，BUG-009 仅限导入路径。
- 图片上传大小：普通 `/api/upload` 已在 `file.arrayBuffer()` 前检查 `file.size`；BUG-002 仅限消费/书影导入。

## 附录 B：建议回归测试清单

- Auth：直接请求 Auth.js credentials 回调，多次失败后应被统一限流。
- 上传：SVG 字节伪装 PNG 应被拒绝；导入文件超过上限时不得调用 `arrayBuffer()`。
- SSRF：配置代理时仍应拒绝解析到私网的主机名，或启动时显式阻止不安全代理配置。
- 日期：待办、旅行、书影导入都覆盖 `2026-02-31`、闰年 `2024-02-29`、跨年边界。
- 消费统计：覆盖 ISO week-year 跨年，如 2024-12-30 属于 2025-W01。
- 导入：同文件重复 txnNo、数据库已有 txnNo 多次出现、并发导入重复 txnNo。
- 金额：最大值边界覆盖 `9999999999.99` 与 `10000000000.00`。
- 旅行地点：非法坐标范围、两个并发地点添加、删除与添加交错。
- 浏览量：伪造 XFF 不应重复计数；不存在 slug 不应消耗真实访问的去重窗口。
- 排序：传入子集、重复 ID、跨分组 ID 应拒绝并保持原 sort。

## 完成核对清单

- [x] `docs/BUG_REPORT.md` 已生成，含摘要、覆盖矩阵、逐条发现和附录。
- [x] 维度 A-J 均已审计，覆盖矩阵无空格。
- [x] 每个 `src/modules/*/actions.ts` 已过鉴权审计；每个出站抓取点已过 SSRF 审计；每个 `[...path]`/`[id]`/`[slug]`/`[page]` 动态路由已过路径遍历/越权审计。
- [x] 每条发现均包含严重度、置信度、`路径:行号` 证据和修复建议。
- [x] 已运行 `tsc`、`lint`、`vitest`、`npm run check`；结果已归档。
- [x] 报告内引用路径已用 `rg`/逐行读取抽查；本轮无 High/Critical，仍已对高风险候选做误报自检。
- [x] 临时探针已删除；`git diff --stat` 仅显示 `docs/` 新增文件，且 `package.json`/`package-lock.json` 未变。
