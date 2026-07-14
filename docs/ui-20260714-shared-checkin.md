# 双人共享打卡 UI设计方案

三个页面：`/login`、`/`（主视图）、`/template`。移动端优先，375px为第一设计目标。技术栈Tailwind CSS+shadcn/ui，本方案所有规格可直接映射到Tailwind实现。

---

## 1. 项目设计语言映射表

### 1.1 扫描结论

项目目录`D:\.Project\20260714-shared-checkin\`下只有README/CLAUDE.md/WORKLOG.md，无任何代码与既有样式。属于零起点新建设计系统场景，派工方明确要求基于`design_template.md`的CSS变量结构定义具体值。本节的token定义表是全方案唯一取值来源，第2节起所有颜色、字号、间距一律以token名表述，实现时禁止在组件里写裸hex。

### 1.2 设计方向定调

概念：**打卡钟与印章**。「打卡」这个词本身来自工厂考勤打卡钟（punch clock），方案把这个词面意思做成视觉语言：

- 底色是暖纸色带点阵网格，像一页效率手册
- 时间数字全部用IBM Plex Mono（IBM是打孔卡时代的公司，等宽数字自带考勤机气质）
- 完成打卡=盖一枚墨蓝圆章，带弹性落章动画，这是每天高频动作的爽点
- 对方超时=一枚虚线边的朱红「拖延N分钟」小戳，像图书馆逾期章，显眼但面积小不刺眼
- 每日进度用一排小方格「打孔条」表示，一眼看出两人各自完成了几格

色相预算3个：墨蓝（品牌/完成）、朱红（拖延/危险）、赭黄（警告，仅连接异常等极少场景）。

### 1.3 Token定义表（globals.css `:root`，唯一取值处）

#### 色彩

| 变量 | 值 | 用途 |
|---|---|---|
| `--color-bg-primary` | `#F4EFE6` | 页面底色（暖纸色） |
| `--color-bg-secondary` | `#FCF9F2` | 卡片、时段卡、票据头 |
| `--color-bg-tertiary` | `#EAE3D6` | 输入框、分段控件轨道、骨架屏 |
| `--color-bg-elevated` | `#FFFEFB` | 弹窗、下拉、底部抽屉 |
| `--color-text-primary` | `#2B2620` | 主文字（暖墨色，非纯黑） |
| `--color-text-secondary` | `#5F574B` | 描述、标签、已完成后的降权文字 |
| `--color-text-muted` | `#7C7160` | 时间戳、占位符（bg-secondary上对比度约4.5:1，只用于≥12px非关键信息） |
| `--color-text-on-accent` | `#FDFAF3` | accent底上的文字 |
| `--color-border-default` | `#DFD6C4` | 默认边框 |
| `--color-border-subtle` | `#ECE5D7` | 弱分隔线 |
| `--color-accent` | `#26428B` | 蓝黑墨水色。主按钮、进行中高亮、完成章、focus ring |
| `--color-accent-hover` | `#1D3470` | accent悬停/按下 |
| `--color-accent-subtle` | `rgba(38,66,139,0.08)` | 进行中卡片底、选中态底 |
| `--color-danger` | `#BA3D23` | 朱红。拖延戳、删除、错误、登录页印章 |
| `--color-danger-hover` | `#9A3018` | danger悬停/按下 |
| `--color-danger-subtle` | `rgba(186,61,35,0.10)` | 拖延戳底色 |
| `--color-warning` | `#9A6B15` | 警告（连接断开横幅） |
| `--color-warning-subtle` | `rgba(154,107,21,0.12)` | 警告横幅底 |
| `--color-success` | `#26428B`（别名accent） | 本产品的成功就是打卡完成，与accent同源，不另引入绿色 |
| `--color-info` | `#26428B`（别名accent） | 中性提示 |

语义约定：墨蓝=正向（完成/进行中/可操作），朱红=负向（拖延/删除/错误），全站唯一，不出现第二种蓝或第二种红表达同一语义。

#### 字体

| 变量 | 值 | 用途 |
|---|---|---|
| `--font-display` | `'LXGW WenKai Screen','PingFang SC','Microsoft YaHei',sans-serif` | 日期大字、任务名、页面标题、印章文字 |
| `--font-body` | 同`--font-display` | 正文与UI标签（文楷屏幕版本身为屏显阅读设计，全站统一一套中文字体，控制加载体积） |
| `--font-mono` | `'IBM Plex Mono',ui-monospace,monospace` | 所有时间、分钟数、进度计数 |

字重规则：文楷只按400使用，标题层级靠字号和颜色拉开，不依赖加粗（楷体加粗观感差且字重文件不全）；需要强调的数字用IBM Plex Mono的600。

