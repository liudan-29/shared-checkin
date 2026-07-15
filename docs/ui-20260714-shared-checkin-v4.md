# 双人共享打卡 UI设计方案 v4：PDCA周期目标与汇报

本方案是v1（token与基础组件）、v2（日期导航与每日总结）、v3（日历跳转）的延伸，新增一整套独立页面`/weekly`：周维度目标设定（Plan）、周报对比（Check）、复盘（Act）、分享图片。不新增色相、字体、间距、圆角、阴影、动效token，不引入新的弹层原语（继续只用Drawer/Dialog/AlertDialog三种，不引入Popover/Select）。这是继v1/v2/v3之后第四轮界面扩展，体量达到"新增完整独立页面+一批新组件"级别。

---

## 1. Token与既有组件复用清单

扫描确认：`app/globals.css`的`:root`token表、`tailwind.config.ts`接线、v1/v2/v3文档描述与`components/`下现有实现完全一致，本方案唯一取值来源仍是这份token表，不新增任何token。

用到的既有类名（实际接线名）：

- 颜色：`bg-card`/`bg-popover`/`bg-secondary`/`bg-tertiary`、`text-foreground`/`text-muted-foreground`、`text-ink`/`bg-ink`/`bg-ink-subtle`/`text-primary-foreground`、`text-danger`/`bg-danger`/`bg-danger-hover`、`border-border`
- 字体：`font-display`/`font-body`/`font-mono`
- 字号：`text-sm`/`text-base`/`text-lg`/`text-xl`/`text-2xl`
- 圆角：`rounded-sm`/`rounded-md`/`rounded-lg`/`rounded-xl`/`rounded-full`
- 阴影：`shadow-sm`/`shadow-md`/`shadow-lg`
- 动效：`duration-fast`/`duration-normal`/`duration-slow`、`ease-default`/`ease-spring`、`animate-pulse-ring`/`animate-fade-in-up`/`animate-stamp-in`

既有组件直接复用：`PunchStrip`（周维度7格概览，见2.1，零改动直接喂新的状态数组）、`Drawer`/`DrawerContent`/`DrawerTitle`、`Dialog`/`DialogContent`、`AlertDialog`全套、`Tabs`/`TabsList`/`TabsTrigger`（目标类型切换）、`Button`、`Input`、`Label`、`Skeleton`、`CheckButton`的视觉语言（圆形描边按钮母题，本方案不直接复用组件本身）、`HistoryTag`的中性历史标签视觉语言（未达标状态直接沿用这一套配色）、`AddSlotRow`（加一个`label`prop变成可配置文案，见4.9）。

不新增第4种色相：目标达成态用accent，未达标态用中性灰（`bg-tertiary`+`text-secondary`，与HistoryTag同款），进行中态用虚线中性边框（与AddSlotRow/MissedMark/preview态SlotCard同款"尚未落定"视觉语言），全部在既有3色相预算内。

---

## 2. 信息层级方案

### 2.1 `/weekly`页面整体

- **第一层级**：当前查看的是哪一周（周范围大字，避免和别的周混淆）；本周完成率谁更高（Check区第一行）；我的每条目标最终结果——尤其"达成"/"未达标"这两个终局状态，这是PDCA闭环里情绪价值最高的反馈点。
- **第二层级**：目标列表明细（含"进行中"过渡态）、完成数/拖延次数/拖延时长具体数字、复盘文本内容、周维度7格概览。
- **第三层级**：分享入口、目标编辑表单里的字段说明文字、任务选择列表。

层级手段延续v1/v2：字号（`text-2xl`周范围>`text-xl`区块标题>`text-lg`目标描述/正文>`text-sm`标签）、颜色（accent=达成/胜出，`text-secondary`+`bg-tertiary`=中性历史，虚线中性=进行中）、字重（600强调数字），不靠单一维度。

### 2.2 Plan区（目标列表）

- 第一层级：目标本身的描述文字+状态标签
- 第二层级："我的目标"/"{peer}的目标"分组标题，编辑/删除入口（仅我的目标可见）
- 第三层级：空状态提示文案

### 2.3 Check区（周报对比）

- 第一层级：完成率两人并排数值
- 第二层级：完成数/拖延次数/拖延时长三行、目标达成recap列表
- 第三层级：无（这个区块本身就是数据展示，不需要更弱的信息）

### 2.4 Act区（复盘）

- 第一层级：我的复盘文本框（这是本区唯一需要用户主动输入的地方）
- 第二层级："{peer}的复盘"只读卡片
- 第三层级：字数计数、保存按钮态

---

## 3. 布局结构

### 3.1 `/weekly`整体布局（375px，单栏纵向流）

