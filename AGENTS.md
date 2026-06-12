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
| 包                        | 版本   | 备注                        |
| ------------------------- | ------ | --------------------------- |
| next / react              | 待回填 |                             |
| tailwindcss               | 待回填 | v4，CSS-first，禁止 v3 写法 |
| next-auth                 | 待回填 | beta，必须锁精确版本        |
| prisma / @prisma/client   | 待回填 |                             |
| vitest / @playwright/test | 待回填 |                             |

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