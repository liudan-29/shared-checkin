# 两人共享打卡网页

## 这是干嘛的

我和朋友一起做每日打卡互相监督。两人各自登录，能实时看到对方今天的时段规划和完成情况。对方超时未打卡，我这边会显示"拖延 N 分钟"，用社交可见性驱动。

## 怎么跑

依赖：Node.js 18+、npm、一个 Supabase 云端项目

```
npm install
cp .env.example .env.local
# 把 .env.local 里的 SUPABASE_URL 和 SUPABASE_ANON_KEY 换成自己的
npm run dev
```

首次使用需要在 Supabase Dashboard 的 SQL Editor 里整份跑一遍 `supabase/schema.sql`。

浏览器打开 http://localhost:3000，用两个 Supabase 里预建的账号登录。

## 部署

推到 GitHub，Vercel 连仓库，配环境变量（SUPABASE_URL、SUPABASE_ANON_KEY），自动部署。线上 URL 是 xxx.vercel.app。

## 备注

- Supabase 项目 7 天不活跃会暂停，每周至少访问一次
- 时区假设两人同时区，代码里都用本地时间
- 照片上传是可选项，不传也能打卡
- 详细规划见 `C:\Users\刘丹\.claude\plans\quizzical-watching-backus.md`