```
┌─────────────────────────────────────┐
│ [←]  7月14日–7月20日                  │ WeekTicket Row1：返回箭头+周范围
│  ‹        回到本周        ›          │ Row1.5：导航（同DateTicket范式）
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │ 打孔虚线（同DateTicket）
│ 本周  ▣▣▣□□□□(周一到周日)   18/24    │ Row2：WeekStrip(复用PunchStrip)+计数
├─────────────────────────────────────┤ space-6
│ 目标                                  │ text-xl font-display 区域标题
│  我的目标                             │ text-sm text-muted-foreground
│ ┌───────────────────────────────┐   │
│ │ 本周完成率≥90%          [进行中] │   │ GoalRow(editable)
│ │ 目前78%                         │   │
│ └───────────────────────────────┘   │ space-2
│ ┌───────────────────────────────┐   │
│ │ 背单词一次不落          [达成]  │   │ GoalRow(editable)
│ │ 已完成5/5次                     │   │
│ └───────────────────────────────┘   │
│ ╭┄┄┄┄┄ ＋ 添加目标 ┄┄┄┄┄╮          │ AddSlotRow(label="＋ 添加目标")
│                                       │ space-4
│  小北的目标                           │
│ ┌───────────────────────────────┐   │
│ │ 本周完成率≥80%          [未达标] │   │ GoalRow(readonly)
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤ space-8（跨大区块间距更大）
│ 周报对比                              │ text-xl
│ ┌───────────────────────────────┐   │
│ │        我          小北          │   │ WeeklyCompareTable
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄     │   │
│ │ 完成率    78%        62%         │   │
│ │ 完成数   18/24      15/25        │   │
│ │ 拖延次数   2次        5次         │   │
│ │ 拖延时长  40分钟    1小时20分     │   │
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄     │   │
│ │ 目标达成                         │   │
│ │ ● 本周完成率≥90%       [进行中]  │   │ recap行（我的+对方的都列，见4.7）
│ │ ● 背单词一次不落        [达成]  │   │
│ │ ○ 本周完成率≥80%       [未达标]  │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤ space-8
│ 复盘                                  │ text-xl
│  我的复盘                             │ text-sm muted
│ ┌───────────────────────────────┐   │
│ │ [textarea：这周过得怎么样]        │   │ Textarea(新增共享组件)
│ └───────────────────────────────┘   │
│                          [保存复盘]   │ 右对齐 Button size=sm
│  小北的复盘                           │ space-4
│ ┌───────────────────────────────┐   │
│ │ 只读文本，或"小北还没写复盘"        │   │ bg-tertiary只读卡片
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤ space-8
│        [ 生成我的分享图 ]             │ Button primary，居中/全宽
└─────────────────────────────────────┘
```

桌面端（≥768px）：`max-w-[560px] mx-auto`，与`/template`、`SlotEditorSheet`、`SummarySheet`、`DateJumpSheet`同宽度基准，不引入新的内容宽度值。

### 3.2 未来周（本周还没开始）的降级布局

```
┌─────────────────────────────────────┐
│ [←]  7月21日–7月27日   👁 预览        │ mode徽标同DateTicket的preview样式
│  ‹        回到本周        ›          │
├─────────────────────────────────────┤
│ 目标                                  │ Plan区正常显示，可以提前设目标
│  ...（同3.1）                         │
├─────────────────────────────────────┤
│ 这周还没开始，数据和复盘等这周开始后再看  │ text-base text-muted-foreground
│                    （居中，py-space-8）│ Check/Act/分享入口整体不渲染
└─────────────────────────────────────┘
```

Plan区在未来周依然完整可用（PDCA里"提前定下周目标"是合理场景），Check（还没有数据）和Act（还没有可复盘的事）在未来周整体隐藏，用一句居中说明代替，不渲染空的对比表格造成"全是0%"的误导。分享入口同样隐藏（未来周没有可分享的内容）。

---

## 4. 组件规格清单

通用规则延续v1：所有可交互元素`focus-visible`时2px `--color-accent` ring；移动端可点目标≥44×44px；hover仅桌面端生效。

### 4.1 WeekTicket（新增，容器组件，参考DateTicket视觉语言但改周粒度）

Props：`weekStart: string`、`mode: "current" | "past" | "future"`、`weekDayOutcomes: SlotStatus[]`（长度7，周一到周日）、`doneCount`、`totalCount`、`onPrev`、`onNext`、`onJumpCurrentWeek`、`onBack`、`prevDisabled`、`nextDisabled`。

- 容器：`bg-card`、`rounded-lg`、`shadow-md`、内边距`p-4`（与DateTicket完全一致的票据卡片母题）
- Row1：左侧44×44返回箭头（`ArrowLeft`，复用`/template`页返回按钮的四态：hover `bg-secondary`）+ 周范围文字「7月14日–7月20日」`font-display text-2xl text-foreground`（跨年时前缀年份，见7.9）。**不放总结/模板/头像图标**——这是子页面，账号相关操作回主视图处理，保持这页面聚焦在周报本身
- Row1.5导航行：结构与DateTicket的Row1.5完全一致（44×44 ChevronLeft/ChevronRight + 中间徽标区+"回到本周"），徽标三态：
  - `mode==="current"`：留空（无徽标，延续v2"没有徽标=完全可操作"的约定）
  - `mode==="past"`：`Clock`图标12px+"已结束"`text-sm text-muted-foreground`，`bg-tertiary`、`rounded-full`，内边距2px 8px——注意这不是"只读锁定"徽标（不用Lock图标），因为Plan区在过去周仍然可编辑，这个徽标纯粹告知"这周的Check/Act已经是最终结果"
  - `mode==="future"`：`Eye`图标12px+"预览"`text-sm`，同样式，语义同v2的preview徽标（这周内容还没发生）
  - 两态都紧接"回到本周"可点文字，样式同DateTicket
- 打孔分隔线：同DateTicket，1px dashed `border-border`
- Row2：「本周」`text-sm text-muted-foreground` + `<PunchStrip statuses={weekDayOutcomes} size={12} />`（直接复用组件，不改代码）+ 右侧`{doneCount}/{totalCount}`（本周7天累计完成时段数/总时段数）`font-mono text-base font-semibold text-foreground`右对齐
- 四态：所有交互元素复用DateTicket已定义的四态规格，不重新定义

### 4.2 GoalStatusTag（新增，三态视觉核心组件）

Props：`status: "in_progress" | "achieved" | "missed"`。

