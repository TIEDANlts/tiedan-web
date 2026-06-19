# 技术报告进度

- CP0 / 2026-06-19：已完成 Git 基线检查；确认当前在 `main`，已有用户未跟踪文件 `docs/BUG_AUDIT_SPEC.md`、`docs/E2E_TEST_SPEC.md`、`docs/TECH_REPORT_SPEC.md`，本任务会保护这些文件且只新增报告相关文档。已读取 `docs/TECH_REPORT_SPEC.md`、`README.md`、`AGENTS.md`、`docs/PLAN.md`、`docs/PROGRESS.md`；还差 CP1 技术栈与数据模型、CP2 路由/API、CP3 模块精读、CP4 横切能力、CP5 综合问题、CP6 自检。无阻塞。
- CP1 / 2026-06-19：已验证 `package.json` scripts 与依赖版本、`next.config.ts` standalone/上传缓存头、`prisma.config.ts` 的 `DATABASE_URL` 配置、`prisma/schema.prisma` 全量模型与 11 个迁移目录。已确认核心模型包括 User/Setting/Game/MediaItem/Link/Todo/SpecialDay/Post/Transaction/ExpenseCategory/ImportBatch/Trip/TripDay/Activity；还差 CP2 路由与 API 地图、CP3 逐模块细节、CP4 部署与测试横切。无阻塞。
- CP2 / 2026-06-19：已核对 `src/app/api/**` 下 10 个 `route.ts`：admin/export、auth、calendar/events、cron/steam-sync、files/private、health、posts/view、quick/expense、trips/nominatim、upload；并确认 `src/app/uploads/[...path]/route.ts` 负责公开上传文件直出。已读取根路由、公开/私密 layout、RSS 与上传直出入口。还差 CP3 逐模块精读与 CP4 部署/测试横切。无阻塞。
- CP3-dashboard / 2026-06-19：已验证 dashboard 无独立写入模型，`src/modules/dashboard/queries.ts` 聚合待办、游戏、媒体、消费、旅行、纪念日、年度统计与活动流；还差其余模块六维度与横切章节。无阻塞。
- CP3-expenses / 2026-06-19：已验证 expenses 的手工记账、分类维护、导入预览/执行、自动分类、统计查询、快捷记账与 API 调用链；还差 media/posts/settings/special-days/todos/trips。无阻塞。
- CP3-games / 2026-06-19：已验证 games 的手工游戏库、状态流转、评分/封面校验、Steam 同步、cron 触发与活动记录；还差 media/posts/settings/special-days/todos/trips。无阻塞。
- CP3-links / 2026-06-19：已验证 links 的私密管理、公开导航页、分组排序、favicon 抓取与公开路径重验证；还差 media/posts/settings/special-days/todos/trips。无阻塞。
- CP3-media / 2026-06-19：已验证 media 的媒体库 CRUD、状态日期自动维护、评分与封面校验、CSV/XLS/XLSX 导入向导、重复跳过、封面转存、TMDB/NeoDB 元数据搜索与上映日历事件；还差 posts/settings/special-days/todos/trips。无阻塞。
- CP3-posts / 2026-06-19：已验证 posts 的后台写作/发布/撤回/删除、公开博客分页与详情、Markdown 渲染和目录、浏览计数去重、RSS 与公开路径重验证；还差 settings/special-days/todos/trips。无阻塞。
- CP3-settings / 2026-06-19：已验证 settings 的个人资料键值读写、头像公开上传、首页与设置页重验证，以及后台导出入口；还差 special-days/todos/trips。无阻塞。
- CP3-special-days / 2026-06-19：已验证 special-days 的日历快填创建、日期校验、每年重复展开、闰日降级到 2 月 28 日和日历聚合；还差 todos/trips。无阻塞。
- CP3-todos / 2026-06-19：已验证 todos 的快速添加、今天/收集箱/未来 7 天分组、优先级/日期/完成/删除/逾期顺延、日历事件；同时确认当前 todos 页面未使用 `@dnd-kit`，拖拽看板属于规格/计划与现状不一致点。还差 trips。无阻塞。
- CP3-trips / 2026-06-19：已验证 trips 的列表/详情/足迹、行程日期同步、清单、每日笔记、私密照片、地点搜索与坐标转换、Leaflet 路线与足迹地图、完成活动记录和日历事件；CP3 十个模块已读完。还差 CP4 横切能力、部署、测试与 CP5/CP6。无阻塞。
- CP4 / 2026-06-19：已验证鉴权/公开白名单/登录限流、SSRF 与出站 HTTP、上传与私密文件、activity/diagnostics、calendar 聚合、设计 token/theme、Markdown、地图配置、导出 zip、Vitest/Playwright、Docker/compose/Caddy/CI/backup/env；还差 CP5 综合问题与 CP6 自检。无阻塞。
- CP5 / 2026-06-19：已在 `docs/TECH_REPORT.md` 汇总全局问题与短/中/长期演进建议，明确区分客观事实与主观建议，并标注 todos 拖拽规格、next-themes 等代码/文档差异。还差 CP6 自检。无阻塞。
- CP6 / 2026-06-19：已对照 `docs/TECH_REPORT_SPEC.md` 完成核对：报告包含 0-9 节、10 个模块均覆盖 a-f 六维度、10 个 `src/app/api/**/route.ts` 均有条目、路径引用抽查通过、仅新增报告相关文档；未受阻。
