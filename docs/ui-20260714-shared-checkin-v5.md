# 双人共享打卡 UI设计方案 v5：留言板

本方案是v1（token与基础组件）、v2（日期导航与每日总结）、v3（日历跳转）、v4（PDCA周期目标）的延伸，新增一个独立小功能：留言板。不新增色相、字体、间距、圆角、阴影token，不引入新的弹层原语（继续复用`Dialog`，不引入Popover/Select）。本方案体量小，聚焦讲清楚这一个功能点。

---

## v5.1 修订记录（真机试用后，用户反馈调整）

用户实机体验后反馈两点，覆盖第5、6节里"一条播完再播下一条、不并发"的原方案决策：

1. **改为多条同时飘动**：明确指向"QQ空间"评论区那种同时有多条内容划过的效果，不要"播一条、等一大段空白、再播下一条"的节奏。已实现为**两条轨道各自独立运作**：轨道之间不共享定时器，每隔2到4.5秒尝试往空闲轨道派发一条新留言，不再有第3.2/5节描述的8到18秒空白间隔。原方案第5节"同时出现多条会破坏安静氛围"的判断被用户的实际审美偏好推翻，视觉呈现上仍保留单条留言本身的淡入淡出+位移节奏（第3.2节除并发/间隔外的规格不变）。
2. **新增留言历史与删除**：第6节待决策2原先默认"不做删除入口"，现已实现：留言板右侧新增"查看全部留言"入口（`History`图标，与写留言按钮并排），点击弹出`MessageHistoryDialog`列出全部留言（含时间戳），仅自己发的留言旁边带删除按钮。

`prefers-reduced-motion`降级（第3.6节）保持不变：仍是单条静态淡入淡出，不为并发场景单独设计降级方案（并发本身是动效层面的观感，非并发用户不需要感知"轨道"概念）。

实现细节以`components/MessageBoard.tsx`、`components/MessageHistoryDialog.tsx`代码为准，本节之外的原方案内容（token复用、字数计算公式、空状态、可访问性）未变。

---

## 1. Token与既有组件复用清单

扫描确认：`app/globals.css`的`:root`token表、`components/DateTicket.tsx`/`app/page.tsx`的实际类名、`lib/types.ts`已预置的`Message`类型（`id`/`sender_id`/`content`/`created_at`），本方案唯一取值来源仍是这份token表，不新增任何全局token。

用到的既有类名（实际接线名，取自当前代码而非v1文档旧称）：

- 颜色：`bg-card`、`text-foreground`、`text-muted-foreground`、`text-ink`、`bg-ink-subtle`、`border-border`
- 字体：`font-display`（项目里`font-body`与`font-display`同值，均为LXGW WenKai Screen，不存在二选一的问题）
- 字号：`text-sm`、`text-lg`
- 圆角：`rounded-lg`（容器）、`rounded-full`（头像圆点）
- 阴影：`shadow-sm`
- 动效：`duration-fast`、`duration-normal`、`ease-default`

既有组件复用：`Dialog`/`DialogContent`（`components/ui/dialog.tsx`）、`Textarea`（`components/ui/textarea.tsx`，PDCA阶段新增的共享组件）、`Button`（`components/ui/button.tsx`，`variant="ghost" size="icon"`用于写留言触发按钮，`variant="primary"`+`loading`用于发布按钮）、`Skeleton`（`components/ui/skeleton.tsx`）。

不新增第4种色相：留言文字用`text-foreground`（主文字色），头像圆点用既有的`bg-ink-subtle`/`text-ink`组合（与`SummaryNotesList`/`WeeklyCompareTable`的作者头像逐字节同款，不是新发明），空状态用`text-muted-foreground`。全部在既有3色相预算内。

**本方案新增的非token量值**（组件专属，不进`:root`）：留言飘动动画的时长（6到12秒区间）、出场间隔（8到18秒随机）——这两个量值只服务于这一个动效场景，比`--duration-slow`(400ms)大出一个数量级，硬塞进全局动效token表会污染"状态切换动效"这个语义（全局duration token描述的是UI状态转换，不是内容轮播节奏），建议作为`MessageBoard`组件内部常量维护，不写进`:root`。

