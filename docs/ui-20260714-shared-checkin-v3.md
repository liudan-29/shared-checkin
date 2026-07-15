# 双人共享打卡 UI设计方案 v3：日期选择器（日历跳转）

本方案是v1（token与基础组件）、v2（日期导航与每日总结）的延伸，补v2第7节待决策项5：逐天翻页之外增加任意日期直接跳转的能力。不新增色相、字体、间距、圆角、阴影、动效token，不引入Popover等v1/v2未用过的弹层原语，全部复用既有token与`Drawer`范式。

---

## 1. Token与既有组件复用清单

扫描确认：`app/globals.css`的`:root`token表、`tailwind.config.ts`接线、`components/ui/`下`drawer.tsx`/`dialog.tsx`/`button.tsx`与v1/v2文档描述一致，本方案唯一取值来源仍是这份token表。

用到的既有类名（实际接线名，非v1文档旧称）：

- 颜色：`bg-card`/`bg-popover`/`bg-secondary`、`text-foreground`/`text-muted-foreground`、`text-ink`/`bg-ink`/`text-primary-foreground`（选中态）、`border-border`
- 字体：`font-display`/`font-mono`
- 字号：`text-sm`/`text-base`/`text-lg`
- 圆角：`rounded-full`（日期格子、chevron命中区）、`rounded-md`（按钮）
- 动效：`duration-fast`/`duration-normal`、`ease-default`

既有组件复用：`Drawer`/`DrawerContent`/`DrawerTitle`（`components/ui/drawer.tsx`），复用方式与`SummarySheet.tsx`完全一致的Header行结构（标题+右上44×44关闭钮）。不新增Dialog/Popover等其它弹层原语。

---

## 2. 组件设计决策

### 2.1 形式：自定义月历网格，不用原生`input[type=date]`，不用Popover

原生日期输入的系统UI（iOS滚轮、Android Material picker）不受token控制，视觉上会和"打孔票据+印章"的暖纸质感直接冲突，产生风格断裂。自定义月历网格视觉完全可控，且能延续票据头已经建立的打孔虚线母题，成本可控（一个7列网格+月份切换，不涉及新的技术依赖）。

不用Popover的原因：项目目前没有引入Popover原语（`components/ui/`下无`popover.tsx`），派工要求"不要引入新的弹层模式"。月历网格内容体量（月份切换行+星期表头+最多6行日期）接近`SummarySheet`量级，用`Drawer`承载比强行塞进一个锚定triggerPopover更符合内容体量，也让用户在同一个"从底部弹出、看完/选完关掉"的心智模型里操作，这个心智模型已经被`SlotEditorSheet`和`SummarySheet`建立过。

### 2.2 触发方式：点击DateTicket现有日期大字，不新增独立日历图标按钮

Row1右侧已有总结、模板、头像三个图标钮，语义都是"跳去别的地方"；日历选择器改变的是"当前正在看哪一天"，这个状态的载体就是日期大字本身，触发点应该长在它身上而不是叠加到已经三个图标的按钮组里。

具体做法：日期文字容器（"7月14日 周二"）整体包成一个可点击按钮，紧跟在"周二"后面加一个14px `CalendarDays`图标（`text-muted-foreground`）作为可点提示，不改变文字本身的字号字色（日期仍是第一层级信息，图标只是弱提示不能抢视觉权重）。点击区域通过负margin+padding扩展到44px高，视觉尺寸不变。

### 2.3 与左右箭头的关系：并存互补，不是替代

保留`ChevronLeft`/`ChevronRight`逐天步进（临近日期的最常见操作，比如看"昨天"，翻一下比开日历再点选更快），保留"回到今天"。日历新增用于非相邻的远距离跳转（比如"上上上周三"）。两种输入方式都只是写`viewDate`这一个状态，互不冲突，UI层面也不互相遮挡：箭头在Row1.5导航行，日历入口在Row1日期文字上，物理位置分离。

### 2.4 边界：过去180天、未来90天（建议值，待确认）

