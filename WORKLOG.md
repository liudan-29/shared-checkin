# WORKLOG

## 2026-07-14 09:05

### 项目启动

- 建子项目目录 `20260714-shared-checkin`
- 从 `_template/README.md` 复制 README 并填写
- 建项目专属 CLAUDE.md，记录技术栈、数据模型、目录结构、关键约定、禁止清单
- 规划文件在 `C:\Users\刘丹\.claude\plans\quizzical-watching-backus.md`

### 已定关键点

- 产品形态：两人共享网页
- 时段颗粒度：自己设定时间段
- 打卡方式：勾选加可选拍照
- 时段安排来源：工作日和周末各一份模板，每天可调
- 提醒机制：对方界面显示对方拖延时长（不做推送）
- 技术栈：Next.js 14 + Supabase + Vercel

### 下一步

引导用户建 Supabase 项目、拿到 URL 和 anon key，然后本地初始化 Next.js。

## 2026-07-14 17:39

- Vercel注册被风控拦截（登录页要求account recovery form），放弃，改走GitHub Pages
- next.config.mjs加GITHUB_PAGES=true条件分支：output export + basePath /shared-checkin + trailingSlash，本地dev不受影响
- 新增npm run build:pages脚本；out/加.nojekyll防止Pages吃掉_next目录
- 产物42MB（大头是文楷字体分包），推送gh-pages分支两次超时，后台重推成功
- 仓库已改公开（用户确认过），Pages网址 https://liudan-29.github.io/shared-checkin/ 已上线，首页/登录页200，无控制台报错
- 后续每次更新：npm run build:pages后把out/重新推gh-pages分支

## 2026-07-14 17:48

- 用户反馈找不到编辑/删除入口（功能在但无提示），SlotCard任务名后加铅笔图标（仅自己的未完成时段显示）
- 踩坑：next build清空out/连带out/.git，在out/里跑git会落到父仓库。已写scripts/deploy-pages.sh一键部署并记入CLAUDE.md

### 补记：MVP阶段遗漏的记录

- 登录/主视图（实时同步、拖延戳、打卡备注弹窗CheckInDialog）/模板编辑三页面按ui-designer的v1方案（`docs/ui-20260714-shared-checkin.md`）实现完，本地tsc+build通过
- 派code-reviewer审查认证与RLS安全性，结论✅通过，采纳一条建议：`saveDayPlanSlots`更新后检查返回行数，避免0行匹配时静默"假成功"

## 2026-07-14 17:53～17:59

- 用户反馈已完成的时段点不开编辑：`SlotCard`的`onClick`和铅笔图标之前多加了`!isDone`限制（自己加的，不在原方案里），去掉，已完成时段现在也能点开编辑/删除
- 用户反馈打卡时写的备注（产出记录）写完就锁死改不了：给`SlotEditorSheet`加了"备注（选填）"字段（仅`target==="today"`时显示），随时能改

## 2026-07-15 04:xx～06:33（历史/未来日期导航 + 每日总结）

- 用户要求UI设计必须过ui-designer，派工出v2方案（`docs/ui-20260714-shared-checkin-v2.md`）：日期导航行（DateTicket新增只读/预览徽标+前进后退）、SlotCard三态（live/readonly/preview）、HistoryTag/MissedMark两个新组件、SummarySheet每日总结抽屉（完成率/拖延统计/备注时间线，两人对比逐行高亮）
  - 踩坑：ui-designer这次跑了近30分钟才出结果，中途一度怀疑卡死，用SendMessage催问后发现只是正常跑完、没卡住，只是比v1慢了一倍多。之后又因为session limit连续失败过（另见下条），派长任务前心理预期要放宽
