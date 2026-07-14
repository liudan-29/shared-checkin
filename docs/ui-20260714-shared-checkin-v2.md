# 双人共享打卡 UI设计方案 v2：日期导航与每日总结

本方案是`docs/ui-20260714-shared-checkin.md`（下称v1）的延伸，两个新功能：非今天日期的查看、任意一天的总结视图。不新增色相、不新增字体、不新增间距/圆角/阴影/动效token，全部复用v1第1节定义的token与`tailwind.config.ts`已接线的类名。

---

## 1. Token复用说明

扫描确认：`app/globals.css`的`:root`token表、`tailwind.config.ts`的颜色/字号/圆角/阴影/动效接线、v1文档第1.3/1.4节完全一致且已落地，本方案唯一取值来源仍是这份token表。用到的既有类名清单（供code-writer核对，非穷举）：

- 颜色：`bg-card`/`bg-popover`/`bg-secondary`/`bg-tertiary`（`--secondary`别名）、`text-foreground`/`text-muted-foreground`/`text-secondary-foreground`、`text-ink`/`bg-ink`/`bg-ink-subtle`（accent系）、`text-danger`/`bg-danger`/`bg-danger-hover`（danger系）、`border-border`
- 字体：`font-display`/`font-body`/`font-mono`
- 字号：`text-sm`/`text-base`/`text-lg`/`text-2xl`
- 圆角：`rounded-sm`/`rounded-md`/`rounded-lg`/`rounded-full`
- 阴影：`shadow-sm`/`shadow-md`/`shadow-lg`
- 动效：`duration-fast`/`duration-normal`/`duration-slow`、`ease-default`/`ease-spring`、`animate-pulse-ring`/`animate-fade-in-up`

本方案不引入第4种色相，「只读/预览」两种非交互状态一律用`bg-tertiary`+`text-secondary`中性表达，不借用danger红，理由见第6节。

---

## 2. 信息层级方案

### 2.1 日期导航（主视图头部）

- **第一层级**：当前查看的日期大字（不变，沿用v1）；非今天时的模式提示（只读/预览徽标）——这是这次新增交互里最需要用户3秒内确认的信息，直接决定了"我现在能不能点"
- **第二层级**：前进/后退翻页箭头、「回到今天」跳转、当日总结入口图标
- **第三层级**：打孔条与计数（不变）

非今天的SlotCard列表：

- **第一层级**：完成/未完成的结果本身（图章 或 MissedMark）
- **第二层级**：时间、任务名（不变，但迟到完成需要新增一条提示时降为第二层级里的次要信息，不抢首层）
- **第三层级**：备注、打卡时间（不变）

### 2.2 每日总结

- **第一层级**：完成率（两人并排，谁高一眼看出）
- **第二层级**：完成数、拖延次数、拖延时长的逐行对比
- **第三层级**：备注日记时间线

层级手段沿用v1：字号（lg/base/sm三档）、字重（600强调数字vs 400常规）、颜色（accent高亮胜出方vs secondary常规），不靠单一维度。

---

## 3. 布局结构

### 3.1 DateTicket扩展（主视图头部，375px）

在v1的DateTicket基础上插入一条导航行，其余结构不变：

```
┌─────────────────────────────────────┐
│ 7月10日  周五      [📊][📓][头像]     │ Row1，不变，新增总结图标(总结/模板/头像三个40×40)
│                                       │
│  ‹         🔒 只读 · 回到今天    ›    │ Row1.5，新增，h44
│  ┄┄┄┄┄┄┄┄┄ 打孔虚线 ┄┄┄┄┄┄┄┄┄        │ 不变
│  进度  ■■□▣□□              3/6       │ Row2，"今日"改为"进度"（原因见4.1）
└─────────────────────────────────────┘
```

Row1.5三种取值：

```
今天：  ‹                                 ›
过去：  ‹        🔒 只读 · 回到今天        ›
未来：  ‹    👁 预览·工作日模板 · 回到今天  ›
```