- **过去建议180天**：日历不设年份选择器（见3.3），仅靠月份chevron翻页，超过180天要点6次以上chevron，体验会变差；两人自用记录如果真的要翻到半年前，价值也存疑（多数回看场景集中在近几周）。
- **未来建议90天**：未来是按当前模板现算的预览，不是真实数据，模板本身会被改，看太远的"如果保持现状"参考意义随时间递减；90天对应3次chevron，和"过去"的翻页量级对齐。
- 两个边界不对称是刻意的：过去是真实历史（有查证价值），未来是假设推演（价值递减更快），所以过去给的余量更大。
- 这两个数字是产品口径判断，不是纯视觉决策，列入第7节待决策项，需要确认后再实现。

---

## 3. 布局结构

### 3.1 DateTicket改动（Row1，375px）

```
┌─────────────────────────────────────┐
│ 7月14日 周二 📅   [📊][📓][头像]      │ 日期区域整体可点，📅为提示图标
├─────────────────────────────────────┤
│  ‹     🔒 只读 · 回到今天      ›     │ Row1.5，v2既有，不变
```

日期区域按钮：`flex items-baseline gap-1`，负margin扩展命中区到44px高，其余Row1布局不变。

### 3.2 DateJumpSheet（新增，底部抽屉，375px）

```
┌─────────────────────────────────┐
│   ▬▬▬ 拖动条 ▬▬▬                   │ 复用Drawer既有拖动条
│  选择日期                    [✕]  │ 标题行，同SummarySheet结构
├─────────────────────────────────┤ ↑ 下方1px dashed打孔虚线，呼应票据头
│  ‹        2026年7月        ›     │ 月份切换行，两端44×44 chevron
│                                   │
│  日  一  二  三  四  五  六        │ 星期表头，与WEEKDAY_NAMES顺序一致
│  ┌──┬──┬──┬──┬──┬──┬──┐         │
│  │28│29│30│ 1│ 2│ 3│ 4│         │ 灰字=上月填充，可点
│  ├──┼──┼──┼──┼──┼──┼──┤         │
│  │ 5│ 6│ 7│ 8│ 9│10│11│         │
│  ├──┼──┼──┼──┼──┼──┼──┤         │
│  │12│13│(●14)│15│16│17│18│      │ (●14)=选中态，实心圆
│  ...                              │
│  └──┴──┴──┴──┴──┴──┴──┘         │
└─────────────────────────────────┘
```

桌面端（≥768px）：`max-w-[560px] mx-auto`，与`SlotEditorSheet`/`SummarySheet`同宽度基准，网格本身不放大，两侧留白增加。

---

## 4. 组件规格清单

### 4.1 DateTicket（既有组件，改规格）

新增props：`onOpenDateJump: () => void`。

- Row1日期区域从`<div>`改为`<button type="button" onClick={onOpenDateJump} aria-label="选择日期">`，内部结构不变（日期`text-2xl font-display`+周几`text-lg text-muted-foreground`），追加`CalendarDays`图标14px `text-muted-foreground`，与周几同基线，`gap-1`
- 命中区扩展：`-my-1 -ml-1 py-1 pl-1 pr-2 rounded-md`，视觉位置不变，实际可点高度≥44px
- 四态：默认无背景；hover（桌面）`bg-secondary`；active `scale-[0.98]`；disabled不出现
- 过渡：`duration-fast ease-default`

### 4.2 DateJumpSheet（新增，容器组件）

Props：`open: boolean`、`onOpenChange: (open: boolean) => void`、`viewDate: string`（当前主视图日期，决定打开时默认定位月份）、`todayDate: string`、`minDate: string`、`maxDate: string`、`onSelectDate: (dateStr: string) => void`。