---

## 2. 布局结构

### 2.1 固定位置：主视图`/`，DateTicket与内容区之间，不随`viewDate`/`dateMode`/双栏切换变化

```
┌─────────────────────────────────────┐
│ DateTicket（不变）                    │
├─────────────────────────────────────┤
│ (连接断开横幅，仅isToday且断连时出现)   │ 既有，位置不变
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤ MessageBoard 上边缘：1px dashed
│  😊  加油，今天也要按时睡觉呀      ✎  │ 留言飘过 + 写留言按钮
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤ 下边缘：1px dashed
├─────────────────────────────────────┤ mt-4（space-4）
│ 移动端：分段切换 Tabs（不变）           │
│ 或 桌面端：双栏（不变）                 │
└─────────────────────────────────────┘
```

（上图中"😊"代表20px头像圆点，非真实emoji）

**为什么放这里，不放进双栏区域**：需求明确"不能占用TA今天没排安排时才空出来的那块空间"——那块空间在`TabsContent`/双栏内部，随对方当天排没排时段而变化，不稳定。`MessageBoard`作为`DateTicket`和`Tabs`/双栏之间的独立一段，不属于任何一侧的内容列表，不管`myView`/`peerView`的slots是空是满、不管`dateMode`是today/past/future、不管移动端选中哪个tab，它的DOM位置和高度都固定不变。

**为什么不放DateTicket内部**：DateTicket已经承载日期导航+四个图标入口，信息密度接近375px下的宽度上限（v4待决策项6已经记录过这个拥挤风险）。留言板是内容和交互形态完全不同的独立模块（横向流动的文字，不是点击跳转的图标），塞进DateTicket会让两种视觉语言互相干扰，独立成一条horizontal strip更清晰。

**为什么不做成页面底部悬浮条**：底部固定悬浮会和Toast（Sonner，也是底部弹出）在移动端争夺同一块空间，需要额外处理层叠避让；而放在DateTicket下方是页面正常文档流的一部分，不需要额外的z-index/避让逻辑，跟随页面自然滚动，实现成本更低。

### 2.2 桌面端（≥768px）

`MessageBoard`保持整行宽度（跟随`<main className="mx-auto max-w-[960px]">`容器，不再拆分成双栏），位置不变，仍在DateTicket与双栏区域之间。留言是"两人共享"的概念，不属于"我的"或"TA的"任何一侧，不应该被拆进某一栏。

### 2.3 与`app/page.tsx`现有结构的接入点

现有代码里，连接断开横幅和移动端Tabs之间是这一段（第376到387行左右）：

```tsx
{!connected && isToday && ( ... )}

{/* 移动端：分段切换 */}
<div className="mt-4 md:hidden"> ... </div>

{/* 桌面端：双栏并列 */}
<div className="mt-6 hidden gap-6 md:grid md:grid-cols-2"> ... </div>
```

`<MessageBoard>`插入在连接横幅之后、两个响应式布局div之前，只渲染一次（不按断点复制两份），且**不包在`isToday`或任何`dateMode`判断里**——这是本方案最容易踩的坑：现有代码里`connected`横幅、`PeerSummaryBar`都只在`isToday`成立时渲染，如果照抄这个模式把`MessageBoard`也套进`isToday &&`，用户翻看历史或预览未来日期时留言板会消失，违反"固定存在"的需求。

---

## 3. 组件规格清单

通用规则延续v1：所有可交互元素`focus-visible`时2px ring；移动端可点目标≥44×44px；hover仅桌面端生效。

### 3.1 MessageBoard（新增，容器组件）

Props：`messages: MessageView[]`（调用方已按sender_id映射好显示身份，见第7节数据契约）、`loading: boolean`、`onWriteClick: () => void`。