- 待决策项用户拍板：未来日期也能点总结（哪怕全是0值）；总结不加一句话结论，靠逐行对比
- 实现：`lib/slot-status.ts`加`getSlotStatusForDate`/`getLateMinutes`，`lib/day-summary.ts`/`lib/preview-plan.ts`两个纯函数模块（完成率统计、按模板生成未来预览、日期字符串本地时区工具），`app/page.tsx`从"只显示今天"改成`viewDate`状态驱动
- 派code-reviewer审这批改动（约10个文件），**连续两次撞到session limit失败**（第一次19:03起跑晚上7点重置、第二次跑到12点重置都没跑完），不再重派第三次，改成本体自己按原定六条审查重点逐条核对
  - 自查发现一处防御性漏洞：`persistMySlots`/`handleCheck`原来只判断`myView.planId`非空就允许写库，但过去日期如果曾经打过卡本来就有`planId`，只是UI没做入口点不到；已加`isToday`显式拦截，写函数自己兜底不靠"按钮没做"这层防护
  - 顺手清理一处死代码：`text-secondary-foreground text-muted-foreground`两个类叠加，后者靠tailwind.config书写顺序覆盖前者，前者是死类，涉及6个文件
- 已构建部署上线，`https://liudan-29.github.io/shared-checkin/`

## 2026-07-15 08:16

- 用户反馈只能逐天翻页不够用，想直接选日期。派ui-designer出v3方案（`docs/ui-20260714-shared-checkin-v3.md`）：自定义月历网格（不用原生input，避免和暖纸+印章风格冲突），点DateTicket的日期文字触发，和前后箭头并存互补
- 用户拍板：可选范围过去180天、未来90天（按方案默认值）
- 实现：新增`lib/calendar-grid.ts`（月历网格生成、月份加减、边界判断）、`components/MonthGrid.tsx`、`components/DateJumpSheet.tsx`；`DateTicket.tsx`日期区域改按钮+日历图标；前后箭头补上边界disabled（v2设计时就预留了这个视觉规格，只是当时没有边界数据，这次一起接上）
- 本体自查（没有再派code-reviewer，参照上一轮踩坑）：跨年跨月的月份加减用`new Date(year, month±1, day)`让JS自动进位，验证过12月+1和1月-1都正确；日期字符串比较（`YYYY-MM-DD`)天然可当字符串排序判断范围，没有用错方法
- 已构建部署上线，用户验证通过

## 2026-07-15 08:36

- 用户提了四个问题，其中两条是对本体调度习惯的纠正，已经落到全局规则文档（不是记忆）：
  - `~/.claude/rules/sub_agent_dispatch.md`的"何时派ui-designer"章节补了一条：新增一整块交互状态/一批新组件即使能复用已有token，体量到了"新增功能模块"级别也要主动派，不能等用户重复提醒
  - 工作区级`D:\.Project\CLAUDE.md`把"工作日志（项目级）"章节扩成"项目文档同步纪律"，明确WORKLOG当场追加不攒、README和项目CLAUDE.md在用户可见行为变化时同轮检查同步，不等用户发现不一致才改
  - 之前误写进本体记忆（`C:\Users\刘丹\.claude\projects\D---Project\memory\`）的两条同主题记忆已删除，避免和规则文档重复或冲突
- 产出使用手册（用户要求的"通俗易懂一看就懂"的产品说明），落盘`docs/user-guide.html`，发布为Artifact：`https://claude.ai/code/artifact/083e0874-8dc1-4595-a36d-7e9b5e498162`。视觉延续项目自己的"打卡钟与印章"设计系统（token直接复用v1文档的配色），内容覆盖概览/快速开始/打卡/产出记录/拖延/看对方进度/历史未来导航/每日总结/模板/FAQ
  - 用户指出手册漏了"产出记录"（打卡时写的备注）能不能事后编辑这一点没说清楚，补充：备注随时能改不是写一次锁死；同时补了两处遗漏——退出登录入口、"连接断了正在重连"提示是什么意思

## 2026-07-15 09:xx～16:58（PDCA周期目标与汇报功能）