- 复用`Drawer`/`DrawerContent`，Header行结构同`SummarySheet.tsx`：`DrawerTitle`文案"选择日期" `font-display text-lg`，右上44×44关闭钮（`X`图标20px，hover `bg-secondary`）
- Header下方`1px dashed border-border`分隔线，呼应票据头打孔虚线，上下`space-3`
- 月份切换行：`ChevronLeft`（44×44）+ "{year}年{month+1}月"（`font-display text-lg`，居中，`flex-1 text-center`）+ `ChevronRight`（44×44），四态复用图标按钮规格（hover `bg-secondary`，active `bg-secondary`+`scale(0.92)`，disabled opacity-0.35不可点）
- 内部state：`viewMonth: {year, month}`，初始值取`viewDate`所在月份（不是`today`所在月份，避免用户正在回看历史时打开日历却跳去当月，制造"最小惊讶"）
- chevron禁用判定：`viewMonth`等于或早于`minDate`所在月份时`ChevronLeft`禁用；等于或晚于`maxDate`所在月份时`ChevronRight`禁用
- 星期表头：`日 一 二 三 四 五 六`，`text-sm text-muted-foreground`，7列grid居中，非交互
- 下接`MonthGrid`（4.3）
- 过渡：Drawer出入场沿用既有（上滑入`duration-slow`，下滑出`duration-normal`，`ease-default`，遮罩`rgba(43,38,32,0.4)`）；月份切换时网格内容位移+fade（前进方向`translateX`负向，后退正向），`duration-normal ease-default`，复用v2 5.1日期切换的位移语言，不新造动效词汇

### 4.3 MonthGrid（新增，纯展示网格，可独立复用）

Props：`year: number`、`month: number`（0-11）、`selectedDate: string`、`todayDate: string`、`minDate: string`、`maxDate: string`、`onSelectDate: (dateStr: string) => void`。

- 7列grid，`gap-x-1 gap-y-2`（4px/8px），每格容器44×44（`h-11 w-11`），数字`font-mono text-base`居中
- 网格包含当月全部日期，前后用相邻月日期填满整行（标准date-picker惯例），相邻月日期功能与本月一致（点击即选中），仅视觉弱化
- 四种视觉状态（可叠加，selected优先于today）：
  - 默认（本月，可选范围内）：`text-foreground`，hover（桌面）`bg-secondary rounded-full`，active `scale-[0.92]`
  - 相邻月填充：同上但常态`text-muted-foreground`
  - 今天（非选中）：`rounded-full border-[1.5px] border-ink text-ink`
  - 选中（等于`selectedDate`）：`rounded-full bg-ink text-primary-foreground font-semibold`（若当天同时是今天，仍显示选中样式，不做二次区分，主视图本身已有"今日"上下文不需要日历里重复强调）
  - 超出`[minDate, maxDate]`：`text-muted-foreground opacity-40 pointer-events-none`，不可点、无hover/active反馈
- 每格`<button type="button" aria-label="{M}月{D}日 周{X}" aria-current={isToday?"date":undefined} aria-pressed={isSelected}>`，颜色不是唯一信息载体（选中态有实心底+字重双通道，今天有描边+ARIA标记）
- 过渡：`duration-fast ease-default`
- 纯展示组件，不含月份切换状态，不发起数据请求（不回填任何一天的完成情况，见第7节待决策2）

---

## 5. 交互与动效规范

### 5.1 打开日历

点击DateTicket日期区域：`DateJumpSheet`从底部滑入，规格同v1 4.12/v2 4.7抽屉动效（上滑入`duration-slow`，`ease-default`）。打开时`viewMonth`定位到当前`viewDate`所在月份，不强制跳到今天所在月。

### 5.2 月份切换

点击chevron：网格内容按方向位移+fade（`translateX(±8px)→0`+fade），`duration-normal ease-default`，与v2 5.1日期切换的运动语言保持一致，不新增动效词汇。到达边界后对应chevron变disabled视觉，点击无反应无提示（disabled态本身已经传达不可交互，复用v2 5.1"翻页到边界不额外toast"的既有结论）。

### 5.3 选中日期

点击任意可选格子：格子`active:scale(0.92)`即时反馈，立即触发`onSelectDate(dateStr)`，父层（`app/page.tsx`）同步执行`setViewDate(dateStr)`并关闭抽屉（`duration-normal`下滑出）。不做"选中态先高亮展示再关闭"的两段式动画，工具性操作不需要额外的仪式感停留。