| status | 图标 | 文字 | 底色 | 边框 | 文字色 | 视觉语义 |
|---|---|---|---|---|---|---|
| `achieved` | `CircleCheck`12px | "达成" | `bg-ink-subtle`（accent-subtle） | 无 | `text-ink` | 平静的正向确认，不用CompletionStamp那种旋转印章——每日打卡是高频动作需要爽感反馈，周目标达成是低频的回顾性确认，不需要同等强度的仪式感 |
| `missed` | `Minus`12px | "未达标" | `bg-tertiary` | 无 | `text-secondary` | 与`HistoryTag`同款中性灰视觉，明确不借用DelayTag的红色+虚线+倾斜（那套语言表达"正在发生、还能补救"，未达标是已盖棺定论的历史结果，用法与v2"过去未完成用中性灰不用danger红"的既有决策完全一致） |
| `in_progress` | `Clock`12px | "进行中" | 透明 | `1px dashed border-border` | `text-muted-foreground` | 虚线边框沿用AddSlotRow/MissedMark/preview态SlotCard已建立的"尚未落定"视觉语言，与`missed`的实心中性灰区分开——一个是"还没盖棺"，一个是"已经盖棺但结果不好" |

- 统一形态：inline-flex，`rounded-sm`，内边距2px 8px，`text-sm`
- 三态两两可辨：achieved用色（唯一有颜色的一态），missed/in_progress都是中性但一虚线一实心，颜色不是唯一区分通道
- 纯展示，无交互态，无动画（这是回顾性数据，不需要动效强调；这一点在ShareCard里同样成立）

### 4.3 GoalRow（新增，目标列表单行，editable/readonly两个variant）

Props：`goal: CycleGoal`、`status: "in_progress" | "achieved" | "missed"`、`progressText?: string`（如"目前78%"/"已完成5/5次"，由调用方算好传入，组件不关心具体算法）、`variant: "editable" | "readonly"`、`onClick?: () => void`（仅editable用，打开GoalEditorSheet）。

- 容器：`bg-card`、`rounded-md`、`shadow-sm`、内边距`px-4 py-3`，最小高度56（结构上接近`TemplateSlotRow`，比`SlotCard`更轻量——目标是一句话陈述，不需要SlotCard那种多行信息密度）
- 行1：目标描述文字`font-display text-lg text-foreground`（`overall_rate`渲染为"本周完成率≥{target_rate}%"，`task_target`渲染为"{task_label}一次不落"）+ 右侧`GoalStatusTag`，`flex-wrap items-center justify-between gap-2`
- 行2（若`progressText`存在）：`font-mono text-sm text-muted-foreground`，距行1`mt-1`
- editable variant：整行`onClick`打开`GoalEditorSheet`（编辑模式），右侧追加`Pencil`图标18px `text-muted-foreground`（跟随任务名后的编辑提示同一视觉语言），`cursor-pointer`，hover `bg-popover`，active `bg-secondary`，过渡`duration-fast`
- readonly variant：无`onClick`、无`Pencil`图标、无hover/active态（与SlotCard的peer variant同款"不可点=不显示任何可点提示"原则）
- 任务描述过长处理：单行截断`truncate`，最长约14个汉字（与SlotCard任务名的截断基准一致）

### 4.4 GoalEditorSheet（新增，目标新增/编辑抽屉）

Props：`open`、`onOpenChange`、`mode: "add" | "edit"`、`initial?: CycleGoal`、`availableTasks: string[]`（去重后的模板任务名列表，按第7节顺序约定排好序传入）、`onSave: (goal: Omit<CycleGoal, "id">) => void`、`onDelete?: () => void`。

- 复用`Drawer`/`DrawerContent`/`DrawerTitle`，结构同`SlotEditorSheet`：标题「添加目标」/「编辑目标」`font-display text-lg`
- 类型切换：复用`Tabs`/`TabsList`/`TabsTrigger`原样式（`h-12 bg-secondary rounded-md p-1`轨道，选中态`bg-card`+`shadow-sm`），两个trigger「整体完成率」「具体任务」，与主视图"我的/TA的"、模板页"工作日/周末"同一视觉语言，全宽度
- **整体完成率**分支：
  - Label「目标完成率」`text-sm text-secondary`可见
  - Input（复用`components/ui/input.tsx`）：`type="number"` `min={1}` `max={100}` `step={1}`，`h-11 bg-secondary rounded-md font-mono text-lg`，右侧内嵌固定「%」`text-sm text-muted-foreground`（与SlotEditorSheet任务名字段的字数计数器同一视觉技巧：`absolute right-3`叠加）
  - 校验：非空、1-100整数；失焦校验，错误就近显示`CircleAlert`+`text-danger`「填一个1到100的整数」
- **具体任务**分支：
  - Label「选择任务」`text-sm text-secondary`
  - 任务选择列表（不引入Select/Popover，延续v3"项目当前没有这个原语"的既有约束）：纵向堆叠的可选行，每行`button`，`h-11 w-full rounded-md bg-secondary px-3 text-left text-base text-foreground`，选中态`bg-card ring-2 ring-ink`+右侧`Check`图标16px `text-ink`；行间距`space-2`；超过6行时列表本身`max-h-48 overflow-y-auto`（避免抽屉整体过高，与`DrawerContent`已有的`max-h-[85vh]`外层滚动是两层独立滚动区）
  - 空状态（`availableTasks`为空）：「还没有模板任务」`text-sm text-muted-foreground` + 次级按钮「去编辑模板」（`Button variant="secondary" size="sm"`，跳`/template`）
  - 列表下方固定说明：「达成条件：这周排的每一次都要完成」`text-sm text-muted-foreground`（`target_type`目前只有`"all"`一种取值，用说明文字代替多余的选择控件）