- 用户看到PDCA(Plan-Do-Check-Act)管理法的帖子，想加到App里：设周目标、按周看达成情况、写复盘、能生成分享图。用Plan Mode走完整流程：先派一个Plan agent设计实现方案（数据模型/周聚合计算/分享图技术选型/页面信息架构），我审核方案后问了3个关键决策（目标能不能中途改/分享图含不含对方数据/目标各自独立还是共用），用户确认后写入正式plan文件、ExitPlanMode拿到执行授权
- 数据层：`supabase/schema.sql`加`weekly_reviews`表(user_id+week_start唯一约束，goals jsonb+review_note，不开Realtime)；`lib/types.ts`加`CycleGoal`/`WeeklyReview`(踩坑：`CycleGoal`是判别联合类型，`Omit<CycleGoal,"id">`会因为keyof对union取交集而把非公共字段全部塌缩掉，改成单独定义`NewCycleGoal`绕开这个问题)；新增`lib/week.ts`(周日期工具)、`lib/week-summary.ts`(周聚合统计，组合调用既有`computeDaySummary`不重写单日逻辑)、`lib/weekly-reviews.ts`(CRUD)；`lib/day-plan.ts`抽出`fetchDaySlotsForDate`只读函数给主视图和周报共用
- 派ui-designer出v4方案(`docs/ui-20260714-shared-checkin-v4.md`)：新页面`/weekly`，目标三态标签(进行中/达成/未达标，未达标沿用HistoryTag中性灰不用danger红)、周对比表、分享卡片(撕票边缘+印章式完成率徽章)
- 分享图片：装了`html-to-image`依赖，`lib/share-image.ts`封装（离屏DOM转PNG、下载、Web Share API能力检测降级）。`ShareCard.tsx`是专用截图卡片，全部样式内联`style`直接锚定CSS变量，不依赖body的全局背景继承（否则导出图片背景会是透明/白色）
- 分两批派code-reviewer（数据层一批、UI一批，接上一轮"大批量容易撞session limit"的教训）：数据层直接✅通过，只给了一条建议（任务目标如果这周一次都没排上、周已过完时`achieved`不该停在null永远"进行中"，已修）；UI批发现两处真bug——`ReviewSection.tsx`误用不存在的Tailwind类`bg-tertiary`导致对方复盘卡片背景丢失(改成内联style)、`GoalEditorSheet.tsx`具体任务类型下没选任务就点保存会静默死点击(补上禁用判断)，都已修复
- 已构建部署上线，`https://liudan-29.github.io/shared-checkin/`。分享图片功能在真实设备(尤其微信内置浏览器)上的兼容性还没验证，需要用户自己测

## 2026-07-15 19:33（用户朋友反馈PDCA重合问题 + 新增留言板功能，进行中）

**背景一：朋友觉得每日总结和周报PDCA重合，讨论后暂停未决**

用户朋友用了PDCA周报后反馈"两个入口都在看统计数字，感觉多余"（每日总结的完成率/拖延统计 和 周报Check部分算的东西本质是同一类数据，只是天/周粒度不同）。讨论过程：
- 本体提过一个方案（周报页面里把7天概览做成可点，点开看那天详情，替代原来独立的总结入口），用户没确认
- 朋友后来提出不同方向："每一天都应该有自己的PDCA循环"，不只是周维度有。本体按P/D/C/A四步列了一串需要确认的问题（日目标是数字还是一句话意图、日PDCA和周PDCA是替代还是并存、Check会不会又跟每日总结重复、复盘怎么写、会不会增加打卡负担等），**用户说"现在先不用纠结这个问题了"，这条线暂停，没有结论，之后如果要继续必须先重新拿这批问题去问清楚，不能凭空假设已经有答案**

**背景二：新增留言板功能，需求已定，正在实现**

朋友截图里提了两个初步想法（打卡后弹提示"想对自己/对方说的话" + 首页留言板"崩溃时来看激励的话"），来回确认几轮后，最终拍板的确定需求（**以下是最终版，之前讨论过程中的"打卡后弹窗"等中间方案已被推翻，不要参照**）：

1. **不跟打卡流程挂钩**：取消"每次打卡后弹出"这个想法，改成一个独立的"我要留言"按钮，点击弹文本框，写完发布
2. **全部公开**：不做私密/仅自己可见，双方都能看到彼此写的所有留言
3. **只留最近10-20条**：查询时`order by created_at desc limit 20`即可，不需要主动清理旧数据
4. **"偶尔飘过"的动态效果**：不是静态列表、不是匀速跑马灯，是间隔性、随机地从屏幕一侧飘入划过另一侧消失，中间留空白间隔，营造氛围感而非查阅型入口

