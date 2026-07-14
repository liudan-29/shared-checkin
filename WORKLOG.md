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