主视图内容因此产生的`viewDate`变化，动效上归类到v2 5.1"点击回到今天"分支（不定距离跳转，纯fade过渡），不归类到"点击前进/后退箭头"分支（相邻步进，位移过渡）：日历选中的目标日期和当前日期之间没有固定的相邻关系，位移方向没有意义。code-writer实现时核对`app/page.tsx`里这两条分支目前的实现方式，让日历跳转复用"不定距离"那一条。

### 5.4 状态切换总则（延续v1/v2）

一切可见性变化（月份内容切换、chevron disable态）进场`duration-normal`出场`duration-fast`，`ease-default`，不允许瞬间出现消失。全局`prefers-reduced-motion`处理已在`globals.css`生效，位移动画自动降级为纯fade，本方案新增动效遵循同一条规则。

---

## 6. 设计依据

延续v1/v2的Design Thinking四问（Purpose/Tone/Constraints/Differentiation不变，这是同一产品的功能延伸）。本次相关的具体应用：

- **Purpose**：用户原话是"想回到历史阶段而不是只能一格一格翻"，本质是"精确定位到某一天"这个新增诉求，日历网格是最直接满足这个诉求的形式，不是加个装饰。
- **Differentiation**：延续"打孔票据"隐喻，日历Header下的打孔虚线分隔线呼应票据头和`SummaryCompareTable`已经用过的手法，让新组件不显得突兀，不是另起一套视觉语言。

关键决策的为什么：

- 自定义网格不用原生input：原生系统UI风格和暖纸+印章的产品调性直接冲突，工程可控性也更低（系统picker无法定制token）
- 不引入Popover：项目当前没有这个原语，内容体量接近`SummarySheet`，用已建立的`Drawer`心智模型成本更低，符合"不引入新弹层模式"的派工约束
- 触发点长在日期文字本身而非新增图标按钮：日历改变的是"正在看哪天"这个状态，触发点应该在承载这个状态的元素上，而不是混进"跳去别处"语义的图标组里
- 选中态用圆形而非方形：项目里圆形（`CheckButton`/`CompletionStamp`/头像）承载"可执行动作/状态点"语义，方形（`SlotCard`/输入框/按钮）承载"内容容器"语义，日历格子是"点一下就生效的动作点"，用圆形延续既有语言而不是新发明一套
- 过去/未来边界不对称（180天vs90天）：过去是真实历史有查证价值，未来是模板推演价值递减更快，两者给同样的余量不合理
- 选中即关闭，不做两段式确认：这是个跳转工具，跳转生效本身就是最直接的反馈，多一次确认点击是不必要的摩擦
- 相邻月填充日期允许点击：标准date-picker惯例，属于工程正确性范畴的功能性惯例而非视觉套路，不违反反AI审美自检条款

---

## 7. 待决策项

1. **可选范围具体天数**：本方案建议过去180天、未来90天（理由见2.4），需要确认是否认可这两个数字，还是要放开更长/更短的范围。这条会直接影响`minDate`/`maxDate`计算和chevron禁用判定，需要在实现前拍板。
2. **日历格子是否叠加当天完成情况数据**：本方案默认不做（MVP只做跳转，不回填数据），如果产品想让日历本身也能一眼看出"这个月哪几天全勤"，需要额外的月度批量查询能力（当前`app/page.tsx`只按单日`viewDate`取数据），工作量不小，建议作为后续独立增强，不在本次范围内。
3. **是否需要"跳到今天所在月"快捷键**：本方案没做（180天/90天边界下最多6到9次chevron可达，可接受），如果用户觉得点击次数仍然太多，可以后续在月份切换行加一个次级链接。
4. **相邻月填充日期的点击行为**：本方案选择"点击即选中即关闭"（与本月日期行为一致），如果产品想要更保守的两段式交互（点相邻月日期只切换月份视图，不直接选中关闭），需要明确，这会改变4.3和5.3的实现细节。