#### 字号（沿用design_template阶梯）

`--text-xs:10px`（保留但本项目不使用，中文10px过小）、`--text-sm:12px`（时间戳、拖延戳、辅助标签）、`--text-base:14px`（次级正文、按钮小字）、`--text-lg:16px`（任务名、时段时间、输入框文字，移动端主内容底线）、`--text-xl:20px`（应用名、区域标题）、`--text-2xl:28px`（主视图日期大字）、`--text-3xl:36px`（本期未用，保留）。

#### 间距/圆角/阴影/动效

间距沿用design_template的4px网格全套（`--space-1`到`--space-16`）。本项目常用：页面左右边距`--space-4`（16px，375px屏下取模板区间下限，理由见第6节）、卡片内边距`--space-4`、卡片间距`--space-3`、区块间距`--space-6`。

圆角沿用模板：`--radius-sm:4px`（拖延戳、打孔条方格）、`--radius-md:8px`（按钮、输入框、列表行）、`--radius-lg:12px`（时段卡、票据头）、`--radius-xl:16px`（弹窗）、`--radius-full`（打卡按钮、完成章、头像）。

阴影（暖墨色投影，不用冷灰）：

- `--shadow-sm: 0 1px 2px rgba(43,38,32,0.06)`
- `--shadow-md: 0 2px 8px rgba(43,38,32,0.08)`
- `--shadow-lg: 0 8px 24px rgba(43,38,32,0.14)`

动效沿用模板：`--duration-fast:150ms`、`--duration-normal:250ms`、`--duration-slow:400ms`、`--easing-default:cubic-bezier(0.4,0,0.2,1)`、`--easing-spring:cubic-bezier(0.34,1.56,0.64,1)`。

#### 背景纹理

`bg-primary`上叠一层点阵网格（手册纸感）：`background-image:radial-gradient(rgba(43,38,32,0.06) 1px,transparent 1px); background-size:20px 20px;`。点阵只在页面底层，卡片内部不叠，不与文字重叠。

### 1.4 Tailwind与shadcn接线

分两层：`:root`里的design_template变量是源头，shadcn变量取别名消费。shadcn默认用`hsl(var(--x))`包装，初始化后改为直接引用（`tailwind.config`的颜色值写成`var(--color-x)`原样字符串），避免hex转HSL三元组的无谓折腾。

| shadcn变量 | 取值 |
|---|---|
| `--background` | `var(--color-bg-primary)` |
| `--foreground` | `var(--color-text-primary)` |
| `--card` / `--popover` | `var(--color-bg-secondary)` / `var(--color-bg-elevated)` |
| `--primary` / `--primary-foreground` | `var(--color-accent)` / `var(--color-text-on-accent)` |
| `--secondary` / `--muted` | `var(--color-bg-tertiary)` |
| `--muted-foreground` | `var(--color-text-muted)` |
| `--destructive` | `var(--color-danger)` |
| `--border` / `--input` | `var(--color-border-default)` |
| `--ring` | `var(--color-accent)` |
| `--radius` | `8px` |

`tailwind.config`的`fontFamily`扩展三个key：`display`、`body`、`mono`，分别指向三个字体变量。断点用Tailwind默认（md:768 / lg:1024），设计按375/768/1024三档出。

---

## 2. 信息层级方案

主视图（核心页面）：

- **第一层级**：当前时间所在时段卡（进行中高亮，`--color-accent`边框+`--color-accent-subtle`底）；对方的「拖延N分钟」戳（`--color-danger`系）；我的打卡按钮。这三样是用户打开页面3秒内要看到的。
- **第二层级**：今天日期（`--text-2xl`+`--font-display`）、双方打孔条进度、其余时段卡（时间`--text-lg` mono+任务名`--text-lg`）、我的/TA的分段切换。
- **第三层级**：打卡时间戳、照片缩略图、备注（`--text-sm`+`--color-text-muted/secondary`）、模板入口、头像菜单。

登录页第一层级是印章标识+表单，模板页第一层级是工作日/周末切换+时段行。

层级靠字号（28/16/12三档）、字体（文楷大字vs mono数据）、颜色（primary/secondary/muted三档）三者配合，不靠单一维度。

---

## 3. 布局结构

### 3.1 主视图 `/`（375px）

单栏纵向流，我的/TA的用分段控件切换，另配一条常驻的对方摘要条保证监督信息不丢。选切换不选上下堆叠的理由：单人一天6个时段的卡片列表已超一屏，堆叠会让对方信息沉到两屏之外，摘要条+角标能把压力信号顶在首屏。

