# AGENTS.md

## Git / GitHub 工作流（Agent 必须遵守）

本项目使用 Git 做本地版本管理，使用 GitHub 作为远程备份与协作仓库。Agent 在任何代码、文档、配置变更前后，都必须主动维护版本状态，目标是：小步提交、可回滚、可审查、不覆盖用户改动、不泄露隐私。

### 0. 固定仓库信息

- 本地仓库目录：`D:\我的网站\TIEDAN's Web`
- 远程仓库：`https://github.com/TIEDANlts/tiedan-web.git`
- 默认主分支：`main`
- 默认远程名：`origin`
- 本机 Docker 只安装在 WSL 的 `Ubuntu-24.04` 发行版里，Windows PowerShell 中没有 `docker` 命令。
- 本地 PostgreSQL 需要通过 WSL Docker 启动；从 PowerShell 执行 Prisma / seed / dev 前，先运行：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose -f docker-compose.dev.yml up -d"
```

- 如果随后 Windows 侧 Node/Prisma 仍报 `ECONNREFUSED`，通常是 WSL 发行版退出导致 Docker 端口转发短暂失效。测试期间保持一个 WSL 会话存活，例如另开终端运行：

```powershell
wsl.exe -d Ubuntu-24.04
```

或临时执行：

```powershell
wsl.exe -d Ubuntu-24.04 -- sh -lc "cd '/mnt/d/我的网站/TIEDAN'\''s Web' && docker compose -f docker-compose.dev.yml up -d && sleep 300"
```

然后再在 PowerShell 中验证：

```powershell
Test-NetConnection -ComputerName localhost -Port 5432
npx.cmd prisma migrate status
npm.cmd run db:seed
```

如果 remote 缺失，Agent 应配置：

```bash
git remote add origin https://github.com/TIEDANlts/tiedan-web.git
git branch -M main
```

如果出现 `dubious ownership`，优先使用一次性参数继续工作：

```bash
git -c safe.directory="D:/我的网站/TIEDAN's Web" status
```

只有在用户同意后，才允许写入全局 safe.directory：

```bash
git config --global --add safe.directory "D:/我的网站/TIEDAN's Web"
```

### 1. 每次开始工作前

Agent 必须先执行并阅读结果：

```bash
git status --short --branch
git remote -v
git log --oneline -5
```

然后判断：

- 如果工作区有用户未提交改动，必须保护这些改动；不得覆盖、回滚、删除。
- 如果改动与当前任务有关，先说明会如何基于现有改动继续。
- 如果改动与当前任务无关，忽略它们，不要顺手格式化或重构。
- 如果远程可访问，开始较大任务前先同步：

```bash
git switch main
git pull --rebase origin main
```

如果 `pull` 产生冲突，Agent 必须停止并说明冲突文件与建议处理方式，不得擅自解决不确定冲突。

### 2. 分支策略

小型文档修正可以直接在 `main` 上完成。实现 Stage、功能、修复 bug、重构或任何多文件改动时，必须从 `main` 创建工作分支：

```bash
git switch main
git pull --rebase origin main
git switch -c stage-0-bootstrap
```

分支命名规则：

- Stage 工作：`stage-数字-简短名称`，例如 `stage-0-bootstrap`
- 功能：`feature/简短名称`，例如 `feature/blog-editor`
- 修复：`fix/简短名称`，例如 `fix/auth-redirect`
- 文档：`docs/简短名称`，例如 `docs/git-workflow`

如果分支已存在，使用：

```bash
git switch 分支名
```

### 3. 写代码前的版本保护

动手前必须确认：

- 已阅读 `AGENTS.md`、`docs/PLAN.md`、`docs/PROGRESS.md`
- 已说明本次任务属于哪个 Stage 或哪个明确范围
- 已给出实施计划并获得用户确认，除非用户明确要求“直接执行”
- 已确认没有要先备份的未提交改动

涉及依赖、数据库 schema、认证、上传、部署、缓存、金额、时间等高风险区域时，必须先说明影响面和验证方式。

### 4. 提交节奏

Agent 必须小步提交，不要把大量无关改动塞进一个 commit。

建议提交时机：

- 完成一个清晰的功能点
- 修复一个独立 bug
- 完成一次可验证的文档更新
- 完成一个 Stage 的验收要求

提交前必须执行：

```bash
git status --short
git diff --check
git diff --stat
```

实现代码变更后，按本项目约定运行：

```bash
npm run check
```

如果当前阶段已经有 e2e 或用户要求浏览器验证，再运行：

```bash
npm run e2e
```

文档-only 改动可以不运行 `npm run check`，但最终汇报必须明确说明“未运行，因为仅修改文档”。

### 5. Commit 信息规范

提交信息使用简洁英文，优先采用以下格式：

```text
type(scope): summary
```

常用类型：

- `feat`：新增功能
- `fix`：修复问题
- `docs`：文档更新
- `chore`：配置、脚手架、依赖等杂项
- `test`：测试
- `refactor`：不改变行为的重构

示例：

```bash
git commit -m "docs: add git workflow for agents"
git commit -m "feat(stage-0): scaffold next app"
git commit -m "fix(auth): protect private routes"
```

### 6. 推送到 GitHub

首次推送当前分支：

```bash
git push -u origin 当前分支名
```

之后推送：

```bash
git push
```

如果是 `main`：

```bash
git push origin main
```

如果因为登录、token、网络审批或权限失败，Agent 不得绕过限制；必须把失败原因、当前本地 commit hash、需要用户手动执行的命令说清楚。

### 7. 合并回 main

工作分支完成并通过验证后，优先让用户确认再合并。合并流程：

```bash
git switch main
git pull --rebase origin main
git merge --no-ff 工作分支名
git push origin main
```

本项目默认授权：如果某个 Stage / 功能 / 修复分支已经满足以下条件，Agent 可以直接合并回 `main`，不必再次询问：

- `npm run check` 通过。
- 已逐条对照 `docs/PLAN.md` 当前 Stage 的验收标准，并记录通过 / 未通过 / 环境阻塞项。
- `docs/PROGRESS.md` 已更新。
- 工作区没有未提交的用户改动会被覆盖。

直接合并时仍必须按顺序执行：切回 `main` → 尝试 `git pull --rebase origin main` → `git merge --no-ff 工作分支名` → 在合并后的 `main` 上重新运行 `npm run check` → `git push origin main`。如果 `pull`、`merge`、验证或 `push` 失败，必须停止并汇报原因。

如果用户希望走 GitHub Pull Request，Agent 应推送分支并给出 PR 创建链接或 `gh pr create` 命令。没有用户确认，不要删除远程分支。

### 8. 严禁操作

除非用户明确点名要求并理解后果，Agent 禁止执行：

```bash
git reset --hard
git clean -fd
git checkout -- .
git restore .
git push --force
git push --force-with-lease
git rebase -i
```

也禁止：

- 删除用户未提交改动
- 为了通过检查而移除测试或降低规则
- 把 `.env`、密钥、token、数据库密码、私有备份文件提交进仓库
- 大范围格式化与当前任务无关的文件
- 在不说明原因的情况下修改历史提交

### 9. 隐私与 .gitignore 规则

真正的密钥只放本地环境，不进 Git。需要提交的是示例文件：

- 可以提交：`.env.example`
- 禁止提交：`.env`、`.env.local`、`.env.production`、`*.pem`、`*.key`

如果发现敏感文件已被 staged，必须先取消暂存：

```bash
git restore --staged 文件名
```

然后补充 `.gitignore`，再重新提交安全内容。

### 10. 冲突处理

遇到 merge、rebase、pull 冲突时：

1. 运行 `git status --short` 查看冲突文件。
2. 说明冲突来源：本地改动、远程改动、还是同一文件双向修改。
3. 对确定无歧义的冲突可以修复。
4. 对业务含义不确定的冲突必须询问用户。
5. 冲突解决后运行相关验证，再提交。

不得用“全部采用本地”或“全部采用远程”这种粗暴方式处理业务文件，除非用户明确要求。

### 11. Stage 完成时

每个 Stage 完成后必须：

```bash
git status --short
npm run check
```

并逐条对照 `docs/PLAN.md` 中当前 Stage 的“验收标准”做验收：

- 每一条都要标记为：通过 / 未通过 / 因环境阻塞未验证。
- 对未通过或未验证的条目，必须写明原因、阻塞条件和下一步命令或人工验收步骤。
- 不得只用 `npm run check` 代替 Stage 验收；自动化验证和人工验收清单必须同时汇报。
- 如果验收发现实现缺口，先修复并重新验证；如果是环境阻塞，必须在最终汇报和 `docs/PROGRESS.md` 中明确记录。

并更新 `docs/PROGRESS.md`：

- 完成内容
- 关键文件
- 与 `docs/PLAN.md` 的偏离
- 遗留 TODO
- 验证结果

同时更新根目录 `README.md`：

- 当前 Stage 状态。
- 新增或改变的本地启动、依赖、数据库、seed、验证命令。
- 当前已可用功能和重要环境约束。

然后提交：

```bash
git add .
git commit -m "feat(stage-X): complete stage name"
git push
```

如果只是文档或计划更新，使用：

```bash
git commit -m "docs: update progress"
```

### 12. 最终汇报格式

Agent 完成任务后，必须向用户汇报：

- 当前分支
- 最新 commit hash
- 是否已 push 到 GitHub
- 运行了哪些验证命令，结果如何
- 哪些文件被修改
- 是否有未提交改动
- 如果 push 失败，用户需要手动执行的准确命令

示例：

```text
当前分支：main
最新提交：abc1234 docs: add git workflow for agents
已推送：否，GitHub 登录需要你授权
验证：未运行 npm run check，因为本次只修改文档
未提交改动：无
```

## 项目是什么
单用户的个人生活管理网站：游戏 / 书影 / 旅行 / 博客 / 消费 / 待办日历 / 导航 / 首页聚合。
完整实施方案见 docs/PLAN.md（按 Stage 推进，当前做到哪个 Stage 见 docs/PROGRESS.md 与我的指示）。

## 技术栈
Next.js (App Router) + TypeScript + Tailwind v4（CSS-first，@theme）+ shadcn/ui + lucide-react + next-themes + 自定义设计 token；
Prisma + PostgreSQL；Auth.js v5 Credentials（单用户）；
dayjs（zh-cn，UTC+8）；ECharts / FullCalendar / Leaflet 按需动态导入；
Vitest（单测）+ Playwright（冒烟）。

## 版本锁定（Stage 0 回填，之后只增不改）
| 包                        | 版本   | 备注                        |
| ------------------------- | ------ | --------------------------- |
| next / react              | next 16.2.9 / react 19.2.4 |                             |
| tailwindcss               | 4.3.0 | v4，CSS-first，禁止 v3 写法 |
| next-auth                 | 5.0.0-beta.30 | beta，必须锁精确版本        |
| prisma / @prisma/client / @prisma/adapter-pg   | 7.8.0 / 7.8.0 / 7.8.0 |                             |
| vitest / @playwright/test | vitest 4.1.8 / Playwright 待安装 |                             |
| react-markdown / remark-gfm / rehype-pretty-code / shiki | 10.1.0 / 4.0.1 / 0.14.3 / 4.2.0 | Stage 2 Markdown 渲染与代码高亮 |
| @dnd-kit/core / @dnd-kit/sortable / @dnd-kit/utilities | 6.3.1 / 10.0.0 / 3.2.2 | Stage 3 导航管理拖拽排序 |
| sharp | 0.35.1 | Stage 5 图片旋正、压缩、去 EXIF 与缩略图 |
| undici | 6.26.0 | Stage 5 统一出站 HTTP 与 OUTBOUND_PROXY |

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