- 按钮区：「保存」`Button`全宽h-12（`availableTasks`为空且类型为"具体任务"时disabled）；编辑模式追加「删除这个目标」`text-base text-danger`文字钮，点击弹`AlertDialog`「删除后本周就没有这条目标了」确认，措辞与`SlotEditorSheet`的删除确认句式一致
- 出入场：与`SlotEditorSheet`完全相同（上滑入`duration-slow`，下滑出`duration-normal`，`ease-default`）

### 4.5 Textarea（新增，共享基础组件，`components/ui/textarea.tsx`）

项目目前`components/ui/`下没有这个基础组件，`SlotEditorSheet`的备注字段是内联手写的`<textarea>`。本方案新增复盘文本框是第二个多行文本场景，建议抽成共享组件，视觉规格与`Input`保持同一套语言：

- `border-0 bg-secondary rounded-md px-3 py-2 text-lg font-body text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring`
- 默认`rows={4}`（比`SlotEditorSheet`备注字段的`rows={2}`更高，复盘是更长的文字，需要更多可视空间）、`resize-none`
- Props额外支持`maxLength`，配合外部字数计数器（复用SlotEditorSheet的"字数/上限"角标写法：`absolute bottom-2 right-3 text-sm text-muted-foreground`）
- 这是新增基础组件而非页面专属组件，`SlotEditorSheet`的备注字段可以（但不强制）随手迁移到这个共享组件，是否迁移不影响本次交付，留给code-writer按改动成本判断

### 4.6 ReviewSection（新增，复盘编辑区容器）

Props：`myNote: string`、`onMyNoteChange: (v: string) => void`、`onSave: () => void`、`saving: boolean`、`peerName: string`、`peerNote: string | null`。

- 「我的复盘」`text-sm text-muted-foreground`标签 + `Textarea`（4.5）`maxLength={300}`，右下角字数「120/300」
- 保存按钮：`Button size="sm"`右对齐，`mt-3`，`loading={saving}`（走Button既有的loading态，文案"保存中…"）
- 「{peerName}的复盘」标签，`mt-4` + 只读卡片：`bg-tertiary rounded-md p-3 text-base text-foreground whitespace-pre-wrap`；`peerNote`为空时显示「{peerName}还没写复盘」`text-muted-foreground`
- 保存成功：`toast.success("已保存复盘")`；失败：`toast.error("保存没同步上", action: 重试)`，与项目现有toast文案风格一致

### 4.7 WeeklyCompareTable（新增，独立容器组件，视觉逻辑复用`SummaryCompareTable`）

**复用/独立的判断**：4行核心指标（完成率/完成数/拖延次数/拖延时长）与`SummaryCompareTable`的`Row`/`pickWinner`/`Avatar`渲染逻辑完全相同，只是数据来源从"一天"换成"一周累计"，两者数据结构形状一致（都是`DaySummary`）。但本组件需要在4行指标之后追加"目标达成recap"这一块`SummaryCompareTable`完全没有的内容，整体不是同一个组件的variant，是独立容器。

**建议**：把`SummaryCompareTable`内部的`Avatar`、`pickWinner`、`Row`三个片段抽成共享模块（如`components/CompareRow.tsx`），`SummaryCompareTable`和本组件都从这个共享模块导入，避免两处维护同一套视觉逻辑产生漂移。这是行为不变的纯提取（不改`SummaryCompareTable`任何已渲染效果），不属于禁止的"越权重构"。如果code-writer评估这个提取的改动面不划算，也可以接受两处各自保留一份约20行的`Row`实现，但必须保证视觉规格逐字节一致（间距、字号、字重、颜色规则），不能出现"两个长得不一样但功能相同的组件"。

Props：`peerName`、`myWeek: DaySummary`（周累计聚合，形状与`lib/day-summary.ts`的`DaySummary`一致）、`peerWeek: DaySummary`、`myWeekExists: boolean`、`peerWeekExists: boolean`、`myGoalRecaps: { goal: CycleGoal; status: GoalStatus }[]`、`peerGoalRecaps: 同上`。

- 容器/Header/分隔线/4行指标：与`SummaryCompareTable`逐字节相同规格（`bg-card rounded-lg shadow-sm p-4`，Header两个Avatar+姓名，`1px dashed border-border`分隔线，4行`Row`）
- 4行之后追加第二条`1px dashed border-border`分隔线，`my-3`
- 「目标达成」`text-sm text-muted-foreground`标签
- recap列表：`myGoalRecaps`在前、`peerGoalRecaps`在后，每条一行：16px头像圆点（`bg-ink-subtle text-ink`首字，与`SummaryNotesList`的作者小圆点同规格）+ 目标描述`text-sm text-secondary truncate`（复用4.3的文案渲染规则）+ 右侧`GoalStatusTag`（4.2），`flex items-center gap-2 justify-between`，行距`space-2`
- 若某一方本周目标为空：该方对应的recap区用单行「我还没设本周目标」/「{peerName}还没设本周目标」`text-sm text-muted-foreground`代替，与`SummaryNotesList`空状态"这天没有人写备注"同等分量（不是`EmptyStateMine`那种带图标带按钮的重量级空状态，因为这只是卡片内的一个子区块）
- 入场：4行指标沿用`SummaryCompareTable`已有的60ms交错`fade-in-up`；recap列表紧接着继续交错（不重新从0开始延迟），保持一条连贯的入场节奏

### 4.8 ShareCard（新增，离屏渲染专用，纯展示无交互控件）

