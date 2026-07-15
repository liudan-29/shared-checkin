# 两人共享打卡网页

## 这是干嘛的

我和朋友一起做每日打卡互相监督。两人各自登录，能实时看到对方今天的时段规划和完成情况。对方超时未打卡，我这边会显示"拖延 N 分钟"，用社交可见性驱动。

功能：
- 今天的时段：勾选打卡，可选写一句备注（"做了什么"），随时能改
- 对方实时同步：对方打卡的瞬间，我这边不用刷新就能看到
- 历史/未来日期：顶部导航行前后翻天，也可以点日期文字弹出日历直接跳转任意一天（过去180天、未来90天内）。过去只读（看当天实际记录，不能补卡）；未来只预览当天模板会生成的安排（不能提前打卡）；只有"今天"能操作
- 每日总结：任意一天都能点开，看两人的完成率/完成数/拖延次数/拖延时长对比，加一条合并的备注时间线
- 时段模板：工作日、周末各一份，每天的实际安排默认从模板生成，当天可再调整
- PDCA周期目标（`/weekly`页面）：按周设目标（整体完成率或某个具体任务），周报页面对比两人的完成情况和目标达成状态，写一段周复盘，能把自己这部分生成一张图片下载/分享到App外部

## 怎么跑（本地开发）

依赖：Node.js 18+、npm、一个 Supabase 云端项目

```
npm install
cp .env.example .env.local
# 把 .env.local 里的 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 换成自己的
npm run dev
```

首次使用需要在 Supabase Dashboard 的 SQL Editor 里整份跑一遍 `supabase/schema.sql`，并在 Authentication → Users 里手动建两个账号（勾 Auto Confirm User）。

浏览器打开 http://localhost:3000，用这两个账号登录。

## 部署（GitHub Pages，不是Vercel）

最初打算部署到Vercel，但注册时撞上它的风控验证（国内网络环境常见），申诉走不通，改用GitHub Pages部署纯静态导出。

线上地址：**https://liudan-29.github.io/shared-checkin/**

更新代码后重新部署：

```
bash scripts/deploy-pages.sh
```

这个脚本会跑 `npm run build:pages`（静态导出到 `out/`），然后把 `out/` 强推到 `gh-pages` 分支。GitHub Pages 检测到分支更新后自动重新构建，一两分钟后生效。

环境变量（`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`）在静态导出时直接打包进产物里，不需要在GitHub Pages单独配置。

仓库是**公开**的（GitHub Pages免费版要求公开仓库才能用）。代码里没有任何密码或私密凭证，`anon key`本身就是设计给前端公开使用的，真正的数据权限由Supabase的RLS策略控制，公开代码不影响安全性。

## 备注

- Supabase 项目 7 天不活跃会暂停，每周至少访问一次
- 时区假设两人同时区，代码里都用本地时间
- 照片上传是可选项，不传也能打卡（目前还没实现照片上传，`photo_url`字段先占位）
- 详细规划见 `C:\Users\刘丹\.claude\plans\quizzical-watching-backus.md`
- 工作日志见本目录 `WORKLOG.md`，踩过的坑和历次决策都记在里面
