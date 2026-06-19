# 缺陷审计进度

> 范围：只读审计源码、配置、文档与测试；仅新增本文件与 `docs/BUG_REPORT.md`，不修改业务代码。

## CP1 - 静态检查与数据模型
- 时间：2026-06-19
- 已审范围：已读取 `docs/BUG_AUDIT_SPEC.md`、`AGENTS.md`、`docs/PLAN.md`、`docs/PROGRESS.md`、`prisma/schema.prisma`，开始梳理迁移与检查命令。
- 发现数与最高严重度：0，最高无。
- 还差什么：运行 `npm ci`、`npx tsc --noEmit`、`npm run lint`、`npx vitest run`/`npm run check`；继续审计迁移历史与高危入口。
- 是否受阻：否。

## CP1 - 补充记录：静态检查与数据模型
- 时间：2026-06-19
- 已审范围：`prisma/schema.prisma`、`prisma/migrations/**`、`package.json`/`package-lock.json`、`npm ci`、`tsc`、`lint`、`vitest`、`npm run check`、`npm audit --json`。
- 发现数与最高严重度：依赖风险 1 条候选，最高 Medium；检查命令本身未暴露类型/lint/单测失败。
- 还差什么：继续把安全入口与业务边界逐项映射到报告覆盖矩阵。
- 是否受阻：`npm ci` 普通缓存路径受权限影响，改用本地 `.npm-cache` 并经授权后成功；`vitest` 首跑因 Prisma Client 未生成失败，`npx.cmd prisma generate` 后复跑通过。

## CP2 - 鉴权与越权
- 时间：2026-06-19
- 已审范围：`src/middleware.ts`、`src/lib/auth/**`、`src/auth.ts`、`src/app/(public)/login/actions.ts`、全部 `src/modules/*/actions.ts`、`src/app/api/**/route.ts`、私密动态页面。
- 发现数与最高严重度：1 条，最高 Medium；全部模块 Server Action 均在业务写入前做 session 校验，单用户模型下未发现跨用户 IDOR。
- 还差什么：在报告中记录 Auth.js credentials API 绕过登录页限流，并把已排除的“未鉴权 action/API”误报写入附录。
- 是否受阻：否。

## CP3 - SSRF、上传与路径遍历
- 时间：2026-06-19
- 已审范围：`src/lib/http.ts`、`src/lib/ssrf.ts`、`src/lib/storage.ts`、`src/app/api/upload/route.ts`、`src/app/uploads/[...path]/route.ts`、`src/app/api/files/private/[...path]/route.ts`、`links/favicon.ts`、`media/metadata.ts`、`media/actions.ts`、`games/steam.ts`、`trips/nominatim.ts`、`api/cron/steam-sync`。
- 发现数与最高严重度：3 条候选，最高 Medium；路径遍历候选被 `assertInsideRoot` 挡住；无代理出站 DNS 解析有受控 lookup；`OUTBOUND_PROXY` 场景存在条件性 DNS 防护退化。
- 还差什么：收尾前删除 `.audit-upload-probe`；在附录记录 SVG 伪装探针命令与结果。
- 是否受阻：否。

## CP4 - 注入、XSS 与客户端/服务端边界
- 时间：2026-06-19
- 已审范围：原始 SQL 搜索、Markdown 渲染、`dangerouslySetInnerHTML`/`rehypeRaw`、用户 URL 写入 `href`/`src`、`'use client'` 边界、公开路由与动态参数。
- 发现数与最高严重度：0 条新增；未发现拼接 SQL，Markdown 未启用 raw HTML，公开博客渲染未发现直接 HTML 注入。
- 还差什么：将 Markdown XSS、路径穿越、原始 SQL 拼接作为已排除误报写入报告附录。
- 是否受阻：否。

## CP5 - 数据正确性、并发事务与错误处理
- 时间：2026-06-19
- 已审范围：`money`、消费统计、消费/书影导入、待办日期、旅行日期/坐标/地点 JSON、博客浏览量、特殊日、日历事件、活动流唯一约束。
- 发现数与最高严重度：9 条候选，最高 Medium；纯函数探针确认 ISO 周跨年、非法日期归一化与书影导入日期问题。
- 还差什么：在报告中按证据行号重编号并控制严重度；对未实测 DB 写入的项标“很可能”或降级。
- 是否受阻：否。

## CP6 - 配置与依赖风险
- 时间：2026-06-19
- 已审范围：`.env.example`、`.env.production.example`、`Dockerfile`、`docker-compose.dev.yml`、`.github/workflows/deploy.yml`、`scripts/backup.sh`、`package.json`、`package-lock.json`、`npm audit --json`。
- 发现数与最高严重度：1 条，最高 Medium；生产示例密钥均为占位，部署脚本使用 GitHub secrets，备份脚本要求 rclone crypt remote。
- 还差什么：报告中记录 `xlsx@0.18.5` 的 audit 结果和无可用修复提示。
- 是否受阻：否。

## CP7 - 误报自检与定稿
- 时间：2026-06-19
- 已审范围：High/Critical 自检、A-J 覆盖矩阵、每个 actions.ts 鉴权、每个出站抓取点 SSRF、每个动态路由 A/D/H。
- 发现数与最高严重度：目前无 High/Critical；最终报告将只保留 Medium/Low。
- 还差什么：生成 `docs/BUG_REPORT.md`，删除临时目录，重跑最终验证命令，确认 `git diff --stat` 只显示 docs 新增。
- 是否受阻：否。