- 容器：`bg-card`、`rounded-lg`、`shadow-sm`、`h-16`（64px，固定高度，不随内容变化）、`px-4`、`relative overflow-hidden`
- 上下边缘：`border-y border-dashed border-border`（呼应DateTicket打孔虚线母题，替代常规实心卡片的无边框处理，让这条strip一眼区别于功能性卡片）
- 内部分两个区域：左侧"留言飘动轨道"（宽度=容器宽度-56px，见3.2）+ 右侧固定56px宽的写留言按钮区（3.4）
- 三种内容态（互斥，按`loading`/`messages.length`判定）：
  1. `loading===true`：轨道内显示`Skeleton`，`h-5 w-40 rounded-sm`，居中，脉冲动画（复用既有Skeleton组件，不新写脉冲样式）
  2. `loading===false && messages.length===0`：轨道内居中显示空状态（3.3），静态不飘动
  3. `loading===false && messages.length>0`：轨道内运行飘动逻辑（3.2）
- 写留言按钮（3.4）在以上三种态下都保持可见可点，不随内容态变化（写留言这个动作不依赖留言列表是否加载完成）

### 3.2 留言飘动轨道（MessageBoard内部逻辑，不建议拆独立组件文件——这次功能体量小，拆分过细反而增加跳转成本；如果code-writer觉得动画逻辑和布局逻辑分离更好维护，可以拆一个`FloatingMessageText`子组件，是否拆分不影响视觉规格）

**内容**：当前正在播放的一条留言，`<div className="flex items-center gap-2">`：
- 头像圆点20px：`rounded-full bg-ink-subtle text-ink`，居中显示来源标记——自己发的显示"我"，对方发的显示对方姓名首字（与`app/page.tsx`第424/434行现有的头像渲染惯例完全一致，不新发明一套标记方式），`aria-hidden="true"`（装饰性来源标记，读屏由外层`aria-live`统一播报，见3.5）
- 留言文字：`font-display text-lg text-foreground whitespace-nowrap`，不换行、不截断（允许比容器更宽，飘过程中被`overflow-hidden`部分裁切是预期效果，类似"划过视野一部分"的氛围，不是bug）

**没有装饰引号**：来源已经靠头像圆点标记，不再叠加引号类装饰——项目现有的作者标记语言就是头像圆点（`SummaryNotesList`/`WeeklyCompareTable`recap行都是这个模式），留言板延续同一语言而不是另造一套"引号+署名"的装饰，避免同一产品里出现两种"这句话是谁说的"的视觉表达。

**动画（有主动效版本，`prefers-reduced-motion`版本见3.6）**：

- 单条播完再出下一条，同一时刻不并发展示多条（见第6节待决策4，此为默认值）
- 方向：每次出场随机选择从左飘入划向右侧淡出、或从右飘入划向左侧淡出（50%概率各一半），不固定同一方向——飘动本身已经不是持续循环的跑马灯，方向也随机能进一步弱化"机械感"，更接近"风吹过来的一句话"这种不规律的氛围
- 时长：按留言字数动态计算，`duration = clamp(6000, 6000 + max(0, 字数-10)×150, 12000)`（毫秒）。字数越多留言相对越长，需要更多时间划过让人有机会瞥到内容；上限12秒避免长留言拖太久，下限6秒避免短留言一闪而过
- 位移范围：从容器完全不可见处进入，到容器另一侧完全不可见处退出，两端都要留言自身宽度也完全清空，不能出现"划到一半被截断收尾"的观感。因为留言最长40字，在375px移动端容器下文字自身宽度大概率超过轨道宽度（这是预期的、类似跑马灯露出片段的效果，不是要压缩文字），**实现时需要用JS测量文字实际渲染宽度**（如`ref.offsetWidth`）动态计算位移起止点，不能只用`transform: translateX(百分比)`硬编码——`translateX`的百分比基准是元素自身宽度而非容器宽度，短留言和长留言用同一套百分比会导致长留言划不到头就被认为"结束"，卡在半可见区域
- 透明度：进入阶段前12%动画时长内从0淡入到1，退出阶段后12%时长内从1淡出到0，中间76%时长保持完全不透明；透明度变化和位移是两条独立的动画轨道（同一个`animation`时长绑在一起即可），不随方向变化
- 缓动：位移用`linear`（匀速漂浮感，不用`ease-default`那种UI转场式的加减速，避免看起来像"有意图的界面动画"而不是"飘过去的氛围"）；透明度淡入淡出也用`linear`
- 间隔：一条完整播完（含淡出）后，等待随机8000到18000毫秒的空白间隔，再开始下一条——这个不规律的等待时长就是"不是匀速循环的跑马灯"的核心区别，跑马灯是零间隔连续滚动，留言板是"播一条、消失、晾一会、再冒一条"
- 首次出现：页面加载完成后，第一条留言不用等最长18秒，用较短的随机1500到4000毫秒延迟出现，避免用户以为这个区域"什么都不会发生"而划走注意力
- 选取下一条留言：从`messages`里随机选一条，避免和上一条连续重复（同一条不能连着播两次）
- 新留言发布后的插队：见3.5