**已完成**：
- `supabase/schema.sql`第8节新增`messages`表(`sender_id`+`content`+`created_at`)，RLS读全开、insert/delete限本人，开了Realtime(配合"对方新留言能实时飘出来"的效果，不用等对方主动刷新)
- `lib/types.ts`加`Message`类型
- `lib/messages.ts`：`fetchRecentMessages`(限制条数)、`postMessage`、`subscribeNewMessages`(实时订阅新留言)
- 已派ui-designer出v5方案(`docs/ui-20260714-shared-checkin-v5.md`)：留言板固定位置、飘过动效具体规格、写留言入口、空状态、`prefers-reduced-motion`降级
  - 踩坑：第一次派工(19:33前后)中途不明原因被终止("已被用户停止，不会再恢复"，双方都没意识到有这个操作)，等了近40分钟没结果，SendMessage催问才发现任务已经没了不是卡住。20:11用同样的需求重新派了一次(新agent)，这次约11分钟正常完成。以后派长任务后如果等待时间明显超过历史耗时区间，要主动催问确认任务还活着，不要一直傻等
- UI实现：`components/MessageBoard.tsx`(飘动逻辑核心)、`components/MessageComposerDialog.tsx`(写留言弹窗，参照`CheckInDialog`)、`lib/use-prefers-reduced-motion.ts`(新hook)、`app/globals.css`加`@keyframes float-message`(用CSS自定义属性传起止位置，不是硬编码百分比)。`app/page.tsx`接入：留言板固定插在连接横幅之后、Tabs之前，明确不包进`isToday`/`dateMode`判断
- 派code-reviewer审查，发现一个真实的严重bug：`MessageBoard.tsx`首次播放的`useEffect`依赖`[loading, messages.length]`且返回了cleanup清定时器——如果在首次延迟播放的等待窗口内(1.5到4秒)收到一条新留言导致`messages.length`变化，React会触发这次effect的cleanup把还没触发的定时器清掉，但`firstLoadDoneRef`已经是true，effect主体直接return不会重新调度，**整个轮播从此永久失效，直到刷新页面**。这是两人正常使用场景下真实会撞上的时序竞态，不是极端边界条件。修法：定时器句柄挪到独立的`firstPlayTimerRef`，不再通过effect的cleanup清理，只在组件真正卸载的那个effect里统一清掉。顺手把手写的写留言按钮换成复用现有`Button`组件(reviewer指出漏了`active:bg-secondary`态)
- 已构建部署上线，`https://liudan-29.github.io/shared-checkin/`

**待完成**：ui-designer v5方案审核 → UI组件实现(飘过效果的展示组件、写留言弹窗、按钮) → 接入`app/page.tsx` → 数据库迁移(用户需要重新跑一遍`schema.sql`，这次新增了messages表) → 验证部署

**[仅本次会话相关，读者可跳过]** 这条记录是在对话即将触发上下文压缩前补写的检查点，目的是防止压缩丢失细节，后续会话接手时应该完整读这一节，不要依赖对话摘要里的转述。

## 2026-07-15 22:26（留言板v5.1：改并发飘动 + 历史/删除管理）

用户真机体验v5后反馈两点，推翻v5方案里"一条播完等间隔再播下一条、不做删除"的两条决策：

1. **要多条同时飘动**：明确类比"QQ空间"评论区同时有多条内容划过的效果，不要大段空白等待，怎么设计的美观度问题用户明确交给本体判断
2. **要留言历史+删除**：能看全部留言，自己发的能删掉

这次改动判定为"沿用已有token的延伸、体量不到新增功能模块级别"，本体直接实现，没有再派ui-designer（已对照`sub_agent_dispatch.md`的派工标准）：