```
┌─────────────────────────────────┐
│ 票据头 DateTicket                │ bg-secondary, radius-lg, shadow-md
│  7月14日  周二        [模板][头像] │ 28px display + 16px secondary
│  ┄┄┄┄┄┄┄ 打孔虚线 ┄┄┄┄┄┄┄        │ 两端半圆缺口+1px dashed
│  今日  ■■□▣□□  3/6               │ 打孔条 + mono计数
├─────────────────────────────────┤ space-4
│ ┌────────────┬────────────┐     │ 分段控件 SegmentedTabs
│ │  我的 ●     │   TA的 ⦿   │     │ 高48, 轨道bg-tertiary
│ └────────────┴────────────┘     │
├─────────────────────────────────┤ space-3
│ ▸ TA摘要条: 头像 小北 ■■□□ 拖延12分钟│ 高56, 可点切tab
├─────────────────────────────────┤ space-3
│ ┌─────────────────────────┐     │
│ │ 08:00–09:00        ( )  │     │ 时段卡 SlotCard
│ │ 背英语单词               │     │ 卡间距 space-3
│ └─────────────────────────┘     │
│ ┌─────────────────────────┐     │
│ │ 09:00–10:30 [进行中]  (○)│     │ 当前时段: accent边框
│ │ 跑步                     │     │ + accent-subtle底
│ └─────────────────────────┘     │
│ ┌─────────────────────────┐     │
│ │ 07:00–07:30       ⊛已完成│     │ 完成: 盖章+文字降权
│ │ 晨读            07:32打卡 │     │
│ └─────────────────────────┘     │
│ ╭┄┄┄┄┄ ＋ 添加时段 ┄┄┄┄┄╮      │ 虚线行, 仅我的tab
├─────────────────────────────────┤
│ (页面底部安全区留白 space-8)      │
└─────────────────────────────────┘
```

页面左右边距`--space-4`，内容宽343px。时段按开始时间升序排列。当天无任何时段时列表位置放空状态（见4.13）。

### 3.2 主视图桌面端（≥768px）

内容区`max-width:960px`居中，票据头横贯顶部，下方双栏并列各占1/2，栏间距`--space-6`。分段控件和摘要条隐藏，每栏顶部换成栏头（头像24px+名字`--text-base`+打孔条+计数）。左栏固定是我的，右栏是TA的。1024px以上不再变化。

### 3.3 登录页 `/login`（375px）

