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
│   └── page.tsx          主视图（双栏时段表，支持按viewDate翻看历史/今天/未来）
├── components/           共享组件（HistoryTag/MissedMark/SummarySheet等只读/预览/总结相关；MonthGrid/DateJumpSheet日历选择器；MessageBoard/MessageComposerDialog/MessageHistoryDialog/ShareNoteToBoardDialog留言板；SyncTemplateDialog模板同步）
├── components/ui/        shadcn/ui基础组件（button/dialog/drawer/alert-dialog/dropdown-menu/input/label/tabs/textarea/skeleton/sonner/checkbox）
├── lib/
│   ├── supabase.ts       Supabase 客户端
│   ├── types.ts          共享类型（Slot、PlanSlot、DayPlan、Template、Message）
│   ├── slot-status.ts    状态判定（今天实时口径 getSlotStatus；按日期分流 getSlotStatusForDate；迟到分钟 getLateMinutes）
│   ├── day-plan.ts       day_plans表读写（ensureDayPlan建行、saveDayPlanSlots写入、fetchDaySlotsForDate只读、mergeTemplateSlotsIntoDay模板同步合并）
│   ├── day-summary.ts    每日统计（完成率/拖延次数/拖延时长/备注汇总），纯函数
│   ├── preview-plan.ts   日期字符串工具（本地时区）、未来日期按模板生成预览
│   ├── calendar-grid.ts  日历月历网格生成、月份加减（日期选择器用）
│   ├── messages.ts       messages表的CRUD（限量拉取最近留言、发布、Realtime订阅新留言、删除）
│   └── use-prefers-reduced-motion.ts  检测prefers-reduced-motion的hook（留言飘动效果的降级判断）
├── supabase/
│   └── schema.sql        建表和 RLS policy 的 SQL（导入 Supabase）
├── scripts/
│   └── deploy-pages.sh   一键构建并部署到GitHub Pages（out/里重新init再强推gh-pages分支）
├── docs/
│   ├── ui-20260714-shared-checkin.md      v1设计方案（登录/主视图/模板三页面）
│   ├── ui-20260714-shared-checkin-v2.md   v2设计方案（历史/未来日期导航、每日总结）
│   ├── ui-20260714-shared-checkin-v3.md   v3设计方案（日历选择器）
│   ├── ui-20260714-shared-checkin-v4.md   v4设计方案（PDCA周期目标与汇报，功能已下线，文档仅作历史记录）
│   ├── ui-20260714-shared-checkin-v5.md   v5设计方案（留言板）
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
  -- PDCA周期目标功能已下线（代码已删），这张表按用户要求保留不删，代码里已经没有任何引用。
  -- 如果以后要恢复这个功能，表结构和历史数据还在，不用重建。字段定义见supabase/schema.sql第7节。

messages
  id (uuid, PK)
  sender_id (uuid, FK users.id)
  content (text)                   -- 留言正文，客户端限40字，DB层不做长度约束（跟随note/review_note的既有惯例）
  created_at (timestamptz)
  -- 全部公开(select using true)，insert/delete限本人。开了Realtime，配合"留言板飘动效果"
  -- 前端只拉最近20条（order by created_at desc limit 20），不做旧数据清理，纯查询层限制
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

### PDCA周期目标功能已下线

曾经有过`/weekly`页面（周目标设定、周对比、复盘、分享图），用户体验后觉得跟每日总结的统计维度重合、增加了不必要的复杂度，2026-07-15决定整体删除。代码（页面、`GoalRow`/`GoalEditorSheet`/`WeeklyCompareTable`/`ShareCard`等组件、`lib/week.ts`/`week-summary.ts`/`weekly-reviews.ts`/`share-image.ts`、`CycleGoal`/`WeeklyReview`类型、`html-to-image`依赖）已全部删除。`weekly_reviews`表按用户要求保留在Supabase里不删（详见上方数据模型的说明）。历史设计方案见`docs/ui-20260714-shared-checkin-v4.md`（仅作记录，不代表当前产品状态）。

### 留言板

主视图固定有一条`MessageBoard`横条（不随`viewDate`/`dateMode`变化或消失），双方随时能发一句话，最近20条全部公开，Realtime同步。展示方式是"偶尔飘过"（间歇性、随机方向、按字数动态算时长），不是静态列表——飘动位移用JS测量文字实际`offsetWidth`算起止点，不能用`translateX`百分比（百分比基准是元素自身宽度不是容器宽度）。`prefers-reduced-motion`必须在组件内单独处理，不能依赖`app/globals.css`的全局降级规则（那条规则把动画时长压到0.01ms，对"终帧=完全划出容器"的动效会导致内容瞬间变空白，比不降级更糟）。

**v5.1修订（真机反馈后）**：原方案"一条播完等8-18秒间隔再播下一条"被用户推翻，改成两条轨道各自独立运作、每隔2-4.5秒尝试往空闲轨道派发新留言，不再有固定间隔——效果上更接近QQ空间评论区那种可能同时有多条内容划过的感觉。`MessageBoard.tsx`内部拆出`FloatingLane`子组件承接单条留言的完整生命周期，靠外层`key={message.id}`保证每次分配新留言时整个remount，`useEffect`空依赖数组天然只跑一次。同时新增`MessageHistoryDialog.tsx`（查看全部留言+删除自己发的留言，走`lib/messages.ts`的`deleteMessage`，RLS的`delete_own_message`策略保证只能删自己的）。

**踩坑**：`MessageBoard.tsx`里"首次播放"的`useEffect`不能返回cleanup去清定时器——如果依赖数组（`[loading, messages.length]`）在等待期间因为收到新留言而变化，React会自动执行上一次的cleanup把还没触发的定时器清掉，且不会重新调度，导致轮播永久失效。定时器句柄要挪到独立的ref，只在组件真正卸载时才清理。

自己发布的留言会被自己的Realtime订阅再广播回来一次（Supabase Realtime默认广播给所有订阅者不排除发起者），乐观更新和Realtime回调两处都要按`id`去重，不然同一条留言会出现两次。

### 打卡产出记录可选发布到留言板

`app/page.tsx`的`offerShareNote(note)`：`handleCheck`（打卡）和`handleSaveSlot`（编辑时段，仅`target==="today"`）保存成功后，note非空就弹`ShareNoteToBoardDialog`问要不要发布。**关键点**：`handleSaveSlot`会先记下`editor.slot`原有的note，只有保存后的note和原值不同才触发，避免编辑时间/任务名这类跟note无关的改动也重复弹同一条内容。note在`CheckInDialog`/`SlotEditorSheet`里已经限40字，跟留言板`content`的40字上限天然一致。

### 模板同步到今天

模板改了默认不影响今天已生成的计划（未来日期是现算预览天然同步，只有"今天"是拷贝出来的独立数据）。模板编辑页`/template`加了"同步到今天"按钮，**只在当前查看的tab和今天实际的day_type一致时显示**（避免周末tab点同步却把周末模板塞进工作日的今天）。点击后`SyncTemplateDialog`弹出勾选列表，`lib/day-plan.ts`的`isSlotAlreadyInDay`按任务名+起止时间内容比对（不能按id，模板和当天计划的slot id各自独立生成互不相关）标出"今天已有"的默认不勾。确认后`mergeTemplateSlotsIntoDay`**只加不删**：只把选中且内容还不存在的模板时段追加进当天计划，已打卡/已存在的一律不动。这是有意选择的保守策略——整体覆盖会撞上"已打卡时段怎么处理"这个绕不开的坑，只加不删虽然不能"删掉模板里去掉的时段"，但行为可预测、不会误删数据。

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