这是截图目标元素，不是用户平时交互的界面。**只包含我自己的数据**（完成率、目标达成、我的复盘），不含对方任何数据，这是需求明确的隐私考虑。

Props：`weekLabel: string`（如"7月14日–7月20日"）、`myName: string`、`completionRatePercent: number`、`goals: { goal: CycleGoal; status: GoalStatus }[]`、`reviewNote: string | null`、`generatedAtLabel: string`。

- 固定宽度360px，高度随内容自然增长（离屏渲染，不受视口限制）
- **关键工程约束**：这个元素被截图库单独捕获，不会继承`<body>`的全局暗纹背景，容器自身必须显式设置和`body`相同的`background-color: var(--color-bg-primary)`+点阵纹理`background-image`（与`app/globals.css`里`body`的写法完全一致地内联到这个组件根节点上），否则导出的图片背景会是透明或纯白
- 顶部"撕票"边缘：模拟一整条打孔票据的撕开边，是DateTicket/SummaryCompareTable已经用过的"两端半圆缺口"手法（v1 4.1节）的横向重复版——在主体卡片上方12px高的区域里，用一排等距重复的8px圆形缺口（间隔16px，颜色与外层背景`--color-bg-primary`相同，视觉效果是"啃掉"主体卡片顶边），不是新发明的视觉语言，是既有打孔母题的自然延伸
- 主体面板：`bg-card`、`rounded-xl`（本方案里视觉最突出的一张卡，用XL圆角）、`shadow-lg`、内边距`space-6`（比常规卡片`space-4`更宽松，呼应"这是一份要拿出去的成果"而非日常密集信息流）
- Header行：左侧应用小标「双人打卡」`font-display text-sm text-secondary`，右侧周范围「{weekLabel}周报」`text-sm text-muted-foreground`
- Hero区（居中）：一个120px直径的双圈徽章（复用`CompletionStamp`的双圈描边手法但放大到印章级尺寸：外圈2.5px `border-ink`，内圈1px `border-ink` inset 6px），圈内居中显示完成率数字（一次性大字号40px `font-mono font-semibold text-ink`，这是本卡里唯一超出常规字号阶梯的一次性尺寸，理由与`CompletionStamp`内部10-11px小字同理——离屏成果展示允许打破常规阶梯服务视觉冲击）+「%」较小字号，圈下方「本周完成率」`text-sm text-secondary`
- 目标达成列表（若`goals`非空才渲染，为空整段不出现——分享卡片不该主动暴露"这周没设目标"）：每条「{目标描述}」`text-sm text-foreground`+`GoalStatusTag`（4.2原样复用，纯展示组件天然适配离屏场景）
- 复盘摘录（若`reviewNote`非空才渲染）：一个便签式内嵌面板，`bg-tertiary rounded-md p-3`，`rotate-[1deg]`轻微倾斜+`1px dashed border-border`，模拟"贴上去的便利贴"，文字`text-base text-foreground`，最多显示4行，超出用`line-clamp-4`截断（固定宽度容器不能让文字无限撑高图片）
- 底部：「你的拖延，TA看得见」`text-xs text-muted-foreground`（复用登录页品牌语）居中 + 「生成于{generatedAtLabel}」`text-xs text-muted-foreground`
- 无任何`onClick`、无hover/active态、无动画——纯展示，且需要在字体加载完成（`document.fonts.ready`）之后再触发截图，否则导出图片可能落在系统回退字体上导致视觉不一致

### 4.9 SharePreviewDialog（新增，分享交互容器）

Props：`open`、`onOpenChange`、`imageDataUrl: string | null`（生成中为`null`）、`onDownload`、`onShare?`（不支持`navigator.share`的环境不传，按钮整体不渲染）。

- 复用`Dialog`/`DialogContent`，视觉规格与既有`PhotoDialog`（v1 4.11）一致：`bg-popover rounded-xl shadow-lg`，居中，右上角40×40`X`关闭钮
- 生成中：`Skeleton`占位（复用`components/ui/skeleton.tsx`），尺寸对应ShareCard的360宽高比，脉冲动画，不用旋转图标
- 生成完成：图片`max-width: 100%`、`rounded-lg`、`shadow-md`居中显示
- 下方按钮行，`justify-center gap-3 mt-4`：「下载」`Button variant="secondary"`+`Download`图标；「分享」`Button variant="primary"`+`Share2`图标（仅`onShare`存在时渲染，不支持的浏览器整个按钮不出现，不展示禁用态按钮误导用户）
- 生成失败：`toast.error("生成图片失败，再试一次")`，关闭Dialog并重置状态

### 4.10 DateTicket（既有组件，新增第4个图标入口）

在Row1现有`[总结][模板][头像]`图标组里，紧邻"总结"图标之后插入第4个：`Target`图标18px，`aria-label="本周PDCA周报"`，跳转`/weekly`，四态规格与现有图标按钮完全一致（`h-10 w-10 rounded-md text-muted-foreground hover:bg-secondary active:scale-[0.92]`）。图标组顺序变为「总结→周报→模板→头像」，两个"回顾类"操作相邻，模板（设置类）和头像（账号类）保持原有相对顺序不变。

### 4.11 AddSlotRow（既有组件，小改：文案可配置）

新增可选prop`label?: string`（默认值"＋ 添加时段"，保证不传时现有两处调用行为不变）。本方案调用时传`label="＋ 添加目标"`，其余视觉/交互规格不变。

---

## 5. 交互与动效规范

### 5.1 周切换

