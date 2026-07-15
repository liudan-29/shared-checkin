# CLAUDE.md - 两人共享打卡网页

## 项目定位

Next.js + Supabase 的两人协作打卡 Web App。核心是"实时同步"和"社交监督"：一方打卡对方 1 秒内看到，某时段超时未完成对方界面上会显示拖延时长。

## 技术栈

- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase（Postgres + Auth + Realtime + Storage）
- GitHub Pages 部署（静态导出，`next.config.mjs`里`GITHUB_PAGES=true`时启用`output: export`）。原计划用Vercel，注册被风控拦截未能解决，改走这条路，见下方"历次踩坑"

## 目录结构

```
20260714-shared-checkin/
├── app/                  Next.js App Router 页面
│   ├── login/            登录页
│   ├── template/         模板编辑页
│   ├── weekly/           PDCA周报页（周目标设定/周对比/复盘/分享图）
│   └── page.tsx          主视图（双栏时段表，支持按viewDate翻看历史/今天/未来）
├── components/           共享组件（HistoryTag/MissedMark/SummarySheet等只读/预览/总结相关；GoalRow/GoalEditorSheet/WeeklyCompareTable/ShareCard等PDCA周报相关；MonthGrid/DateJumpSheet日历选择器）
├── lib/
│   ├── supabase.ts       Supabase 客户端
│   ├── types.ts          共享类型（Slot、PlanSlot、DayPlan、Template、CycleGoal、WeeklyReview）
│   ├── slot-status.ts    状态判定（今天实时口径 getSlotStatus；按日期分流 getSlotStatusForDate；迟到分钟 getLateMinutes）
│   ├── day-summary.ts    每日统计（完成率/拖延次数/拖延时长/备注汇总），纯函数
│   ├── preview-plan.ts   日期字符串工具（本地时区）、未来日期按模板生成预览
│   ├── calendar-grid.ts  日历月历网格生成、月份加减（日期选择器用）
│   ├── week.ts           周日期工具（周一起算、周模式判定、跨年周范围文案）
│   ├── week-summary.ts   周聚合统计（组合调用day-summary，不重写单日逻辑）、目标达成判定
│   ├── weekly-reviews.ts weekly_reviews表的CRUD
│   └── share-image.ts    html-to-image截图封装（离屏DOM转PNG、下载、Web Share API降级）
├── supabase/
│   └── schema.sql        建表和 RLS policy 的 SQL（导入 Supabase）
├── scripts/
│   └── deploy-pages.sh   一键构建并部署到GitHub Pages（out/里重新init再强推gh-pages分支）
├── docs/
│   ├── ui-20260714-shared-checkin.md      v1设计方案（登录/主视图/模板三页面）
│   ├── ui-20260714-shared-checkin-v2.md   v2设计方案（历史/未来日期导航、每日总结）
│   ├── ui-20260714-shared-checkin-v3.md   v3设计方案（日历选择器）
│   ├── ui-20260714-shared-checkin-v4.md   v4设计方案（PDCA周期目标与汇报）
│   └── user-guide.html                    用户使用手册（发布为Artifact）
├── .env.local            本地环境变量（不进 git）
├── .env.example          示例文件（进 git）
├── README.md
├── CLAUDE.md
└── WORKLOG.md
```

## 数据模型（Supabase 表）

```
users
  id (uuid, PK, ref auth.users)
  name (text)
  avatar_url (text nullable)

templates
  id (uuid, PK)
  owner_id (uuid, FK users.id)
  day_type ('weekday' | 'weekend')
  slots (jsonb): [{id, start_time, end_time, task}]
  updated_at

day_plans
  id (uuid, PK)
  user_id (uuid, FK users.id)
  date (date)
  slots (jsonb): [{id, start_time, end_time, task, done, checked_at, note, photo_url}]
  updated_at
  UNIQUE(user_id, date)

weekly_reviews
  id (uuid, PK)
  user_id (uuid, FK users.id)
  week_start (date)                -- 该周"周一"日期
  goals (jsonb): CycleGoal[]        -- [{id,kind:"overall_rate",target_rate}] 或 [{id,kind:"task_target",task_label,target_type:"all"}]
  review_note (text, nullable)      -- Act阶段的自由文本复盘
  updated_at
  UNIQUE(user_id, week_start)
  -- 不开Realtime，对方刷新页面即可看到最新
```

## 关键约定

### 时间处理

所有时间用本地时区，`date` 字段存 `YYYY-MM-DD` 字符串。时段的 `start_time` 和 `end_time` 存 `HH:mm` 字符串。

### slot id 生成

前端用 `crypto.randomUUID()` 生成 slot 的 id。数据库层不给 slot 单独建表，所有 slot 都嵌在 templates.slots 或 day_plans.slots 的 JSON 数组里。

### 打卡的写入方式

打卡一次操作要 update 整个 day_plans.slots 数组：读出当前 slots，找到目标 slot 改 done+checked_at+note+photo_url，再整个数组写回。避免多字段并发写冲突。

### Supabase 凭证