### 3.3 空状态（留言板内，静态不飘动）

- 内容：`MessageCircle`图标14px `text-muted-foreground` + "还没有人留言，点右边写第一句" `text-sm text-muted-foreground`，`flex items-center gap-1.5`，垂直水平居中于轨道区域
- 静态展示，无入场动画，无飘动——这是"目前没有内容"的陈述状态，不需要额外动效强调
- 上下dashed边框依然渲染（这条strip本身的存在感不依赖是否有留言内容，边框本身已经在告诉用户"这里是个区域"）

### 3.4 写留言触发按钮

- 位置：容器右侧固定56px宽度区域内垂直居中，`absolute right-2 top-1/2 -translate-y-1/2`
- 视觉：复用`Button`组件`variant="ghost" size="icon"`（40×40，`rounded-md`），内部`PenLine`图标18px
- `aria-label="写一句留言"`
- 四态：默认`text-muted-foreground`透明底；hover（桌面）`bg-secondary`；active `scale-[0.92]`；disabled不出现（写留言这个入口任何时候都可用，不依赖留言列表加载状态或页面`dateMode`）
- 过渡：`duration-fast ease-default`（`Button`组件内建）
- 点击触发`onWriteClick`，由`app/page.tsx`打开`MessageComposerDialog`

### 3.5 MessageComposerDialog（新增，写留言弹窗）

**为什么用Dialog不用Drawer**：项目现有两类弹层各自的适用场景——`Drawer`用于结构化多字段编辑（`SlotEditorSheet`/`GoalEditorSheet`/`DateJumpSheet`/`SummarySheet`），`Dialog`用于轻量单一输入的快速动作（`CheckInDialog`打卡备注、`PhotoDialog`看图、`SharePreviewDialog`看分享图）。写一句留言就是"一次性的单一文本输入+确认"，形态和`CheckInDialog`几乎一样（同样是一个文本框+取消/确认两个按钮），直接沿用`Dialog`这一类，不是`Drawer`那一类。

Props：`open: boolean`、`onOpenChange: (open: boolean) => void`、`submitting: boolean`、`onSubmit: (content: string) => void`。

- 复用`Dialog`/`DialogContent`（`max-w-sm`，与`CheckInDialog`同宽度基准）
- 标题："写一句话" `font-display text-lg text-foreground`
- `Textarea`（复用`components/ui/textarea.tsx`）：`rows={3}`、`maxLength={40}`、`placeholder="写句鼓励或加油的话"`；右下角字数计数`{content.length}/40` `text-sm text-muted-foreground`（视觉写法与`CheckInDialog`的字数计数器逐字节一致）
- 校验：内容去除首尾空白后不能为空，发布按钮在为空时disabled；不做失焦校验报错（这是单字段短内容，没有格式规则可校验，非空判断直接体现在按钮可用性上，不需要额外的错误提示文案）
- 按钮区：`justify-end gap-3`，"取消"（`Button variant="secondary" size="sm"`）+ "发布"（`Button variant="primary" size="sm"`，`disabled={内容为空}`，`loading={submitting}`，`loadingText="发布中…"`）
- 发布成功：关闭弹窗，`toast.success("已发布")`，清空文本框状态（下次打开是空白）
- 发布失败：不关闭弹窗（保留用户已输入的文字，避免重打一遍），`toast.error("发布没同步上", { action: { label: "重试", onClick: ... } })`