### 3.2 非今天SlotCard（只读，左对齐content+右侧结果区不变宽56px）

```
┌─────────────────────────────┐
│ 07:00–07:30                  │
│ 晨读                          │  已完成：图章不可点
│ 07:15打卡                     │
└─────────────────────────────┘
┌─────────────────────────────┐
│ 09:00–10:30      [未完成]     │
│ 跑步                          │  未完成：左侧无内嵌红条(不是"正在拖延"而是"已成历史")
│                          ⊖   │  右侧MissedMark(虚线圈+减号，静态)
└─────────────────────────────┘
```

### 3.3 预览SlotCard（未来，无右侧结果区，内容占满宽度）

```
┌─────────────────────────────┐
│ 08:00–09:00 (text-secondary)  │
│ 背英语单词 (text-secondary)     │  虚线边框替代阴影，静态无点击
└─────────────────────────────┘
```

### 3.4 SummarySheet 每日总结（底部抽屉，复用shadcn Drawer）

375px：

```
┌─────────────────────────────────┐
│         ▬▬▬ 拖动条 ▬▬▬            │
│  7月10日总结                 [✕]  │ 标题行，sticky
├─────────────────────────────────┤ ↓ 以下可滚动，max-h 85vh
│  完成情况                         │ 小标签 text-sm muted
│ ┌─────────────────────────────┐ │
│ │        我      TA(小北)      │ │ header: 头像+名字
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │ │ 打孔虚线呼应票据头
│ │ 完成率   83%      50%        │ │ 我方胜出：accent+600
│ │ 完成数   5/6      3/6        │ │
│ │ 拖延次数  0次      2次        │ │
│ │ 拖延时长  0分钟   47分钟      │ │
│ └─────────────────────────────┘ │
│                                   │
│  备注                             │ 小标签
│ ┌─────────────────────────────┐ │
│ │ 我 07:15 晨读                 │ │
│ │ 读了半小时英语，感觉还行          │ │
│ │ ─────────────────────────    │ │
│ │ 小北 08:40 跑步                │ │
│ │ 绕公园跑了3圈                   │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

桌面端（≥768px）：`max-w-[560px] mx-auto`，与`/template`页面同宽度基准，其余不变。

---

## 4. 组件规格清单

### 4.1 DateTicket（既有组件，改规格）

新增props：`mode: "live" | "readonly" | "preview"`、`viewedDayType: "weekday" | "weekend"`（仅preview用于徽标文案）、`onPrev`、`onNext`、`onJumpToday`、`onOpenSummary`。

- Row1新增第三个图标钮（BarChart3，18px，位置在模板图标左侧），aria-label动态："查看{date}总结"，四态同v1的4.15图标按钮规格
- Row2的"今日"文案改为"进度"：原文案假定永远是今天，改为日期中性词，避免查看历史日期时出现"今日"字样的语义错误
- 新增Row1.5导航行，高44，`mt-space-2`，`flex items-center justify-between`：
  - 两端：ChevronLeft/ChevronRight，44×44，复用v1的4.15图标按钮四态（transparent底、hover `bg-tertiary`、active `bg-tertiary`+`scale(0.92)`、disabled opacity 0.35不可点）
  - 中间内容三态：
    - `mode==="live"`：留空（无徽标，"没有徽标"本身就是"完全可操作"的信号，不再叠加文字，避免第4种视觉状态）
    - `mode==="readonly"`：Lock图标12px `text-muted` + "只读" `text-sm` `text-secondary`，`bg-tertiary`、`radius-full`、内边距2px 8px，紧接一个可点文字"回到今天" `text-sm` `text-ink`（包一层44px高的透明按钮满足触控最小尺寸，视觉高度不变）
    - `mode==="preview"`：Eye图标12px + "预览·工作日模板"或"预览·周末模板" `text-sm`，同上pill样式，同样接"回到今天"
- 四态：导航箭头hover/active同图标按钮规格；"回到今天"hover时文字变`--color-accent-hover`，active `scale(0.96)`
- 过渡：切换日期时中间徽标内容fade切换`--duration-fast`；箭头disabled态即时生效无需过渡

### 4.2 SlotCard（既有组件，改规格，核心改动）

新增props：`mode: "live" | "readonly" | "preview"`（默认"live"，保证不传时v1行为完全不变）。

`SlotStatus`新增枚举值`"missed"`（只在非今天的过去日期、未完成时产生，含义是"这天已经过去，这条终态是没做"，不同于"overdue"的"还在计时、还能补救"）。

按`mode`分三套渲染规则：

**mode="live"（今天，行为与v1完全一致，不改）**

**mode="readonly"（过去，只读，mine/peer渲染规则相同——过去的自己也不能改）**

| status | 卡片 | 右侧结果区 | 附加标签 |
|---|---|---|---|
| done（含时提前判断是否迟到，见下） | 默认样式，无边框强调 | CompletionStamp，`clickable=false` | 若`lateMinutesText`存在，时间行追加HistoryTag(kind="late") |
| missed | 默认样式，**不加**左侧内嵌红条（不是"正在拖延"，是"已经过去的事实"，不用danger强调） | MissedMark（4.9新增） | 时间行追加HistoryTag(kind="missed") |

- 卡片本体：`onClick`不绑定（不可点开编辑器），去掉`cursor-pointer`/`active:bg-popover`
- 任务名后的Pencil图标：不渲染（无论variant是否为mine）
- StatusPill：不渲染（过去不存在"进行中"）

**mode="preview"（未来，仅mine/peer模板转换出的slot，无done/checked_at/note字段——由code-writer把Template.slots映射为渲染用的伪PlanSlot，done恒为false）**

- 容器：去掉`shadow-sm`，改`1.5px dashed var(--color-border-default)`边框（呼应AddSlotRow的"未落地"视觉语言）
- 时间：`font-mono text-lg`，颜色`text-secondary`（不用text-primary，明确"这还没发生"）
- 任务名：`font-display text-lg`，颜色`text-secondary`
- 不渲染：StatusPill、DelayTag/HistoryTag、打卡时间行、备注行、CheckButton、CompletionStamp、Pencil图标
- **右侧结果区整个不渲染**（宽度不保留，内容占满卡片宽度）——preview状态没有"结果"可展示，保留空白列反而制造视觉噪音，不如把宽度还给内容（对比readonly状态：missed有确定的历史事实值得占位展示，两者留白策略不同是刻意区分，理由见第6节）
- 卡片本体：无`onClick`，无hover/active

### 4.3 HistoryTag（新增）

- Props：`kind: "missed" | "late"`、`text: string`（调用方传入拼好的文案，如"未完成"/"晚23分钟完成"）
- 视觉：inline-flex，图标12px（missed用Minus，late用Clock）+ 文字`text-sm`，底色`bg-tertiary`，文字`text-secondary`，`radius-sm`，内边距2px 8px
- **不用danger红、不带rotate倾斜**：与v1的DelayTag（危险红+虚线红边+倾斜-2°）刻意区分。DelayTag表达"正在发生、还能补救、需要立刻注意"；HistoryTag表达"已经是历史，纯记录"。同一件"迟到"的事，语境不同（进行时vs过去时）用不同强度的视觉语言，见第6节设计依据
- 纯展示，无交互态，无动画（历史事实不需要动效强调）

### 4.4 MissedMark（新增）

- 44×44圆形，`1.5px dashed var(--color-border-default)`（虚线区别于CheckButton的实线描边，一眼看出"这不是按钮"），透明底，居中Minus图标18px `text-muted`
- 用`<div>`不用`<button>`，包一层`role="img" aria-label="这个时段没有完成"`供屏幕阅读器识别（颜色不是唯一信息载体，图标+文字+语义标签三通道）
- 静态，无hover/active/focus态，与CheckButton/CompletionStamp共享同一个w-14结果区容器，尺寸对齐，替换时不引发布局跳动

### 4.5 EmptyState（既有组件，追加4个导出）

- `EmptyStateReadonlyMine`/`EmptyStateReadonlyPeer`：CalendarX2图标+"这天没有安排记录"/"TA这天没有安排记录"，`text-base` `text-muted`，无按钮（只读没有可做的操作）
- `EmptyStatePreviewMine`：同图标+"这天的模板还没排时段"，下方一个次级按钮"去编辑模板"（跳`/template`，与查看哪一天无关，模板编辑本身不受日期导航限制）
- `EmptyStatePreviewPeer`：同图标+"TA这天的模板还没排时段"，无按钮

### 4.6 PunchStrip（既有组件，小改）

status枚举新增"missed"分支，视觉复用"overdue"的映射（`--color-danger`实心方块）：过去未完成在打孔条这个高度概览组件里，和"正在拖延"用同一个危险色方块表达"这格是坏结果"，不需要专门区分（详见4.3的分层说明：卡片级别区分强弱语气，概览级别只需要"好/坏"两态）。

### 4.7 SummarySheet（新增，容器组件）

- 复用`components/ui/drawer.tsx`的Drawer/DrawerContent，**建议对`ui/drawer.tsx`做一处共享改动**：`DrawerContent`内层`<div className="p-4">`增加`max-h-[85vh] overflow-y-auto`，让长内容（备注多的时候）可以在抽屉内部滚动，拖动条和标题保持可见。这是共享组件的改动，现有SlotEditorSheet内容远小于85vh不受影响，但改之前需要过一遍SlotEditorSheet实际渲染确认无副作用（见第7节待决策8）
- 标题行：`DrawerTitle`文案"{M月D日}总结"，`font-display text-lg`；右上角44×44关闭钮（X图标20px `text-muted`，hover `bg-tertiary`），不依赖仅靠下滑手势关闭
- 桌面端`max-w-[560px] mx-auto`
- 内部两个子块见4.8/4.9，命名和拆分粒度参照项目现状（PunchStrip/StatusPill/DelayTag均为独立小文件），建议同等粒度拆分为独立文件而非塞进SummarySheet.tsx一个文件里
- 出入场：与SlotEditorSheet相同，上滑入`--duration-slow`，下滑出`--duration-normal`，`--easing-default`，遮罩`rgba(43,38,32,0.4)`

### 4.8 SummaryCompareTable（新增）

- 容器：`bg-card`、`radius-lg`、`shadow-sm`、内边距`space-4`
- Header行：三列grid，第一列空白占位，第二列头像(28px,`bg-ink-subtle`/`text-ink`圆形首字)+"我"`text-base`，第三列头像+对方姓名`text-base`，均居中
- Header下：`1px dashed var(--color-border-default)`分隔线（呼应票据头打孔虚线的视觉母题，仅此一处使用，不滥用），上下`space-3`
- 4行指标，行间距`space-3`（不加逐行边框，禁止边框滥用，靠留白分隔）：
  - 完成率：标签`text-sm text-muted`左对齐；两个数值`font-mono text-lg`右对齐；若某天day_plan不存在（total为0），显示"—"而非"0%"
  - 完成数：`5/6`格式，`font-mono text-base`右对齐
  - 拖延次数：`2次`格式，`font-mono text-base`右对齐
  - 拖延时长：复用`formatOverdue`同款格式（"47分钟"/"1小时23分"），`font-mono text-base`右对齐
- **胜出高亮**：每行按"该指标数值更优的一方"判定（完成率/完成数越高越好，拖延次数/拖延时长越低越好），胜出一侧数字变`text-ink`（accent色）+`font-semibold`（600），落后一侧维持`text-secondary`+`font-normal`（400）——颜色+字重两条通道，不单靠颜色；打平时两侧都保持`text-primary`常规不高亮，不编造胜负
- 入场：4行按60ms交错`fade-in-up`（复用现有`animate-fade-in-up`），与列表卡片的交错节奏语言保持一致

### 4.9 SummaryNotesList（新增）

- 容器：`bg-card`、`radius-lg`、`shadow-sm`、内边距`space-4`
- 空状态：无备注时单行"这天没有人写备注"`text-base` `text-muted`，居中，`py-space-6`
- 有备注：合并双方备注按`checked_at`升序排列成一条时间线（不分人分区，体现"共享"概念），每条：
  - 元信息行：头像20px（同色系首字圆点）+ 打卡时间`font-mono text-sm text-muted` + "·" + 任务名`text-sm text-secondary`，超长任务名单行截断
  - 备注正文：`text-base text-primary`，次行显示，不截断（换行显示，最多3行后省略号，超过部分不做展开交互，保持轻量）
  - 条目间`1px solid var(--color-border-subtle)`下分隔线，内边距`space-3` 0
- 入场：条目按60ms交错`fade-in-up`，最多前8条参与交错（与v1列表规则一致）

---

## 5. 交互与动效规范

### 5.1 日期切换

- 点击后退箭头：主内容列表区域`translateX(-8px)→translateX(0)`+fade（新日期从右侧滑入，旧内容同时向左滑出并fade out），`--duration-normal` `--easing-default`；点击前进箭头方向相反。DateTicket的日期大字用简单`opacity`交叉淡入淡出`--duration-fast`，不额外做位移（避免和列表的位移动画打架）
- 点击"回到今天"：日期跳转距离不定，不用方向性滑动，改用纯fade（`--duration-normal`），列表和票据头同步淡出淡入
- 若目标日期数据未缓存需要请求：过渡期间用Skeleton块（复用v1的4.14规格）替代滑动内容，加载完成后skeleton直接fade out换真实内容，不叠加滑动动效
- 边界（如设置了翻页范围上限）：到达边界后对应箭头进入disabled视觉，点击无反应无提示（箭头本身已是disabled态，不需要额外toast打扰）

### 5.2 打开每日总结

- 点击DateTicket的总结图标：SummarySheet从底部滑入，规格同4.7/v1的4.12抽屉动效
- 数据已在页面state里（当前查看日期的myPlan/peerPlan），无需额外loading态；若因为切换日期后数据还在请求中，总结图标应为disabled（灰化，见5.3）

### 5.3 总结入口的可用性

- `mode==="preview"`（未来）：总结图标默认disabled（opacity 0.35，不可点），因为未来这天全是零值，展示无意义（见第7节待决策3，此为默认值待确认）
- `mode==="live"`或`"readonly"`：总结图标始终可点

### 5.4 状态切换总则（延续v1）

一切可见性变化（徽标切换、Tag出现、空状态切换）进场`--duration-normal`出场`--duration-fast`，`--easing-default`，不允许瞬间出现消失。全局`prefers-reduced-motion`已在globals.css生效，位移动画自动降级为纯fade，本方案新增动效均遵循同一条全局规则，无需额外处理。

---

## 6. 设计依据

延续v1的Design Thinking四问（Purpose/Tone/Constraints/Differentiation不变，这是同一产品的功能延伸，不重新定调）。本次新增决策的为什么：

- **只读/预览用中性灰不用danger红**：DelayTag的红色+倾斜传达的是"现在进行时、还能补救、需要注意"，这个语义只对"今天"成立。过去的未完成已经无法挽回，不再是"警报"而是"记录"；如果历史记录也用满屏红色的紧迫感视觉，会让用户对红色脱敏（下次真正需要提醒时反而没那么显眼），所以刻意降级为`bg-tertiary`中性标签。这是色彩语义一致性原则的延伸应用，不是新发明一套规则
- **未来卡片去掉右侧结果区、过去未完成卡片保留右侧区域放MissedMark**：两者都"没有CheckButton"，但含义不同。未来是"还没发生"，没有任何结果可以展示，保留空列等于展示"无意义的留白"；过去是"已经发生但没做"，这本身是一个确定的历史事实，值得占位强调（呼应需求里"不能让人误以为能操作却点了没反应"，一个静态的虚线圈+减号明确传达"这里曾经可以打卡，但没有"）
- **备注合并成一条时间线，不分两栏**：需求原文是"这一天所有填了的备注按时间顺序列出来，类似简短日记"，双人共写一天的日记，分栏会打断"共同经历"的叙事感，合并时间线（靠头像区分作者）更贴合"共享打卡"的产品核心概念
- **对比表用逐行高亮而非单纯罗列**：需求要求"让人一眼看出谁做得更好"，逐行的颜色+字重双通道对比是最直接的实现路径，不需要额外的排名徽章之类的装饰
- **总结用底部抽屉不用独立页面**：需求强调"随时都能看"，暗示这是一个低摩擦的快速查阅动作，不应该触发一次完整的页面导航（多一次路由跳转、多一次返回操作）。项目里"抽屉"这个模式已经用在SlotEditorSheet上，用户已经熟悉"从底部弹出、看完关掉"的心智模型，复用现有交互范式比新开一个页面更符合项目现状优先原则
- **日期导航箭头嵌在独立的Row1.5而非塞进Row1**：Row1现有的日期文字+图标按钮布局在375px下已经比较满（v1的1.4节明确记录过页面边距从space-6降到space-4就是为了应对375px宽度紧张），硬塞两个44px箭头会挤压现有元素或强制换行；单独一行导航条能用满整行宽度，箭头间距更从容，也符合"票据头"这个视觉母题——打孔票据本身就是分层信息的容器，多一层信息用多一行呈现比硬挤进一行更符合这个隐喻

---

## 7. 待决策项

1. **过去"未完成"是否计入拖延统计、计入方式**：本方案默认missed（从未打卡）只计入"未完成"这个事实本身，不折算成拖延时长（没有自然终点，硬算会出现"拖延687分钟"这种荒谬数字）；只有"完成但迟到"（checked_at晚于end_time）才计入拖延次数和时长。这是产品口径问题，需要确认是否认可这个区分，还是"未完成"也要算进拖延次数（不算时长）
2. **卡片级别是否展示"迟到完成"标记**（HistoryTag kind="late"）：这是4.2里的可选增强，不影响需求1的核心验收（只读/预览的可视化区分），如果code-writer觉得工期紧，这条可以先不做，只保留总结视图里的迟到统计
3. **未来日期是否禁用总结入口**：本方案默认未来禁用（全零值展示没有意义），如果产品想保留一个"尚未开始"式的总结做占位展示，需要额外确认文案和是否需要
4. **日期导航范围边界**：本方案默认不设上限，靠空状态兜底任意日期。如果需要限制（比如只能看最近30天），需要给出具体天数
5. **是否需要日历/快速跳转**：本方案只做逐天前进后退箭头，没有设计日期选择器。如果历史记录多了之后逐天翻页体验太差，需要另行设计跳转组件
6. **对比表是否需要一句话总裁定**（如"今天你的完成率更高"）：本方案默认不做这个总结句，靠逐行高亮已经能满足"一眼看出谁做得更好"，如果产品想要更直接的一句话结论，需要明确判定权重规则（完成率优先，平局看拖延时长，还是别的权重）
7. **未来日期"TA的"tab是否显示对方模板预览**：本方案默认对等展示（我的和TA的未来预览规则相同），如果产品认为未来日期只该看自己的安排，需要明确
8. **`ui/drawer.tsx`共享组件的滚动区改动**：SummarySheet需要抽屉内容可滚动，本方案建议给共享的`DrawerContent`内层容器加`max-h-[85vh] overflow-y-auto`，理论上不影响现有SlotEditorSheet（内容远小于85vh），但这是共享文件的改动，实现时需要跑一遍SlotEditorSheet确认没有视觉回归

---

## 8. 给code-writer的交付说明

**扫描来源**：v1方案文档`docs/ui-20260714-shared-checkin.md`（token与组件规格唯一取值来源）、项目CLAUDE.md（数据模型、时间处理约定、禁止清单）、`app/globals.css`与`tailwind.config.ts`（确认token已实际接线，类名与v1文档描述一致）、`app/page.tsx`/`app/template/page.tsx`（现有页面结构与状态管理模式）、`components/`下全部既有组件源码、`lib/types.ts`与`lib/slot-status.ts`（现有类型与状态计算逻辑）。

**复用**：v1定义的全部token；shadcn Drawer（新抽屉复用同一套原语）；DelayTag组件不改动直接复用于"今天"场景；CheckButton/CompletionStamp/StatusPill/PunchStrip/Button/AddSlotRow原样复用（PunchStrip有一处小改，见下）。

**新增组件**（放`components/`，PascalCase，与既有文件同粒度）：HistoryTag、MissedMark、SummarySheet、SummaryCompareTable、SummaryNotesList。

**修改既有组件**：

- `DateTicket.tsx`：新增`mode`/`viewedDayType`/`onPrev`/`onNext`/`onJumpToday`/`onOpenSummary`props，新增Row1.5导航行，Row2文案"今日"改"进度"，Row1新增总结入口图标
- `SlotCard.tsx`：新增`mode`prop（默认"live"保证旧调用不受影响），readonly/preview两套渲染分支
- `PunchStrip.tsx`：status枚举新增"missed"分支，映射到既有danger实心方块视觉，一行条件判断的量级改动
- `EmptyState.tsx`：追加4个新导出（EmptyStateReadonlyMine/Peer、EmptyStatePreviewMine/Peer）
- `lib/slot-status.ts`：`SlotStatus`类型新增`"missed"`枚举值；**关键**——现有`getSlotStatus(slot, now)`假定`now`和`slot`属于同一天（只比较HH:mm的分钟数），不能直接拿"实际当前时间"去判断非今天日期的slot状态（会算出"未开始"这种对过去日期无意义的结果）。需要新增一个按"查看日期是否早于今天"分流的判定：非今天且已过去→done或missed两态；非今天且在未来→固定按"未开始"处理（预览模式其实不依赖这个状态，直接走preview渲染分支）。这是本次唯一必须新增的业务逻辑，不属于UI规格但直接影响组件能否正确工作，请优先确认

**采纳的frontend-design方向**：延续v1（不重新选择字体/配色/运动/空间/背景方向），本次新增内容严格用v1已定的視覺語言组合出新状态，没有引入新方向。

**反AI套路自检**：无新增色相，只读/预览用既有中性token表达，非套娃紫色渐变；MissedMark的虚线圆+减号、HistoryTag的中性标签都是在v1"打卡钟+印章"隐喻下的自然延伸（虚线=未完成/未落地，这个语言AddSlotRow已经建立过），不是另起的视觉体系。项目一致性检查：去色后布局层级仍靠字号字重成立；同类元素（导航箭头、结果区图标、抽屉出入场）复用既有组件规格，没有出现"两个长得不一样但功能相同"的组件。

**工程正确性底线自查**：

- 触控：导航箭头44×44、"回到今天"链接包44px高按钮、总结抽屉关闭钮44×44
- 颜色不是唯一信息载体：HistoryTag/MissedMark均图标+文字+（MissedMark另加aria-label）三通道
- 中文断行：徽标文案"预览·工作日模板"等均为短句，已按最窄375px容器验算不会换行
- 反馈状态：新增静态组件（MissedMark/HistoryTag）明确不做hover/active，避免用户误以为可点却没反应，这正是需求1.2要求的"不能让人误以为能操作却点了没反应"的直接落实
- 动效：状态切换均在150到400ms内，遵循`prefers-reduced-motion`（全局CSS已处理，无需新增媒体查询）
- 反馈與loading：日期切换若需要请求数据，用既有Skeleton样式承接，不用菊花图标

**实施顺序建议**：先确认第7节待决策1（拖延统计口径）和8（drawer共享组件改动范围），这两条会影响`lib/slot-status.ts`的具体实现和抽屉组件的改动面，越早确认返工越少。