- `lib/messages.ts`加`deleteMessage(id)`，走Supabase delete，RLS已有的`delete_own_message`策略(`auth.uid()=sender_id`)天然保证只能删自己的
- `components/MessageBoard.tsx`整体重写调度模型：原来单一`current`+`pickNext`/`playNext`+`gapTimerRef`的"一条播完等8-18秒再播下一条"模型，换成`lanes: (MessageView|null)[]`两条轨道并行，内部拆出`FloatingLane`子组件(靠`key={message.id}`保证每条留言remount、effect只跑一次)，父组件只负责"每隔2-4.5秒检查有没有空闲轨道、有就派一条新留言进去"的`scheduleSpawnAttempt`递归调度，不再有固定间隔等待。`MessageView`类型加`createdAt`字段
- 新建`components/MessageHistoryDialog.tsx`：列出全部留言(头像+内容+时间)，仅`isMine`的留言旁边带删除按钮
- `app/page.tsx`接入：`messageViews`补上`createdAt`映射、新增`historyOpen`state、`handleDeleteMessage`(乐观删除+失败回滚+toast重试，模式对齐`persistMySlots`)、渲染`<MessageHistoryDialog>`，`MessageBoard`新增"查看全部留言"按钮(History图标，写留言按钮旁边)
- `docs/ui-20260714-shared-checkin-v5.md`补了"v5.1修订记录"章节，说明原方案第5/6节"不并发/不做删除"的决策已被用户实际反馈推翻，不重写整份文档(保留原方案推理过程做历史记录)
- `npx tsc --noEmit`、`npm run build:pages`均通过。派code-reviewer审这次并发调度逻辑(定时器泄漏/竞态/重复播放)+删除功能，结论"需修改后复审"，两条must-fix：
  1. **只有1条留言时会被同时塞进两条轨道**——`pickNext`原来对"只剩1条"这个情况直接短路返回，没排除"已经在别的轨道飘着"的消息。改法：`trySpawnInto`整个用`setLanes`的函数式更新一次性完成"找空闲轨道→算当前正在飘的id集合→挑一条不在这个集合里的消息→写入"，原子操作，同时顺手修掉reviewer额外指出的一处竞态建议（两处派发逻辑各自读一次旧state可能互相覆盖，现在也在同一个函数式更新里解决）
  2. **删除没有二次确认**——项目里`SlotEditorSheet`/`GoalEditorSheet`删时段删目标都走`AlertDialog`确认，这次的删除入口漏了。补上：`MessageHistoryDialog.tsx`加`AlertDialog`确认弹窗("确认删除"/"再想想")，点删除图标先弹确认，选是了才真正调`onDelete`
  - 顺手采纳一条建议：删除按钮从裸`<button>`（32px，比项目其他同类图标按钮小且低于44px触控下限）换成复用`Button variant="ghost" size="icon"`（40px，与项目其余icon按钮一致）；`handleDeleteMessage`删除成功补一句`toast.success("已删除")`，跟其他删除操作的提示习惯对齐
  - 未采纳的建议（reviewer标为低优先级，暂不处理）：reduced-motion的淡入淡出时长实际被全局CSS的`!important`规则盖掉不生效（纯视觉细节，不影响功能正确性，且改动会牵扯全局规则不值得为这个小场景单开例外）；删除请求失败时的回滚快照可能连带冲掉并发到达的新留言（双人低频场景概率很低）；队列里等播放的消息如果播放前被删除仍会被播一次（窗口极窄，纯展示层瑕疵）
  - 复审：修完再次`npx tsc --noEmit`+`npm run build:pages`均通过，两条must-fix均已定位到具体代码并修复，未重新整份重派reviewer（改动范围小、定位明确，符合"改完可以直接复审这两点不需要重新走完整轮次"的reviewer原话）
  - **[仅本次会话相关，读者可跳过]** reviewer这次运行时验证受限：项目没有测试账号，主视图挂了真实Supabase登录守卫，reviewer只能验证`/login`公开路由能正常渲染+无console error，没能实际点开留言板触发两条轨道同时飘动、或打开历史弹窗点删除——must-fix的判断完全来自静态代码审查(逐行推演pickNext/trySpawnInto的执行路径)，不是运行时复现。本体这边同样受限于没有真实测试账号，只用Browser pane验证了dev server能正常起、`/login`无编译错误无console error，登录后的实际交互效果（尤其"QQ空间感"这个主观审美判断）仍需要用户在自己的设备上验证
- 已重新构建部署上线：`https://liudan-29.github.io/shared-checkin/`
- 待完成：用户真机验证"QQ空间感"是否符合预期

## 2026-07-16 08:04（删PDCA周目标 + 打卡产出发布留言板 + 留言板可折叠）