行为与v2的日期切换分支完全对应：点击前进/后退箭头，内容区`translateX(±8px)→0`+fade，`duration-normal ease-default`；点击"回到本周"用纯fade（不定距离跳转不用位移）。到达边界后箭头disabled，不额外toast提示。

### 5.2 新增/编辑/删除目标

`GoalEditorSheet`出入场与`SlotEditorSheet`相同（上滑入`duration-slow`，下滑出`duration-normal`）。保存成功后新目标行以`translateY(8px)`+fade插入列表（`duration-normal`，与SlotCard新增时段插入动画语言一致）；删除的目标行高度塌缩+fade out。类型切换（整体完成率↔具体任务）用Tabs既有的底块位移过渡，不新造动效。

### 5.3 保存复盘

点击"保存复盘"：按钮进入loading态（`Button`内建的`loading`态，文案"保存中…"，与项目其它保存按钮一致，不用菊花图标）；成功后toast提示；不做"保存后文本框自动锁定只读"的处理，允许随时再次编辑。

### 5.4 生成分享图

1. 点击"生成我的分享图"：`SharePreviewDialog`立即以`open=true`打开，`imageDataUrl`为`null`（骨架屏态），`duration-normal`淡入
2. 后台：等待`document.fonts.ready`，渲染离屏`ShareCard`，用截图库导出PNG（`pixelRatio: 2`保证清晰度）
3. 生成完成：骨架屏fade out，图片fade in，`duration-normal`
4. 失败：Dialog内展示错误提示或直接toast+关闭（見4.9）

这是本方案除周切换外唯一值得强调的"高冲击时刻"候选，但由于分享图是低频操作（一周一次量级），不需要像每日打卡盖章那样做弹性入场，保持克制的fade过渡即可，不喧宾夺主。

### 5.5 状态切换总则（延续v1/v2/v3）

一切可见性变化（徽标切换、GoalStatusTag出现、空状态切换、Check/Act区块在未来周整体隐藏/显示）进场`duration-normal`出场`duration-fast`，`ease-default`，不允许瞬间出现消失。`prefers-reduced-motion`全局已处理，本方案新增动效遵循同一规则。

---

## 6. 设计依据

延续v1/v2/v3的Design Thinking四问，本次新增功能下的具体回答：

- **Purpose**：两人各自给自己定一个"这周想做到什么程度"的目标，周末回头看有没有做到，写几句复盘，顺手能把自己这部分晒给别人看。这是打卡应用从"记录当下"延伸到"回顾一个周期"的自然生长，不是另一个不相关的功能。
- **Tone**：延续"打卡钟与印章"，但把节奏从"每日高频动作"切换到"每周一次的仪式性回顾"——分享卡片是这个基调里唯一被允许"隆重一点"的地方（更大的印章、更宽的留白、torn-ticket边缘），日常的Plan/Check/Act区域仍然克制。
- **Constraints**：不引入Popover/Select等新弹层原语（沿用v3确立的约束）；不新增色相；分享图生成需要一个新的客户端截图库依赖（首次为本项目引入这类依赖，见第8节）。
- **Differentiation**：分享卡片的"撕票边缘+印章式完成率徽章"是本方案的记忆点——收到这张图的人，即使不用这个App，也能从视觉上感知"这是一张从打孔票据机里扯出来的成绩单"，延续v1建立的核心隐喻而不是另起一套。

关键决策的为什么：

- **目标达成三态不复用CompletionStamp/DelayTag，而是新造`GoalStatusTag`**：CompletionStamp是"每日高频动作的即时爽点"，DelayTag是"进行时的紧急警报"，两者的情绪强度都不适合"回顾一周结果"这种低频、平静的场景。三态各自的视觉语言（accent-subtle平静确认/中性灰历史陈述/虚线待定）全部复用项目已有的色彩语义分层，没有引入新逻辑。
- **"未达标"明确不用danger红**：这是需求原文明确要求的，也是v2"过去未完成用中性灰、不用DelayTag红色"决策的直接延伸——同一件"没做到"的事，在"正在拖延"（进行时，还能补救）和"盖棺定论"（过去时，已成历史）两种语境下必须用不同强度的视觉语言，这条原则在v2已经验证过一次，本次是第二次应用同一原则。
- **`GoalRow`用`TemplateSlotRow`级别的轻量卡片而非`SlotCard`级别的重卡片**：目标本身是一句话陈述（"完成率≥90%"/"背单词一次不落"），不像时段卡需要承载时间+任务名+打卡时间+照片+备注多层信息，用重卡片会造成不必要的视觉冗余。
- **Plan区目标编辑不锁定"只读周"**：需求原文强调"目标随时能改，不锁死"，本方案没有像daily slot那样给过去周加"只读"限制。这带来一个待确认的公平性顾虑（见第7节第3条），本方案选择先按需求原文实现，把顾虑摆出来让产品拍板而不是自己悄悄加限制。
- **`WeeklyCompareTable`视觉逻辑复用、容器独立**：4行核心指标和`SummaryCompareTable`数据结构完全同构，理应共享同一套`Row`/`pickWinner`渲染逻辑；但整体组件需要承载`SummaryCompareTable`没有的"目标达成recap"内容，容器层面是两个不同的组件而非一个组件的variant。这个判断直接对应第4.7节明确写出的复用边界。
- **周维度导航复用`PunchStrip`组件本身，不新造"周概览"组件**：把每一天的"完成/未完成/进行中/未开始"归纳成`SlotStatus`的一个值后，视觉表现和已有的`PunchStrip`逐格渲染规则完全吻合，只需要一个新的数据计算函数（把7天的汇总结果映射成`SlotStatus[]`），不需要新UI组件——这是"项目现状优先"原则的直接体现，能复用绝不新造。
- **分享卡片背景纹理必须显式内联而非依赖`body`继承**：这是离屏截图的工程正确性问题不是审美问题，写进组件规格而不是留给code-writer自己发现，避免上线后出现"分享出去的图背景是白的"这种一次性很难在常规测试里发现的bug。