- `.env.local` 存两个字段：`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 都是公开可用的（写 NEXT_PUBLIC_ 前缀走浏览器）
- **禁止**把 service_role key 放到前端环境变量。目前项目不需要 service_role
- `.env.local` 已加入 .gitignore，不进 git

### RLS Policy 原则

两人互相能读对方的 templates 和 day_plans，但只能改自己的。用 `auth.uid() = user_id` 判自己。

### 实时订阅

`day_plans` 表开 Realtime，前端订阅当天 `date=eq.YYYY-MM-DD` 过滤的 UPDATE 事件。任何一方打卡或改 slot，另一方立即拿到新 payload 更新 UI。**只在查看"今天"时订阅**（`isToday`为true），翻看历史/未来日期时不建订阅、离开今天时清理已有订阅。

### 日期导航三态（today / past / future）

主视图`viewDate`状态驱动，不再写死显示今天：

- **today**：完全可交互，行为不变（打卡、编辑、添加时段、实时同步）
- **past**：只读，`fetchDayPlan`读取真实记录（没有就是空，不会补建）。未打卡的历史时段状态是`missed`（不是`overdue`），不折算拖延时长（没有自然终点，硬算数字没意义），只在总结统计里算"未完成"这一项
- **future**：预览，从`templates`按当天`day_type`现算slots，**不写库**，`SlotCard`的`mode="preview"`分支渲染，没有打卡按钮

写入函数（`persistMySlots`/`handleCheck`）显式检查`isToday`才允许写，不能只判断`planId`是否非空（过去日期如果曾经打过卡，`planId`同样存在，必须靠`isToday`这道硬拦截，不能只靠UI没做写入入口这层防护）。

### 每日总结

任意一天（含未来）都能点开，`lib/day-summary.ts`的`computeDaySummary`按`past/current/future`三种口径算完成率、拖延次数、拖延时长、备注列表。两人数据在`SummaryCompareTable`逐行对比，数值更优一方高亮，不做"一句话总裁定"。

### PDCA周期目标（`/weekly`页面）

周从**周一**起算（`lib/week.ts`的`getWeekStart`），对应工作日模板周一到周五连续、周末模板周六周日连续，聚合更自然。目标各自独立设定（我的目标我改，TA的只能看），随时能改不锁死（代价：没有历史快照，改目标后"达没达标"只认当前存的这份值，不回溯）。

目标两种类型（`CycleGoal`）：整体完成率、针对具体任务（按`task`文本匹配，不是slot id，因为工作日/周末模板是两份独立记录）。达成判定（`lib/week-summary.ts`的`computeWeekSummary`）：本周没过完时`achieved`恒为`null`（进行中态），不提前判定失败；周过完后才给最终`true`/`false`；任务目标如果这周一次都没被排入，视为`false`（未达标），不能永远停在`null`。

分享图片只含"我自己"的数据，不含对方（隐私考虑），`ShareCard.tsx`是专用离屏截图组件，全部样式内联锚定CSS变量、不依赖body的全局背景继承。

## 禁止清单

- 禁止把 Supabase service_role key 塞进前端代码或环境变量
- 禁止在代码里明文写测试账号密码（都存在 Supabase Auth，登录页让用户输）
- 禁止用 alert/confirm 做交互反馈（用 shadcn/ui 的 toast/dialog）
- 禁止破坏 slot id 的稳定性（打卡后不改 id）
- 禁止在 day_plans 里存 template 引用（day_plan 拷贝一份 slots 独立存在，模板改了不影响当天已生成的 plan）

## 部署账号

- Supabase 项目名：liudan-29的项目
- Supabase URL：https://hwswkcwkqwmlujvctrax.supabase.co
- GitHub 仓库：liudan-29/shared-checkin（公开，GitHub Pages免费版要求）
- 线上 URL：https://liudan-29.github.io/shared-checkin/
- Vercel：注册被风控拦截，未启用，见"历次踩坑"

## 历次踩坑

- **next build会清空out/连带out/.git**：gh-pages分支的产物仓库放在out/里，每次`npm run build:pages`后out/.git就没了，此时在out/里跑git命令会静默落到父仓库(源码仓库)上，提交错地方。部署一律用`bash scripts/deploy-pages.sh`，它每次在out/里重新init再强推，不要手工在out/里敲git

- **Next.js CLI在这台机器上跑telemetry会报EXDEV跨盘符rename错误**：`next dev`/`next build`/`next telemetry disable`只要涉及写`C:\Users\刘丹\AppData\Roaming\nextjs-nodejs\Config\config.json`就崩，报`EXDEV: cross-device link not permitted`。原因未查（大概率AppData\Roaming被重定向到了别的卷）。解决：package.json的dev/build/start脚本都用`cross-env NEXT_TELEMETRY_DISABLED=1`包一层，跳过整个telemetry写入路径。禁止依赖`next telemetry disable`命令本身，它也会触发同样的崩溃

- **Claude Code的preview_start起的dev server和用户真实浏览器不在同一网络**：文件系统是同一份（同一个D盘目录），但`preview_start`跑的服务只有Claude自己的Browser pane工具能访问，用户本机Chrome访问同一个`localhost:3000`会`ERR_CONNECTION_REFUSED`（`netstat`确认本机根本没有监听3000端口的进程）。用户要在自己电脑上用自己的浏览器测，必须自己开一个终端跑`npm run dev`，不能依赖Claude这边起的服务

- **Vercel注册在国内网络环境容易被风控拦截**：登录页提示"账号需要进一步验证"，无论走邮箱还是GitHub OAuth都一样卡（跟登录方式无关，是账号/网络层面被标记），走account recovery表单申诉耗时不确定。这次放弃Vercel改用GitHub Pages，如果以后想重新试Vercel，预期还会撞同样的墙

- **派子agent（ui-designer/code-reviewer）在长任务上可能连续撞到session limit失败**：这次日期导航+每日总结这批改动，ui-designer方案本身正常跑完只是比上次慢一倍（一度以为卡死，SendMessage催问确认没卡住），但code-reviewer审这批改动连续两次因为session limit中途终止（一次晚7点重置、一次晚12点重置）。按sub_agent_dispatch.md的两轮上限原则，第二次失败后没有再重派，改成本体自己对照原定审查重点逐条核对。以后审查量大的改动要预留"agent可能失败、需要本体兜底自查"的余地，不要假设子agent一定能跑完