用户看了截图提三个要求，先走了`dispatch_preflight.md`的三步摊账流程（合并改动碰的文件数超过10个），确认分工后本体全部直接做，没有派code-writer/ui-designer（删除操作需要项目历史上下文本体最熟；两个新交互都要用户能实时看效果，规则规定这类无论体量都留主线）：

1. **删除PDCA周期目标功能**：用户反馈这块跟每日总结重合，决定整体删除，不只是藏入口图标。删除范围：`app/weekly/page.tsx`整个路由、8个专属组件(`GoalEditorSheet`/`GoalRow`/`GoalStatusTag`/`ReviewSection`/`ShareCard`/`SharePreviewDialog`/`WeekTicket`/`WeeklyCompareTable`)、4个lib文件(`week.ts`/`week-summary.ts`/`weekly-reviews.ts`/`share-image.ts`)、`lib/types.ts`里的`CycleGoal`/`NewCycleGoal`/`WeeklyReview`类型、`html-to-image`依赖（`npm uninstall`）。`DateTicket.tsx`删掉靶心图标和`onOpenWeekly`prop，`app/page.tsx`删掉对应wiring。用AskUserQuestion问清楚一个关键决策：Supabase的`weekly_reviews`表要不要一起删——**用户选择保留（代码删、表留着）**，以后想恢复不用重建数据，这个决定已经写进`CLAUDE.md`数据模型章节，不算删除不彻底。`docs/ui-20260714-shared-checkin-v4.md`保留不删，仅作历史记录
2. **打卡产出记录可选发布到留言板**：新建`components/ShareNoteToBoardDialog.tsx`（照抄`CheckInDialog`/`MessageComposerDialog`的Dialog+Button模式），`app/page.tsx`新增`offerShareNote(note)`辅助函数，在`handleCheck`打卡成功后、`handleSaveSlot`保存成功后（`persistMySlots`新增第4个`onSuccess`回调参数）都会触发——按用户确认的口径，"打卡当下"和"之后用`SlotEditorSheet`修改note"两个入口都要弹。note本身在`CheckInDialog`/`SlotEditorSheet`里已经限40字，跟留言板`content`的40字上限天然一致，不需要额外截断
3. **留言板可折叠**：`MessageBoard.tsx`加`collapsed`state，右侧图标区新增`ChevronUp`/`ChevronDown`折叠/展开按钮，容器高度用`transition-all duration-normal ease-default`过渡。**实现时自己排查出一个潜在bug并提前修复**：折叠时如果直接卸载飘动轨道的DOM，正在播放的`FloatingLane`会被卸载、它内部`useEffect`的cleanup清掉`setTimeout`，导致`onDone`永远不会触发，那条轨道会永久卡在"占用"状态，后台调度器再也找不到空闲轨道可派——所以`handleCollapse`函数会在设置`collapsed=true`的同时把`lanes`重置成全null数组，避免这个泄漏
- `npx tsc --noEmit`、`npm run build:pages`均通过（构建产物从7个路由变成6个，`/weekly`确认消失）
- 派两个code-reviewer并行审查（按"闭环可审查单元"拆批：一个专门验证删除是否干净无残留引用，一个专门审两个新功能的逻辑正确性）：
  - **删除PDCA这批**：✅通过，无must-fix。全项目Grep零残留引用、`DateTicket.tsx`/`app/page.tsx`/`lib/types.ts`删得干净、`html-to-image`在`package.json`和`node_modules`都确认清零、文档描述和代码现状一致。一条低优先级建议（`README.md`里有一处历史遗留的本机绝对路径，跟本次删除无关，暂不处理）
  - **两个新功能这批**：⚠️需修改后复审，两条must-fix都已修复：
    1. **`offerShareNote`会在note没变化时也重复弹**——比如打卡写了note之后，某天只是把这条时段的时间往后挪5分钟保存一下，也会把同一条没变的note再问一遍要不要发布，属实打扰。修法：`handleSaveSlot`保存前先记下`editor.slot`原有的note，成功回调里判断`data.note`是否真的和原值不同，只有变了才调`offerShareNote`
    2. **折叠/展开按钮是可访问性硬指标问题**——原来折叠态和展开态各自渲染一个独立的Button，点击后React会把旧按钮整个卸载、挂载新按钮，键盘/屏幕阅读器的焦点会跟丢（需要重新Tab才能找到新按钮）。修法：改成同一个Button元素常驻，只切换图标（`ChevronDown`/`ChevronUp`）和`aria-label`/`aria-expanded`，DOM节点不再被替换，焦点保持住
  - 顺手采纳两条建议：`trySpawnInto`加`collapsedRef`判断，折叠期间彻底跳过派发（原来后台调度器折叠时还在往`lanes`里塞消息，虽然不会卡死但纯属无意义的state搅动）；展开时补一次`containerWidth`重新测量（折叠期间track的DOM节点被卸载，用户如果转手机方向或调整窗口宽度，展开时按过期宽度算飘动起止点会跑偏）
  - 未采纳的建议（reviewer标为低优先级或需要真机验证才能确认是否值得处理，暂不处理）：展开动画进行到~60%之前`overflow-hidden`可能裁切第二条轨道一瞬间（reviewer自己也没能运行时验证，等用户真机看是否真的明显卡顿再决定要不要修）；历史note如果曾经绕过40字前端限制写入DB（无已知路径，纯理论风险）
  - 复审：修完再次`npx tsc --noEmit`+`npm run build:pages`均通过，Browser pane验证`/login`无console error（同样受限于没有测试账号，没能验证登录后的实际交互效果）