---

## 7. 待决策项

1. **`target_rate`的存储单位**：本方案默认百分比整数（如90，对应"完成率≥90%"），因为用户输入心智模型是"打90%"而不是"打0.9"，且和现有`SummaryCompareTable`展示的四舍五入百分比直接比较不需要换算。如果团队更倾向和`completionRate`（0-1小数）同口径存储，需要在表单层做换算，纯技术选择，不影响本方案任何视觉规格。
2. **周导航范围（过去/未来各多少周）**：本方案建议默认过去12周、未来4周（对应日维度v3的180天/90天，按周重新估算得出的粗略等价值），需要确认具体数字，这条直接影响`minWeekStart`/`maxWeekStart`的边界判定。
3. **目标编辑权限是否需要限制"只能改本周及未来"**：需求原文是"目标随时能改，不锁死"，本方案按字面理解为"任意一周查看时都能改自己的目标"，包括已经结束很久的历史周。但这带来一个潜在顾虑：如果允许在周报"未达标"出现之后回头把目标悄悄改低，会削弱PDCA复盘的诚实性。本方案没有自作主张加限制，这条需要产品明确拍板：是完全不限制、还是只允许改"当前周及未来周"、或是允许改但保留"最初设定值"的历史痕迹。同样的问题也适用于"我的复盘"文本是否可以在很久之后编辑。
4. **"具体任务目标·全部完成"的判定口径**：如果某一天用户临时改了当天安排、导致这个任务当天根本没出现在计划里，这天算"跳过不计"还是算"没完成"？这是业务逻辑问题，不是视觉问题，本方案只约定了`progressText`这个展示文案的输入契约（如"已完成5/5次"/"目前3/5次"），具体分子分母怎么算需要code-writer在`lib`层和产品口径对齐后再实现，不在本次UI方案范围内下结论。
5. **分享卡片的生成技术选型**：本方案建议客户端截图库（如`html-to-image`），纯前端方案，兼容当前GitHub Pages静态导出部署（不需要服务端渲染或额外服务）。这是本项目第一次引入图片生成类依赖，需要确认技术选型没有异议（体积约30KB级别，不算重）。
6. **Row1图标拥挤风险**：DateTicket现有图标行加第4个40×40图标后，在375px下"日期文字+4个图标"大致贴近可用宽度边界，具体是否会挤压/换行需要code-writer实测确认。本方案按派工要求"现有图标行新增第4个图标"直接实现，没有预先假设一套备用布局（比如把总结和周报合并成一个下拉），如果实测证明太挤，需要回来重新设计这一行的结构，不属于本方案默认方案。
7. **复盘文本字数上限**：本方案建议300字（明显长于每日备注的40字上限，因为周复盘是更完整的一段反思），如果产品想要更长或更短需要调整这一个数字，不影响其它任何规格。
8. **分享卡片里任务名/目标描述的截断策略**：本方案用`truncate`/`line-clamp-4`给了截断方向，但固定宽度360px下具体能容纳多少个汉字没有精确验算（不同于v1对"任务名最长约14个汉字"的字体渲染验算），需要code-writer在实际字体渲染下测量确认，必要时调整目标描述的文案长度上限（比如`task_label`本身在选择时就该受模板任务名≤20字的既有上限约束，通常不会太长）。

---

## 8. 给code-writer的交付说明

**扫描来源**：v1/v2/v3方案文档（token与组件规格唯一取值来源）、项目CLAUDE.md（数据模型、时间处理约定、禁止清单）、`supabase/schema.sql`（`weekly_reviews`表已经建好：`user_id`+`week_start`唯一约束，`goals jsonb`+`review_note text`，未开Realtime）、`lib/types.ts`（现有`Slot`/`PlanSlot`/`Template`/`DayPlan`类型，本方案新增`CycleGoal`/`WeeklyReview`两个类型）、`lib/day-summary.ts`/`lib/slot-status.ts`/`lib/preview-plan.ts`/`lib/day-plan.ts`/`lib/templates.ts`（现有统计与数据访问模式，`fetchDaySlotsForDate`这个按past/current/future分流的读取函数已经是为"整周7天读取"预留的公共辅助，直接复用）、`components/`全部既有组件源码（`DateTicket.tsx`/`SummarySheet.tsx`/`SummaryCompareTable.tsx`/`SummaryNotesList.tsx`/`PunchStrip.tsx`/`HistoryTag.tsx`/`MissedMark.tsx`/`CompletionStamp.tsx`/`AddSlotRow.tsx`/`TemplateSlotRow.tsx`/`SlotEditorSheet.tsx`/`DateJumpSheet.tsx`/`MonthGrid.tsx`）、`app/template/page.tsx`/`app/page.tsx`（独立页面范式与主页状态管理模式）、`components/ui/`全部基础组件。

**复用**：v1-v3定义的全部token；`Drawer`/`Dialog`/`AlertDialog`/`Tabs`/`Button`/`Input`/`Label`/`Skeleton`原样复用；`PunchStrip`原样复用（喂入按周聚合算出的`SlotStatus[]`，零代码改动）；`GoalStatusTag`的"未达标"视觉直接对齐`HistoryTag`已建立的中性灰约定。