---

## 8. 给code-writer的交付说明

**扫描来源**：v1文档`docs/ui-20260714-shared-checkin.md`、v2文档`docs/ui-20260714-shared-checkin-v2.md`（token与组件规格唯一取值来源）、项目CLAUDE.md（时间处理约定、禁止清单）、`app/globals.css`/`tailwind.config.ts`（确认token实际接线与类名）、`components/DateTicket.tsx`/`app/page.tsx`（现有props与状态管理）、`components/SummarySheet.tsx`（Drawer Header行结构参照样本）、`components/ui/drawer.tsx`/`dialog.tsx`/`button.tsx`（既有弹层与按钮原语）、`lib/preview-plan.ts`/`lib/slot-status.ts`（日期工具与状态判定现状）。

**复用**：`Drawer`/`DrawerContent`/`DrawerTitle`原样复用；`DateTicket`四态图标按钮规格；v2 5.1已定义的两类日期切换动效分支。

**新增组件**（放`components/`，PascalCase，与既有文件同粒度）：`DateJumpSheet`（容器，含月份切换头）、`MonthGrid`（纯网格，可独立复用）。

**修改既有组件**：

- `DateTicket.tsx`：新增`onOpenDateJump`prop，Row1日期区域改为可点按钮+追加`CalendarDays`图标，其余结构不变
- `app/page.tsx`：新增`dateJumpOpen`状态（同`summaryOpen`模式），渲染`<DateJumpSheet>`并接入`onSelectDate={(d) => { setViewDate(d); setDateJumpOpen(false); }}`，不需要改数据层（`loadData`已经按`viewDate`驱动，日历只是另一种写`viewDate`的入口）
- `lib/preview-plan.ts`或新增`lib/calendar-grid.ts`：需要"按年月生成含前后月填充的42/35格日期矩阵"和"月份加减"这两个工具函数。建议新开`lib/calendar-grid.ts`而不是塞进`preview-plan.ts`（后者语义是"预览模板生成"，日历月份计算是独立职责，混在一起会让文件语义模糊）

**采纳的frontend-design方向**：延续v1/v2（不重新选择字体/配色/运动/空间/背景方向），日历新增内容严格用既有视觉语言组合出新状态，没有引入新方向。

**反AI套路自检**：无新增色相；选中态用既有accent色（`bg-ink`），不是套娃紫色渐变；月历网格是功能性惯例（date-picker标准形态）不是"三等分卡/Hero数字"这类审美套路，且打孔虚线分隔线、圆形选中态都延续了本产品既有的"打孔票据"隐喻，不是另起一套。项目一致性检查：去色后布局层级靠字号字体成立（月份标题>星期表头>日期数字，字号递减）；同类元素（chevron、关闭钮、Drawer出入场）复用既有组件规格，没有出现两个长得不一样但功能相同的组件。

**工程正确性底线自查**：

- 触控：日期格子44×44、chevron 44×44、关闭钮44×44，日期文字触发按钮命中区扩展到44px
- 颜色不是唯一信息载体：选中态实心底+字重双通道；今天态描边+`aria-current`；超出范围态opacity+`pointer-events-none`+无hover反馈三重信号
- 中文断行："选择日期""2026年7月"均为短句，375px下不会换行
- 反馈状态：disabled态明确无hover/active，避免用户误以为可点却没反应
- 动效：状态切换均在150到400ms内，遵循`prefers-reduced-motion`（全局CSS已处理，无需新增媒体查询）
- 导航：日历跳转后的主视图内容过渡需要复用v2既有的"不定距离跳转"分支（纯fade），不要误用"相邻步进"分支（位移），实现前核对`app/page.tsx`里这部分现状

**实施顺序建议**：先确认第7节待决策1（可选范围天数），这条直接决定`minDate`/`maxDate`计算和chevron禁用逻辑，越早确认返工越少；待决策2（数据回填）和3（快捷键）不影响MVP可以先跳过。
