# E2E 缺陷定性进度

## 2026-06-21 · 启动与基线读取

- 本步复现/归类：尚未归类；已读取 `docs/E2E_TRIAGE_SPEC.md`、`docs/E2E_REPORT.md`、`docs/E2E_PROGRESS.md`、`docs/PLAN.md`、`docs/PROGRESS.md` 与 `package.json`。
- 共因结论进展：尚未确认；下一步读取 `test-results/**/error-context.md`、trace 与相关 E2E 用例，再运行 dev/prod 基线复现。
- 还差什么：dev/prod 真实浏览器复现、Console/Network 取证、逐项源码与测试断言对照。
- 是否受阻：否；当前工作区存在未跟踪的 `docs/E2E_TRIAGE_SPEC.md`、`docs/E2E_FIX_SPEC.md`、`docs/superpowers/`、`e2e/.auth/`，本阶段会保护这些既有文件。

## 2026-06-21 · CP1 基线复现

- 本步复现/归类：已在 dev 跑 `npm.cmd run e2e -- --reporter=line --trace on --output test-results/triage-dev`，结果 39 条中 7 过、32 失败；已在 `next build` + `next start` 跑 `npm.cmd run e2e -- --reporter=line --trace on --output test-results/triage-prod-ok`，结果同为 7 过、32 失败。
- 共因结论进展：dev 下弹窗、导入、上传、地图、日历仍失败；prod 下地图/日历渲染明显推进，日历出现事件但部分测试因 strict mode/后续 settings 断言失败，提示动态组件存在 dev 专属因素，弹窗/导入/上传需继续查 client runtime 共因。
- 还差什么：提取 dev/prod error-context 和 trace 中 console/network 证据；验证 sendBeacon 是否发出；定位 Radix Dialog、上传/导入、settings/dashboard 的真实层级。
- 是否受阻：生产复现曾被 Auth.js `UntrustedHost` 与 WSL Docker 端口转发阻塞；按 AGENTS.md 使用 `AUTH_TRUST_HOST=true`、显式 `DATABASE_URL=127.0.0.1`、WSL root 保活后解除。该阻塞记为复现环境事项，不作为 E2E-001..011 业务归因。

## 2026-06-21 · CP2 共因验证

- 本步复现/归类：已抽取 dev/prod 代表性 `error-context.md` 与 trace/network；手动探测 `/blog/[slug]` 的 `navigator.sendBeacon`，确认实际发出 `POST /api/posts/view` 并收到 200。
- 共因结论进展：排除“全站 hydration/client bundle 崩溃”单一共因。prod 构建下 links 弹窗可创建并同步公开导航、Leaflet 与 FullCalendar 均渲染、settings action 返回成功；失败主要拆分为 Steam 外链破图、测试断言/诊断误报、next dev 下动态/交互加载异常。
- 还差什么：逐项落表，给应用 bug 项补建议修复层级与影响面；给测试/环境项补明确原因。
- 是否受阻：否；prod 中大量 `_rsc=... net::ERR_ABORTED` 来自 Next RSC 预取/导航取消，当前测试诊断未忽略该类正常取消请求。

## 2026-06-21 · CP3 逐项归类草案

- 本步复现/归类：完成 E2E-001..011 初步归类：应用 bug 2 项（001、007），测试用例问题 5 项（002、003、004、005、010），dev 环境专属 4 项（006、008、009、011），无法复现 0 项。
- 共因结论进展：单一共因已排除；dev 专属现象可解释弹窗不开、地图/日历 loading 等原始 next dev 症状，但不能解释 Steam ORB 破图、sendBeacon 观察方式、坏 PNG 夹具、settings 首页期望不成立。
- 还差什么：汇总 `docs/E2E_TRIAGE.md`，并按 `docs/E2E_TRIAGE_SPEC.md` 完成核对清单逐条自检。
- 是否受阻：否；本阶段未修改源码、测试或配置。

## 2026-06-21 · CP4 报告定稿

- 本步复现/归类：已生成 `docs/E2E_TRIAGE.md`，逐项列出 E2E-001..011 的 dev/prod 复现结果、分类、证据、建议修复层级、影响面、优先级与待确认列。
- 共因结论进展：报告中明确排除全站 hydration/client bundle 崩溃；动态组件/地图/日历均记录 dev 与生产构建对照结论。
- 还差什么：仅剩最终工作区与 diff 验证，确认没有修改禁止范围文件。
- 是否受阻：否；已停在定性阶段，未进入修复。