**新增组件**（放`components/`，PascalCase，与既有文件同粒度）：`WeekTicket`、`GoalStatusTag`、`GoalRow`、`GoalEditorSheet`、`ReviewSection`、`WeeklyCompareTable`、`ShareCard`、`SharePreviewDialog`。

**新增共享基础组件**：`components/ui/textarea.tsx`（项目目前没有这个基础组件，`SlotEditorSheet`的备注字段是内联手写的，本次复盘文本框是第二个多行文本场景，建议提取，具体规格见4.5）。

**修改既有组件**：

- `DateTicket.tsx`：Row1图标组新增第4个图标入口（`Target`，跳`/weekly`），插入在"总结"图标之后，见4.10；注意第7节第6条的拥挤风险需要实测
- `AddSlotRow.tsx`：新增可选`label`prop（默认值保持现有文案，向后兼容），见4.11

**新增页面**：`app/weekly/page.tsx`，布局结构见第3节，状态管理参照`app/page.tsx`的既有模式（`viewDate`→`weekStart`，`loadData`按周聚合调用7次`fetchDaySlotsForDate`）。

**新增lib模块**（建议，具体文件划分由code-writer按项目现有粒度决定）：

- `lib/types.ts`追加：
  ```ts
  export type CycleGoal = { id: string } & (
    | { kind: "overall_rate"; target_rate: number }
    | { kind: "task_target"; task_label: string; target_type: "all" }
  );

  export type WeeklyReview = {
    id: string;
    user_id: string;
    week_start: string; // YYYY-MM-DD，周一
    goals: CycleGoal[];
    review_note: string | null;
    updated_at: string;
  };
  ```
- `lib/week.ts`（新，纯函数，与`lib/calendar-grid.ts`"日历几何计算独立于业务"同样的职责划分原则）：`getWeekStart(dateStr)`取所在周周一、`getWeekEnd(dateStr)`取周日、`addWeeks(weekStart, delta)`、`formatWeekRangeLabel(weekStart)`（跨年时前缀年份，第7节第9条注意事项，此处纠正编号并入第6条待决策一并处理）、`isWeekElapsed(weekStart, today)`（周日是否已经完全过去，决定目标三态里"进行中"能否转为终态）
- `lib/week-summary.ts`（新）：`computeWeekSummary`（7天`DaySummary`累加成周聚合，形状复用`DaySummary`）、`getWeekDayOutcomes`（7天映射成`SlotStatus[]`喂给`PunchStrip`）、`evaluateGoal(goal, weekDayPlans, isElapsed)`（目标达成判定，返回`{status, progressText}`，具体算法按第7节第4条和产品口径确认后实现）
- `lib/weekly-reviews.ts`（新，数据访问层，模式参照`lib/templates.ts`）：`fetchWeeklyReview(userId, weekStart)`、`upsertGoals(userId, weekStart, goals)`、`upsertReviewNote(userId, weekStart, note)`

**新增依赖**：客户端截图库（建议`html-to-image`，纯前端、兼容静态导出，见第7节第5条待确认）。

**采纳的frontend-design方向**：延续v1-v3（不重新选择字体/配色/运动/空间/背景方向）。分享卡片是本方案里空间构图最"放开"的一处——更大留白（`space-6`内边距）、更夸张的印章尺寸（120px徽章）、撕票边缘的重复几何图案，在克制的日常界面之外给了一个"值得隆重一点"的场景，仍然全部使用既有token组合出来，没有引入新方向。

**反AI套路自检**：无新增色相；三态目标标签没有用红绿灯式的直觉配色堆砌（红=坏、绿=好、黄=中），而是延续项目已经建立的"accent=正向、中性灰=历史事实、虚线=待定"三层语义；分享卡片的"撕票边缘+印章徽章"是"打孔票据"隐喻的延伸而非套娃三等分卡/Hero数字大屏模板；项目一致性六查通过——去色后Plan/Check/Act三段的层级靠字号字体成立；同类元素（GoalRow的editable/readonly两态、三处Drawer出入场、三个区域标题字号）规格统一；色相仍是3个；留白按4px网格分级（区块内`space-2/3`，跨区块`space-6/8`）。

**工程正确性底线自查**：

- 触控：所有图标按钮/任务选择行/GoalRow整行点击区≥44×44或44高
- 表单：目标编辑表单两种类型字段都有可见label，非placeholder代替；失焦校验，错误就近显示图标+文字+边框三通道
- 颜色不是唯一信息载体：`GoalStatusTag`三态图标+文字+边框/底色三通道并用
- 中文断行：「本周完成率≥90%」这类目标描述已按14字截断基准控制，区域标题"目标"/"周报对比"/"复盘"均为短句
- 反馈状态：`GoalEditorSheet`保存按钮disabled态（具体任务类型且无可选任务时）、`ReviewSection`保存loading态、`SharePreviewDialog`生成中骨架屏态均已明确规格
- 动效：状态切换均在150到400ms内，遵循`prefers-reduced-motion`（全局CSS已处理）
- 反馈与loading：分享图生成用骨架屏过渡，不用旋转图标；目标列表/复盘保存失败均走toast+可重试

**实施顺序建议**：先确认第7节第1条（`target_rate`单位）和第4条（任务目标判定口径），这两条直接决定`lib/week-summary.ts`里`evaluateGoal`的具体实现，越早确认返工越少；第2条（周导航范围）和第5条（截图库选型）次优先；第3条（目标编辑权限）如果暂时没有明确答案，可以先按"不限制"的默认实现上线，后续加限制的改动面很小（只需要在`GoalEditorSheet`打开前多一层判断）。