**新留言插队播放**：发布成功后，把这条新留言标记为"下一个必须播放的"——如果此刻轨道正在播放另一条留言，等它这一轮播完（含淡出）再插播新留言，不打断正在进行的动画；如果此刻正处于空白间隔期，跳过剩余等待时间直接播放新留言。这是本方案里唯一值得做"即时反馈"的时刻（呼应frontend-design准则里"高冲击时刻用动效"的原则）——写留言是用户在这个氛围功能里唯一的主动参与动作，写完就能亲眼看到自己的话飘过去，比等待随机轮到强得多。

### 3.6 `prefers-reduced-motion`降级方案

**为什么不能只靠`app/globals.css`里现有的全局规则**：项目现有的全局降级写法是：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    ...
  }
}
```

这条规则对v1到v4里的动效都成立，因为那些动画的"终帧"就是有意义的静止状态（图章落定、tab选中块移动到位、抽屉滑到底部）——瞬间跳到终帧看起来只是"没有过渡"，结果依然正确。但留言飘动动画的终帧是`translateX(完全划出容器)`+`opacity: 0`——如果只靠全局规则把动画时长压到0.01毫秒，效果是留言瞬间跳到"完全不可见"的状态，也就是这个功能在减少动效模式下会直接变成空白，比没做降级更糟。

**具体做法**：不依赖全局CSS规则，`MessageBoard`内部显式检测`prefers-reduced-motion`（新增小hook`lib/use-prefers-reduced-motion.ts`，`useEffect`监听`window.matchMedia('(prefers-reduced-motion: reduce)')`，SSR安全），检测为`true`时完全切换到另一套渲染逻辑，不复用3.2的位移动画：

- 当前留言**静止显示在轨道居中位置**，不做任何`transform`位移
- 只用透明度做淡入淡出，且使用项目既有的全局动效token而不是3.2里的自定义秒级时长：淡入`duration-normal`（250ms），静止展示（不透明度100%）持续4500毫秒（留出阅读一句最长40字文案的时间），淡出`duration-fast`（150ms）
- 淡入淡出之间的展示时长不算"动效"，是静态停留，不受`prefers-reduced-motion`额外影响
- 展示完一条后同样进入8000到18000毫秒的随机间隔，再淡入下一条——保留"偶尔出现"的节奏感，只是去掉位移，这正是"降级到静态展示"的准确含义：内容还在，只是不再移动
- 头像圆点、发布后插队逻辑、首次出现延迟等其余规则不变

---

## 4. 交互与动效规范汇总

（本节汇总3.2/3.5/3.6已经写清楚的规则，避免重复，仅列关键数值供code-writer速查）

| 项目 | 数值/规则 |
|---|---|
| 单条飘动时长 | `clamp(6000, 6000+max(0,字数-10)×150, 12000)` 毫秒 |
| 出场间隔 | 随机8000到18000毫秒 |
| 首次出现延迟 | 随机1500到4000毫秒 |
| 并发数 | 同一时刻只播一条（见第6节待决策4） |
| 方向 | 每次随机左进右出或右进左出 |
| 缓动 | 位移与透明度均`linear` |
| 新留言插队 | 当前播放完/间隔中立即插播，不打断进行中动画 |
| reduced-motion降级 | 位移动画整体停用，改纯透明度淡入(250ms)→静止4500ms→淡出(150ms) |
| 写留言按钮 | 常驻可点，不受留言加载/播放状态影响 |
| 无障碍 | 当前留言容器`role="status" aria-live="polite" aria-atomic="true"`，文字变化时读屏播报一次；头像圆点`aria-hidden` |

---

## 5. 设计依据

延续v1到v4的Design Thinking四问，本次新增功能下的具体回答：

- **Purpose**：状态不好、想放弃的时候，能看到对方（或自己之前）留下的鼓励话，起情绪支撑作用。这不是一个需要专门"打开查看"的功能入口，而是日常使用主视图时会自然撞见的氛围元素——用户原话强调"不是列表摆着让人翻看"，界面必须服务这个"偶遇"感，不能做成任何形式的可点开列表。
- **Tone**：延续"打孔票据"隐喻但切换到最轻的一种表达——这条strip本身就像票据卷上撕下来的一小段，留言文字像风吹过纸面时飘过的字句。不引入新的装饰语言（没有引号、没有心形图标这类容易显得刻意可爱的装饰），克制延续已有语言。
- **Constraints**：不引入新弹层原语（沿用v3/v4确立的约束，继续只用Dialog/Drawer/AlertDialog三种）；`prefers-reduced-motion`必须真正生效，不能依赖项目现有的全局CSS规则（这条在第3.6节详细论证）；留言板固定占位，不能因为翻看历史日期或对方当天没排时段而消失或位移。
- **Differentiation**：市面上的"留言板"几乎都是列表+点开查看的形态；这里反过来做成"你不找它，它偶尔自己冒出来"——这个反列表化的处理本身就是记忆点，配合票据纸带的视觉语言，让留言像是从纸卷缝隙里飘出来的字条，而不是一个功能性的社交模块。

关键决策的为什么：

- **一条播完再播下一条，不并发**：需求原文对此明确提问，本方案选择保守值（不并发）。理由：这是情绪支撑功能不是信息密度功能，同时出现多条会让"偶尔飘过"变成"热闹的信息流"，与"防止半途而废"这种需要安静、专注、被看见的情绪场景不符。如果产品觉得偶尔多条同时出现更有生气，需要重新设计间距避让和层叠规则（见第6节待决策4）。
- **方向随机而非固定单向**：固定同一方向（比如永远从右往左）容易让用户在多次使用后把它识别成"跑马灯"的机械模式；随机方向进一步强化"风吹过来的偶然感"，这个决策本身不影响任何数据结构，属于纯视觉判断，不需要产品额外确认。
- **飘动时长按字数动态计算而非固定值**：留言字数上限40字，短则三五个字长则接近满格，固定一个时长会让短留言划得太慢、长留言划得太快没读完就消失。按字数分段（clamp在6到12秒）让阅读节奏和内容量匹配。
- **发布后插队播放**：这是整个氛围功能里唯一需要用户主动操作的环节（写留言），也是唯一适合给"高冲击反馈"的时刻（frontend-design准则：动效用在高冲击时刻，不撒满整页微交互）。写完就能看到自己的话飘过去，比"随机排队等着轮到"给的反馈更直接，对应需求里"起到情绪支撑作用"这个核心目的——写下鼓励的话本身也应该让写的人立刻获得一点positive feedback。
- **reduced-motion走独立降级分支而非依赖全局CSS**：这是本方案唯一一处需要额外强调的工程决策，详细论证见3.6，此处不重复。
- **不用引号装饰，只用头像圆点标记来源**：项目里"这句话是谁说的"这件事已经有一套现成语言（`SummaryNotesList`/`WeeklyCompareTable`的头像圆点），留言板延续它，避免同一产品里"作者标记"出现两套长得不一样的视觉方案（对应项目一致性检查"是否存在两个长得不一样但功能相同的组件"这一条）。

---

## 6. 待决策项

1. **留言数据是否需要Realtime同步**：本方案没有强制要求。如果希望"一方发布留言，另一方不刷新页面就能看到"（和`day_plans`表现有的实时体验对齐），需要在`day_plans`订阅逻辑之外再开一个`messages`表的Realtime channel；如果接受"对方下次打开/刷新页面才看到最新留言"，可以只做一次性拉取+定期轮询（或干脆只在页面加载时拉一次）。这是产品/技术选择，不影响本方案任何视觉规格，但会影响`app/page.tsx`里`messages`状态的获取方式，需要在实现前确认。
2. **已发布的留言能否删除/撤回**：需求原文没有提及，本方案默认不做删除入口（写完就是定稿，MVP最简）。如果需要支持"手滑写错了想删掉"，需要额外设计一个删除入口和确认流程，目前方案没有为此预留UI。
3. **留言字数上限40字是否合适**：本方案参照项目现有备注字段（打卡备注同样是40字上限）定的这个数字，因为"一句话"的心智模型和打卡备注接近。如果产品觉得鼓励的话应该更短（比如20字，逼着写得更精炼）或更长（比如60字，容许写一段完整的话），只需要调整`maxLength`这一个数字，不影响其余任何规格。
4. **是否允许同一时刻出现多条留言**：本方案默认不允许（一条播完等间隔再播下一条），理由见第5节。如果产品体验后觉得留言板"太安静、经常看不到东西"，可以考虑放开并发，但需要重新设计多条同时飘动时的垂直分层避让规则（比如按不同高度分道飘动），这不是本方案当前范围。
5. **留言板是否需要出现在`/weekly`等其它页面**：本方案只覆盖主视图`/`。如果产品认为周报页面也适合出现同样的氛围元素，可以直接复用`MessageBoard`组件本身（props设计已经足够通用），只是需要在`/weekly`页面的布局里另外确定插入位置，这不在本次范围内。

---

## 7. 给code-writer的交付说明

**扫描来源**：v1到v4方案文档（token与组件规格唯一取值来源）、项目CLAUDE.md（数据模型、禁止清单）、`app/globals.css`（确认token实际接线，以及`prefers-reduced-motion`的现有全局处理方式——本方案3.6节论证了这条全局规则对本功能不适用，需要组件级单独处理）、`app/page.tsx`（现有状态管理模式、连接横幅与Tabs/双栏之间的实际插入点）、`components/DateTicket.tsx`（头像圆点渲染惯例、图标按钮四态写法）、`components/CheckInDialog.tsx`（Dialog类弹层的实际写法，本方案`MessageComposerDialog`直接参照它的结构）、`components/ui/dialog.tsx`/`components/ui/textarea.tsx`/`components/ui/button.tsx`（确认`Button`组件的`variant`/`size`/`loading`用法）、`lib/types.ts`（`Message`类型已经预置好，字段为`id`/`sender_id`/`content`/`created_at`）。

**复用**：`Dialog`/`DialogContent`、`Textarea`、`Button`（`variant="ghost" size="icon"`做写留言触发按钮、`variant="primary"`+`loading`做发布按钮）、`Skeleton`；头像圆点视觉语言（`bg-ink-subtle`/`text-ink`，"我"/对方姓名首字的标记惯例）。

**新增组件**（放`components/`，PascalCase，与既有文件同粒度）：`MessageBoard`（容器，含飘动逻辑、空状态、写留言按钮）、`MessageComposerDialog`（写留言弹窗）。如果动画逻辑和布局逻辑分离更利于维护，`MessageBoard`内部可以再拆一个`FloatingMessageText`子组件，是否拆分不影响本方案任何视觉规格。

**新增共享工具**：`lib/use-prefers-reduced-motion.ts`（新hook，检测`prefers-reduced-motion`，SSR安全，命名跟随现有`lib/use-session.ts`的hook放置惯例）。

**数据契约**（不涉及Supabase查询细节，只约定组件层面的输入形状）：

```ts
// MessageBoard的输入形状，由 app/page.tsx 从 lib/types.ts 的 Message 映射得出
type MessageView = {
  id: string;
  content: string;
  authorLabel: string;   // 自己发的传"我"，对方发的传对方姓名首字——与 app/page.tsx
                          // 第424/434行现有头像渲染逻辑取同一套值，不要重新定义一套映射规则
  isMine: boolean;        // 目前视觉规格不需要这个字段区分样式（3.2节已说明不做区分），
                          // 但建议保留在类型里，方便以后如果要加"我方/对方"筛选之类的功能
};
```

`app/page.tsx`新增状态：`messages: MessageView[]`、`messagesLoading: boolean`、`composerOpen: boolean`、`composerSubmitting: boolean`。数据获取函数建议新开`lib/messages.ts`（模式参照`lib/weekly-reviews.ts`），具体是否接Realtime见第6节待决策1。

**插入位置**：`app/page.tsx`里连接横幅`{!connected && isToday && (...)}`之后、移动端Tabs响应式div之前，插入一次`<MessageBoard messages={messages} loading={messagesLoading} onWriteClick={() => setComposerOpen(true)} />`，**不要**包进`isToday`或`dateMode`相关的条件判断（第2.3节已详细说明这个坑）。`<MessageComposerDialog>`渲染位置参照现有`<CheckInDialog>`/`<DateJumpSheet>`的写法，放在`</main>`结束标签之前。

**采纳的frontend-design方向**：延续v1到v4（不重新选择字体/配色/背景方向）。运动方面本次是全新场景——项目此前的动效都是"状态转换"（打卡盖章、tab切换、抽屉出入场），留言飘动是本项目第一个"内容轮播型"动效，采纳frontend-design"动效用在高冲击时刻"的原则时做了取舍：飘动本身克制低调（linear匀速、无弹性），把唯一的"高冲击"用在发布后插队播放这一个真正值得强调的用户主动操作时刻。

**反AI套路自检**：无新增色相；没有用心形图标、引号装饰这类容易显得廉价可爱的老套手法，来源标记延续项目已有的头像圆点语言；飘动效果是"票据纸带上飘出字条"这个产品隐喻的延伸，不是套娃常见的"跑马灯公告栏"通用组件（跑马灯是连续循环+固定方向，本方案刻意做成间歇性+随机方向来避免这个联想）。项目一致性六查通过：去色后布局关系不受影响（这是个纯文字氛围区，没有信息层级需要靠颜色支撑）；同类元素（写留言按钮沿用DateTicket图标按钮四态、Dialog沿用CheckInDialog结构）风格统一；没有出现两个长得不一样但功能相同的组件；留白按4px网格（容器`h-16`、内边距`px-4`）；色相仍是3个。

**工程正确性底线自查**：

- 触控：写留言按钮40×40视觉、44px有效点击区（`Button size="icon"`默认已是40×40，如果需要额外扩展命中区参照`DateTicket`日期按钮的负margin写法）
- 表单：`Textarea`有可见标题"写一句话"在弹窗顶部（不靠placeholder代替），非空校验体现在发布按钮disabled上
- 响应式：`overflow-hidden`确保移动端不会因为飘动文字过宽产生横向滚动条（这一点在3.2节已强调，容器本身裁切超出内容，不影响页面整体布局）
- 中文断行：空状态文案"还没有人留言，点右边写第一句"（约11个汉字）在375px容器减去左右padding和右侧按钮预留56px后，剩余可用宽度约263px，16px字号下不会换行；弹窗标题"写一句话"极短，不受影响
- 反馈状态：发布按钮明确的默认/hover/active/disabled/loading规格（`Button`组件内建）；写留言触发按钮默认/hover/active三态（disabled态说明为"不出现"）
- 动效：**本方案唯一需要特别注意的一条**——飘动动画时长以秒计（6到12秒），大幅超出项目全局`prefers-reduced-motion`规则原本假设的"短时状态转换动画"场景，必须在组件内部显式检测并切换到独立的静态降级分支（3.6节），不能假设全局CSS规则已经处理好
- 无障碍：当前留言容器用`aria-live="polite"`播报文字变化，头像圆点`aria-hidden`，避免完全依赖视觉的"飘过"效果让屏幕阅读器用户什么都获取不到

**实施顺序建议**：先确认第6节待决策1（Realtime与否），这条决定`app/page.tsx`里messages状态的刷新方式，影响面较大；待决策2（能否删除）和5（是否复用到`/weekly`）不影响MVP可以先跳过；待决策3（字数上限）和4（并发展示）纯粹是数字/规则微调，实现后如果产品觉得不对可以随时调整，不影响其余代码结构。