```
┌─────────────────────────────────┐
│                                 │
│            ┌──────┐             │ 72px方形朱红印章
│            │ 打 卡 │             │ 内嵌1.5px纸色描边
│            └──────┘             │ 旋转-4°
│           双人打卡               │ text-xl display
│      你的拖延，TA看得见           │ text-sm secondary
│                                 │ space-10
│   邮箱                          │ label 12px 可见
│   ┌─────────────────────────┐   │ 输入框 h48
│   └─────────────────────────┘   │
│   密码                          │
│   ┌─────────────────────────┐   │
│   └─────────────────────────┘   │
│   (⚠ 邮箱或密码不对)             │ 表单级错误, danger+图标
│   ┌─────────────────────────┐   │
│   │         进入             │   │ 主按钮 h48
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

垂直居中偏上（顶部留出约20vh），表单列宽`min(343px,90vw)`。桌面端不变，整列居中。

### 3.4 模板编辑页 `/template`（375px）

```
┌─────────────────────────────────┐
│ [←]  我的模板                    │ 顶栏 h56, 返回到 /
├─────────────────────────────────┤
│ ┌────────────┬────────────┐     │ 分段控件 工作日/周末
│ └────────────┴────────────┘     │
│ 改模板影响之后的日子，今天的安排回首页改 │ text-sm muted
├─────────────────────────────────┤ space-4
│ ┌─────────────────────────┐     │ 模板时段行 h56
│ │ 08:00–09:00  背英语单词 ✎ │     │ 行间距 space-2
│ └─────────────────────────┘     │
│ ┌─────────────────────────┐     │
│ │ 09:00–10:30  跑步      ✎ │     │
│ └─────────────────────────┘     │
│ ╭┄┄┄┄┄ ＋ 添加时段 ┄┄┄┄┄╮      │
└─────────────────────────────────┘
```

桌面端`max-width:560px`居中。返回按钮44×44可点区。编辑即时保存（每次抽屉里点保存就写库），无整页保存按钮。

---

## 4. 组件规格清单

通用规则：所有可交互元素`focus-visible`时显示2px `--color-accent` ring、offset 2px；移动端可点目标≥44×44px、相邻间距≥8px；hover态仅桌面端生效，移动端以active态代替。

### 4.1 DateTicket 票据头（新增）

- 容器：`bg-secondary`、`radius-lg`、`shadow-md`、内边距`space-4`
- 行1：日期「7月14日」`text-2xl` display `text-primary`，同行基线「周二」`text-lg` `text-secondary`左距`space-2`；右侧两个40×40图标钮（模板入口NotebookPen图标20px `text-secondary`，头像32px圆形开DropdownMenu含「退出登录」一项）
- 打孔分隔：行1与行2之间1px dashed `--color-border-default`，两端各一个12px圆形缺口（伪元素画`bg-primary`色圆盖在边框上），上下留`space-3`
- 行2：「今日」`text-sm` `text-muted`+我的打孔条（见4.3）+计数「3/6」`text-base` mono 600 `text-primary`右对齐
- 状态：静态组件，图标钮四态见4.15图标按钮通用规格

### 4.2 SegmentedTabs 分段切换（shadcn Tabs变体）

- 轨道：`bg-tertiary`、`radius-md`、内边距`space-1`、总高48
- 两个触发钮各占50%、高40、`radius-md`减2px（6px）、文字「我的」「TA的」`text-base`
- 选中：`bg-secondary`+`shadow-sm`+`text-primary`；未选中：透明底+`text-secondary`
- 切换过渡：选中底块位移`--duration-normal` `--easing-default`
- TA的tab角标：TA当前有拖延时段时，文字右上角6px `--color-danger`实心圆点（信息不单靠圆点，摘要条同步有文字）
- 四态：hover未选中项文字变`text-primary`；active按下轻微`scale(0.98)`；disabled不出现

### 4.3 PunchStrip 打孔条（新增）

- 一排小方格代表当天时段（按时间序）：12×12px、`radius-sm`、间隔8px；票据头用12px，摘要条/桌面栏头用10px
- 格子状态：未开始=1.5px `--color-border-default`描边空心；已完成=`--color-accent`实心；已拖延未完成=`--color-danger`实心；进行中=1.5px `--color-accent`描边+脉冲（opacity 1→0.4→1循环2s）
- 超过12格时格子缩到8px；纯展示组件无交互态

### 4.4 PeerSummaryBar 对方摘要条（新增，仅移动端）

- 容器：高56、`bg-secondary`、`radius-md`、`shadow-sm`、内边距`space-3` `space-4`、整条可点（点击切到对方tab）
- 内容：头像28px+名字`text-base` display+打孔条(10px格)+右侧状态文字+ChevronRight 16px `text-muted`
- 状态文字（优先级从高到低取一条）：
  - 有超时未完成时段：「拖延23分钟」`text-sm`，样式同DelayTag文字色，配Clock图标14px，分钟数mono
  - 当前时段进行中：「正在做·跑步」`text-sm` `text-secondary`，任务名超长截断
  - 全部完成：「今日全勤」`text-sm` `--color-accent`配Check图标
  - 无时段：「还没安排」`text-sm` `text-muted`
- 四态：默认如上；hover `bg-elevated`；active `bg-tertiary`；disabled不出现。过渡`--duration-fast`

### 4.5 SlotCard 时段卡（新增，核心组件，我的/TA的两个variant）

共同结构：`bg-secondary`、`radius-lg`、`shadow-sm`、内边距`space-4`、最小高度80。左侧内容列+右侧动作区（宽56，垂直居中）。

- 行1：时间「08:00–09:00」`text-lg` mono 600 `text-primary`；进行中时右接StatusPill（4.6）；拖延时右接DelayTag（4.7）
- 行2：任务名`text-lg` display `text-primary`，距行1 `space-1`，单行截断（`truncate`），最长显示约14个汉字
- 行3（条件出现，距行2 `space-2`）：打卡时间「07:32打卡」`text-sm` mono `text-muted`；照片缩略图40×40 `radius-sm`（4.11）；备注`text-sm` `text-secondary`单行截断（增强阶段字段，有则显示）

四种状态（我的variant）：

| 状态 | 卡片 | 右侧动作区 | 文字 |
|---|---|---|---|
| 未开始 | 默认样式 | CheckButton空心（4.8） | 全部`text-primary` |
| 进行中 | 1.5px `--color-accent`边框+`--color-accent-subtle`底 | CheckButton描边变accent 2px | 时间变`--color-accent`，加StatusPill |
| 已完成 | 默认样式 | CompletionStamp盖章（4.9） | 时间和任务名降为`text-secondary`，行3显示打卡时间 |
| 已拖延 | 默认样式+左侧3px `--color-danger`内嵌条（`border-left`） | CheckButton空心（仍可补卡） | 加DelayTag |

TA的variant差异：无CheckButton；已完成显示盖章（不可点）；卡片整体不可点，仅照片缩略图可点开大图；已拖延状态DelayTag同规格。

我的卡片交互：点击右侧动作区=打卡（见5.2）；点击卡片其余区域=打开SlotEditorSheet编辑；active态卡片`bg-elevated`闪一下（`--duration-fast`）。

状态判定口径（与第7节待决策项1联动）：未开始=now<start；进行中=start≤now<end且未打卡；已拖延=now≥end且未打卡，拖延分钟=now−end；已完成=done。拖延显示格式：<60分钟「拖延23分钟」，≥60分钟「拖延1小时23分」，数字mono。

### 4.6 StatusPill 进行中标签（新增）

- `--color-accent`实心底、`--color-text-on-accent`文字「进行中」`text-sm`、内边距2px 8px、`radius-full`
- 左侧6px同色系脉冲圆点（`--color-text-on-accent`，opacity循环同4.3）
- 纯展示；`prefers-reduced-motion`时圆点静止

### 4.7 DelayTag 拖延戳（新增，产品记忆点）

- inline-flex：Clock图标12px+「拖延23分钟」文字`text-sm`（数字mono 600）
- 底`--color-danger-subtle`、文字`--color-danger`、1px dashed `rgba(186,61,35,0.45)`边框、`radius-sm`、内边距2px 8px、整体`rotate(-2deg)`（逾期章的歪斜感）
- 显眼不刺眼的分寸：只用subtle底不用实心底，面积不超过一行小字，卡片本体不变红（仅左侧3px嵌条呼应）
- 分钟数每分钟tick更新，数字变化时旧数字fade out新数字fade in各`--duration-fast`，无位移
- 图标+文字双通道，不单靠颜色传达；纯展示无交互态

### 4.8 CheckButton 打卡按钮（新增）

- 44×44圆形、1.5px `--color-border-default`描边、`bg-secondary`底、内部Check图标20px `text-muted`
- 四态：默认如上；hover描边和图标变`--color-accent`（`--duration-fast`）；active `scale(0.92)`；disabled（写库进行中防重复点击）opacity 0.5不可点
- 进行中时段上的变体：描边2px `--color-accent`、图标`--color-accent`
- 点击触发盖章流程（5.2），成功后原地被CompletionStamp替换

### 4.9 CompletionStamp 完成章（新增，爽点组件）

- 64px圆形、透明底、双圈描边（外圈2px `--color-accent`、内圈1px同色内缩4px）、整体`rotate(-8deg)`、opacity 0.9
- 内容三行居中：Check图标14px、「已完成」11px display、打卡时间10px mono，全部`--color-accent`
- 位置：占据卡片右侧动作区，允许上缘溢出卡片2px（盖章压线感），溢出部分不遮任何文字
- 入场动画见5.2；TA的卡片上收到realtime推送时以同一动画入场
- 我的章可点（44px有效区达标）：点击弹Popover「取消这次打卡？」+「取消打卡」`--color-danger`文字钮+「留着」默认钮
- 四态：默认如上；hover opacity 1；active `scale(0.96)`；disabled不出现

### 4.10 AddSlotRow 添加时段行（新增，主视图与模板页共用）

- 高52、1.5px dashed `--color-border-default`边框、`radius-lg`、透明底、居中文字「＋ 添加时段」`text-base` `text-secondary`
- 四态：hover边框和文字变`--color-accent`；active `bg-accent-subtle`；disabled不出现；过渡`--duration-fast`
- 点击打开空白SlotEditorSheet

### 4.11 PhotoThumb与PhotoDialog（复用shadcn Dialog，增强阶段）

- 缩略图40×40、`radius-sm`、object-cover；上传中：同尺寸`bg-tertiary`脉冲块；上传失败：同尺寸`--color-danger-subtle`底+RefreshCw图标16px `--color-danger`，点击重试
- 点缩略图开Dialog：`bg-elevated`、`radius-xl`、`shadow-lg`，图片最大80vh等比，下方一行「跑步·10:02」`text-sm` `text-secondary`（时间mono），右上40×40关闭钮
- Dialog出入场：中心`scale(0.95→1)`+fade，`--duration-slow`入`--duration-normal`出，`--easing-default`

### 4.12 SlotEditorSheet 时段编辑抽屉（复用shadcn Drawer，主视图与模板页共用）

- 底部抽屉：`bg-elevated`、顶部`radius-xl`、`shadow-lg`、内边距`space-4`、顶部居中32×4px `bg-tertiary`拖动条
- 标题「添加时段」/「编辑时段」`text-lg` display，距拖动条`space-4`
- 字段（间距`space-4`）：
  - 任务名：label「任务名」`text-sm` `text-secondary`可见（不用placeholder代替），输入框h44、`bg-tertiary`底、`radius-md`、无边框、文字`text-lg`、focus时2px accent ring；maxlength 20，右下角计数「3/20」`text-sm` `text-muted`；必填，label后缀`--color-danger`星号
  - 时间行：「开始」「结束」两个字段并排各占一半间隔`space-3`，native `type="time"` step 300、h44、mono `text-lg`，其余同上；均必填
- 校验：失焦校验不逐字符报错；错误就近显示在字段下方，`text-sm` `--color-danger`+CircleAlert图标14px+字段边框变1.5px `--color-danger`。规则：任务名非空；结束>开始（报「结束要晚于开始」）
- 按钮区（距字段`space-6`）：「保存」主按钮h48全宽（4.15）；编辑模式追加「删除这个时段」文字钮`text-base` `--color-danger`居中、上距`space-3`，点击弹shadcn AlertDialog「删了今天就没有这条了」确认（模板页文案「删了之后的日子都没有这条了」），确认钮`--color-danger`实心
- 抽屉出入场：上滑入`--duration-slow`、下滑出`--duration-normal`、`--easing-default`；遮罩`rgba(43,38,32,0.4)`

### 4.13 EmptyState 空状态（新增）

- 我的列表空：CalendarX2图标48px `text-muted`、「今天还没有安排」`text-base` `text-secondary`、下方两钮并排：「添加一个时段」主按钮h44+「去编辑模板」次级按钮h44（4.15），垂直居中于列表区，元素间距`space-3`
- TA的列表空：图标+「TA今天还没安排时段」`text-base` `text-muted`，无按钮
- 模板空：「这份模板还是空的」+AddSlotRow

### 4.14 Skeleton 加载骨架（复用shadcn Skeleton）

- 首屏数据未到时：票据头位置一块高96、列表位置三块高80的`bg-tertiary` `radius-lg`块，脉冲动画（opacity 0.5→1循环1.5s）
- 不用旋转图标；realtime重连横幅见4.16

### 4.15 按钮通用规格（复用shadcn Button定制）

- 主按钮：`--color-accent`底、`--color-text-on-accent`文字`text-lg`、`radius-md`、h48（表单）/h44（空状态）；hover `--color-accent-hover`；active `--color-accent-hover`+`scale(0.98)`；disabled `bg-tertiary`底`text-muted`文字；loading态文字换「保存中…」+opacity脉冲，不用菊花
- 次级按钮：透明底、1.5px `--color-border-default`边框、`text-primary`文字；hover边框变accent；active `bg-accent-subtle`；disabled同上
- 图标按钮：40×40（票据头内，视觉40实际点击区补到44）、`radius-md`、透明底；hover `bg-tertiary`；active `bg-tertiary`+`scale(0.92)`；图标20px `text-secondary`
- 所有过渡`--duration-fast` `--easing-default`

### 4.16 Toast与连接横幅（复用shadcn Sonner/自定义横幅）

- Toast：底部弹出（避开抽屉冲突时自动上移）、`bg-elevated`、`radius-md`、`shadow-lg`、`text-base` `text-primary`、左侧语义图标16px（成功Check accent色/失败CircleAlert danger色）、持续3s；可带一个文字action「传照片」/「重试」`--color-accent`
- 出入场：上滑入fade，`--duration-normal`入`--duration-fast`出
- 连接横幅：realtime断开超10s时票据头下方插入高36横幅，`--color-warning-subtle`底、`--color-warning`文字「连接断了，正在重连…」`text-sm`+WifiOff图标14px；恢复后自动收起（高度过渡`--duration-normal`）

### 4.17 TemplateSlotRow 模板时段行（新增）

- 高56、`bg-secondary`、`radius-md`、`shadow-sm`、内边距`space-3` `space-4`、行距`space-2`
- 布局：时间「08:00–09:00」`text-base` mono 600固定宽110px左对齐+任务名`text-lg` display弹性宽单行截断+Pencil图标18px `text-muted`右侧
- 整行可点开SlotEditorSheet；四态：hover `bg-elevated`；active `bg-tertiary`；disabled不出现

### 4.18 LoginForm（复用shadcn Form/Input/Button）

- 印章标识：72px方形、`--color-danger`实心底、`radius-md`、内缩4px处1.5px `--color-text-on-accent`描边、「打卡」两字竖排各24px display `--color-text-on-accent`、整体`rotate(-4deg)`、`shadow-md`。此处朱红为品牌装饰用法，仅登录页出现（传统印泥色，理由见第6节）
- 应用名「双人打卡」`text-xl` display、副标「你的拖延，TA看得见」`text-sm` `text-secondary`
- 输入框规格同4.12，h48；label可见；邮箱失焦校验格式（「邮箱格式不对」），密码非空
- 提交失败（表单级）：按钮上方显示CircleAlert图标+「邮箱或密码不对」`text-sm` `--color-danger`，同时两个输入框边框变danger；提交中按钮进loading态
- 登录成功直接跳`/`，无过场页

---

## 5. 交互与动效规范

全部动效尊重`prefers-reduced-motion`：开启时弹性/位移动画降级为纯opacity fade（`--duration-fast`），脉冲动画静止。

### 5.1 页面入场

主视图列表卡片首次渲染：依次`translateY(8px)`+fade in，`--duration-normal` `--easing-default`，交错延迟60ms，最多前8张参与交错（之后的直接显示）。票据头先于列表出现（无延迟）。tab切换时列表内容平移淡入淡出`--duration-normal`，不重复交错。

### 5.2 打卡盖章（核心爽点，高冲击时刻）

1. 点击CheckButton：按钮`scale(0.92)` `--duration-fast`，立即乐观更新本地状态
2. CompletionStamp入场：`scale(1.5)→1`+`rotate(-14deg)→rotate(-8deg)`+opacity 0→0.9，`--duration-slow` `--easing-spring`（落章的顿挫感）
3. 同时卡片底色闪一次`--color-accent-subtle`（`--duration-normal`后渐回）
4. 票据头打孔条对应格子从空心填充为accent实心，`--duration-normal`
5. Toast「已打卡·10:02」+action「传照片」（照片为增强阶段，MVP不带action）
6. 写库失败：状态回滚（章fade out `--duration-fast`），Toast「打卡没同步上」+action「重试」

### 5.3 Realtime对方动态

收到对方day_plan的UPDATE推送：变化的时段卡底色闪一次`--color-accent-subtle`（`--duration-slow`），若是打卡完成则盖章动画同5.2步骤2执行。摘要条与打孔条同步更新。让「亲眼看到TA盖章」成为监督的正反馈。

### 5.4 拖延计时

前端每分钟tick一次：重算双方所有时段状态；DelayTag数字更新用双fade（4.7）；某时段刚跨过end_time时，DelayTag以`scale(0.8)→1`+fade入场，`--duration-normal` `--easing-spring`。摘要条状态文字变化用fade切换`--duration-fast`。

### 5.5 增删改时段

抽屉出入场按4.12。保存成功后：新增的卡片以`translateY(8px)`+fade插入列表对应时间位置（`--duration-normal`），删除的卡片高度塌缩+fade out（`--duration-normal`）；Toast「已保存」/「已删除」。

### 5.6 状态切换总则

一切可见性变化（横幅、错误提示、行3元信息出现）都有过渡：进场`--duration-normal`出场`--duration-fast`，`--easing-default`，禁止瞬间出现消失。

---

## 6. 设计依据

Design Thinking四问：

- **Purpose**：两个朋友互相监督每日时段打卡。高频、碎片时间、手机打开看一眼：我现在该干嘛、TA做完没、TA拖了多久。界面要在3秒内回答这三个问题。
- **Tone**：打卡钟与印章（industrial punch-clock+文具印章的混合体，暖纸底、墨水蓝、印泥红）。不走绿色habit-tracker俗路。
- **Constraints**：Tailwind+shadcn/ui可实现；375px优先；中文文案；Supabase realtime推送驱动的状态变化要有动画承接；两人自用项目，字体加载体积可放宽但仍用分包加载。
- **Differentiation**：完成打卡=盖一枚弹性落下的墨蓝圆章，对方拖延=一枚歪斜的朱红虚线戳。一个奖赏一个施压，两枚章就是产品的全部情绪，别的打卡应用没有这个记忆点。

关键决策的为什么：

- 暖纸底+点阵网格：frontend-design背景原则（不用纯色平底），同时避开habit类产品的白底绿卡俗套
- IBM Plex Mono做全部数字：frontend-design字体原则（有性格的字体+语境契合），打孔卡血统呼应「打卡」词源；时间是本产品密度最高的数据，等宽保证纵向对齐
- LXGW WenKai Screen做中文：避开Inter/Roboto式的无性格默认（中文语境即Noto Sans SC），楷体的手账感贴合两人自用的亲密语境；屏幕版为屏显优化可当正文使用
- 完成用墨蓝章而非绿色：色相预算控制在3个以内（本方案禁止事项），且中文语境里蓝章=办讫/核销，文化直觉成立；success语义色别名到accent并在token表注明，避免两种正向色打架
- 拖延戳用subtle底+小面积：需求要求显眼但不刺眼；显眼靠色相对比（全页唯一暖红）和歪斜旋转，不靠面积和实心底
- 移动端tab切换而非上下堆叠：单人列表已超一屏，堆叠让监督信息沉底；摘要条+tab角标保证对方的拖延状态常驻首屏（Purpose第三问）
- 页面边距用space-4低于模板建议的space-6：375px下24px双边吃掉13%宽度，卡片内还有二层内边距；16px是移动端通行值，仍在token体系内
- 打卡按钮44px、盖章可点区64px：工程底线触控条款
- 任务名和时间用16px（text-lg）：工程底线「正文移动端≥16px」条款，14px只用于次级信息
- 错误提示图标+边框+文字三通道：工程底线「颜色不作唯一信息载体」和本方案禁止事项「错误不只用红字」
- 登录页印章用朱红：印泥的文化默认色，蓝色印章标识不成立；它是纯装饰不承载语义，且登录页无任何danger场景，不会产生歧义

## 7. 待决策项

1. **拖延的计算起点**：规划文档伪代码从start_time起算（时段一开始没打卡就算拖延），本方案按四状态模型从end_time起算（时段结束还没打卡才算拖延，进行中不算）。理由：勾选发生在做完之后，从start起算会在正常做事时就被标拖延，惩罚失真。这是产品规则分歧不是视觉分歧，实现前要拍板，方案默认end_time口径。
2. **产品名**：方案用占位名「双人打卡」，印章字样「打卡」。如果要更有记忆点的名字（比如「盯卡」这类），登录页应用名和印章文字同步换，其余不受影响。
3. **中文字体体积**：LXGW WenKai Screen走unicode-range分包按需加载，首屏实际请求约几百KB。如果两人网络环境差想再省，降级方案是Noto Sans SC（同为分包加载），全套字号字重规格不变，只换`--font-display/--font-body`的值，代价是失去手账感。
4. **取消打卡**：规划未提及，方案按可撤销出了规格（点章弹确认）。若产品上想让打卡不可反悔（强化仪式感），删掉4.9的点击行为即可。
5. **时段重叠**：编辑器只校验结束>开始，允许两个时段时间重叠（有人真的会边听课边跑步的安排法）。若要禁止重叠，需在4.12追加校验规则「和XX时段撞了」。

## 8. 给code-writer的交付说明

**扫描来源**：`D:\.Project\20260714-shared-checkin\`（零代码）、项目CLAUDE.md（技术栈/目录/禁止清单）、规划文档`quizzical-watching-backus.md`（数据模型/页面结构）、`design_template.md`（token结构）、`ui_engineering_baseline.md`（逐条对照完毕）。

**复用**：shadcn的Tabs/Drawer/Dialog/AlertDialog/DropdownMenu/Button/Input/Skeleton/Sonner，按1.4的变量接线表定制主题。**新增组件**（放`components/`，PascalCase）：DateTicket、PunchStrip、PeerSummaryBar、SlotCard、StatusPill、DelayTag、CheckButton、CompletionStamp、AddSlotRow、SlotEditorSheet、EmptyState、TemplateSlotRow。SlotCard做`variant: mine | peer`，SlotEditorSheet做`mode: add | edit`+`target: today | template`。

**采纳的frontend-design方向**：字体=LXGW WenKai Screen+IBM Plex Mono；配色=暖纸底+蓝黑墨水+印泥朱红；运动=盖章spring入场这一个高冲击时刻+列表交错入场，其余动效克制；空间=票据头打孔线、印章压线溢出、拖延戳歪斜这三处打破规整；背景=点阵网格纸纹理。

**反AI套路自检**：字体未用Inter/Roboto/系统默认；无紫色渐变无白底俗套；布局非三等分卡/数字大屏模板；打卡钟+印章的隐喻只属于「打卡」这个题材，外人看截图猜不到是habit tracker品类的默认样子。项目一致性六查通过：去色后层级靠字号字体成立；同类元素规格统一（两处AddSlotRow、两处抽屉同规格）；色相3个；留白按4px网格。

**实施注意**：

1. shadcn初始化后把`tailwind.config`颜色值从`hsl(var(--x))`改成直接`var(--color-x)`，变量按1.3定义、1.4接线，全项目不写裸hex
2. 字体加载：`lxgw-wenkai-screen-webfont` npm包（自带unicode-range分包css）；IBM Plex Mono走`next/font/google`，weight取400/600
3. 文楷不用600/700字重，避免合成加粗；强调靠字号颜色
4. 拖延计算前端每分钟tick，跨天（本地日期变化）时重新拉当天day_plan并重建订阅
5. 盖章动画transform-origin设为center，`--easing-spring`只用于scale/rotate不用于opacity
6. `prefers-reduced-motion`全局处理，见第5节总则
7. 项目禁止清单生效：交互反馈一律toast/dialog不用alert/confirm；打卡不改slot id
8. 时间显示格式统一「HH:mm–HH:mm」（en dash），拖延时长格式见4.5