- 已重新构建部署上线：`https://liudan-29.github.io/shared-checkin/`
- 待完成：用户真机验证折叠展开的视觉效果
- 用户已确认"要不要发布到留言板"弹窗的触发时机和频率符合预期（只在note内容真的变化时弹，改时间/任务名不弹），这条不再需要验证

## 2026-07-16 08:44（模板同步到今天）

用户反馈模板编辑页改了模板后，今天的计划不会跟着变——先复述现状：未来日期本来就是每次现算预览、天然跟着模板走，唯一不同步的是"今天"（今天首次打开时从模板拷贝成独立数据，之后模板再改不会回溯影响）。问清楚需求后用户认可"只加不删"的保守方案（推荐理由：整体覆盖会撞上"已打卡时段怎么处理"这个绕不开的坑，保守方案行为可预测、覆盖大多数真实场景），确认后直接做（4个文件，远低于code-writer/code-reviewer的派工阈值，本体自查代替）：

- `lib/day-plan.ts`新增`isSlotAlreadyInDay`（按任务名+起止时间内容比对，不能按id比对——模板和当天计划的slot id各自独立生成）、`mergeTemplateSlotsIntoDay`（只把选中且内容还不存在的模板时段追加进当天计划，已打卡/已存在的一律不动，排序后返回）
- 新增`components/ui/checkbox.tsx`（`@radix-ui/react-checkbox`，项目里第一次用到勾选框，风格照抄`label.tsx`/`button.tsx`的token用法）
- 新增`components/SyncTemplateDialog.tsx`：勾选列表弹窗，跟当天计划内容一致的时段默认不勾并标"今天已有"标签，新增/改过的默认勾上；"同步"按钮在没有勾选项时禁用
- `app/template/page.tsx`接入：Tab切换栏下方新增"同步到今天"按钮，**只在当前查看的tab和今天实际的day_type一致时才显示**（避免在周末tab点同步却把周末模板塞进工作日的今天，这是设计阶段就想避开的坑）。点击后`ensureDayPlan`保证今天计划存在（跟主视图打开当天时建行逻辑一致），弹窗确认后合并保存
- `npx tsc --noEmit`、`npm run build:pages`均通过。改动4个文件，未派code-reviewer（远低于10文件/500行/安全敏感的派工阈值），本体自查了合并逻辑的幂等性（哪怕用户手动勾选了"今天已有"的条目，`mergeTemplateSlotsIntoDay`合并时还是会按内容再判一次，不会产生重复时段）和`<label>`包裹Radix Checkbox按钮的点击转发行为（`<button>`是HTML规范里的labelable元素，`<label>`点击会正确转发到嵌套的checkbox，不是只有原生`<input>`才行）
