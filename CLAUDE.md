# CLAUDE.md - 两人共享打卡网页

## 项目定位

Next.js + Supabase 的两人协作打卡 Web App。核心是"实时同步"和"社交监督"：一方打卡对方 1 秒内看到，某时段超时未完成对方界面上会显示拖延时长。

## 技术栈

- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase（Postgres + Auth + Realtime + Storage）
- Vercel 部署

## 目录结构

```
20260714-shared-checkin/
├── app/                  Next.js App Router 页面
│   ├── login/            登录页
│   ├── template/         模板编辑页
│   └── page.tsx          主视图（今天双栏时段表）
├── components/           共享组件
├── lib/
│   ├── supabase.ts       Supabase 客户端
│   └── types.ts          共享类型（Slot、DayPlan、Template）
├── supabase/
│   └── schema.sql        建表和 RLS policy 的 SQL（导入 Supabase）
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

`day_plans` 表开 Realtime，前端订阅当天 `date=eq.YYYY-MM-DD` 过滤的 UPDATE 事件。任何一方打卡或改 slot，另一方立即拿到新 payload 更新 UI。

## 禁止清单

- 禁止把 Supabase service_role key 塞进前端代码或环境变量
- 禁止在代码里明文写测试账号密码（都存在 Supabase Auth，登录页让用户输）
- 禁止用 alert/confirm 做交互反馈（用 shadcn/ui 的 toast/dialog）
- 禁止破坏 slot id 的稳定性（打卡后不改 id）
- 禁止在 day_plans 里存 template 引用（day_plan 拷贝一份 slots 独立存在，模板改了不影响当天已生成的 plan）

## 部署账号（用户填）

- Supabase 项目名：（待填）
- Supabase URL：（待填，形如 https://xxx.supabase.co）
- Vercel 项目名：（待填）
- 线上 URL：（待填，形如 xxx.vercel.app）

## 历次踩坑

- **Next.js CLI在这台机器上跑telemetry会报EXDEV跨盘符rename错误**：`next dev`/`next build`/`next telemetry disable`只要涉及写`C:\Users\刘丹\AppData\Roaming\nextjs-nodejs\Config\config.json`就崩，报`EXDEV: cross-device link not permitted`。原因未查（大概率AppData\Roaming被重定向到了别的卷）。解决：package.json的dev/build/start脚本都用`cross-env NEXT_TELEMETRY_DISABLED=1`包一层，跳过整个telemetry写入路径。禁止依赖`next telemetry disable`命令本身，它也会触发同样的崩溃
