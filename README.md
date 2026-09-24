# 三人共享打卡网页

## 这是干嘛的

三位固定成员一起做每日打卡互相监督。每个人各自登录，能实时看到另外两个人今天的时段规划和完成情况。有人超时未打卡，另外两人会看到拖延时长。

功能：
- 今天的时段：勾选打卡，可选写一句备注（"做了什么"），随时能改。保存时如果备注非空，会问一句要不要把这条记录发布到留言板
- 三人实时同步：任何成员打卡，另外两人的页面不用刷新就能看到
- 历史/未来日期：顶部导航行前后翻天，也可以点日期文字弹出日历直接跳转任意一天（过去180天、未来90天内）。过去只读（看当天实际记录，不能补卡）；未来只预览当天模板会生成的安排（不能提前打卡）；只有"今天"能操作
- 每日总结：任意一天都能点开，看三人的完成率/完成数/拖延次数/拖延时长对比，加一条合并的备注时间线
- 时段模板：工作日、周末各一份，每天的实际安排默认从模板生成，当天可再调整。改完模板可以点"同步到今天"，勾选想加进今天计划的时段（今天已有的默认不勾），只会往今天的安排里加，不会删掉已有或已打卡的时段
- 留言板：主视图固定有一条留言区，三位成员可以随时写一句鼓励的话（不跟打卡挂钩），最近20条留言会不定时飘过屏幕，两条轨道同时运作；留言只对小组内三人公开并实时同步，能查看历史并删除自己发过的留言

## 怎么跑（本地开发）

依赖：Node.js 18+、npm、一个 Supabase 云端项目

```
npm install
cp .env.example .env.local
# 把 .env.local 里的 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 换成自己的
npm run dev
```

全新数据库首次使用时，在Supabase Dashboard的SQL Editor里运行`supabase/schema.sql`。从双人版升级时，先在Authentication→Users里建好第三个账号，再把`supabase/migrations/20260924_three_person_groups.sql`中的三个邮箱替换为真实邮箱并整份执行。

浏览器打开http://localhost:3000，用三位成员各自的账号登录。

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
- 时区假设三人同时区，代码里都用本地时间
- 照片上传是可选项，不传也能打卡（目前还没实现照片上传，`photo_url`字段先占位）
- 本次三人版验收标准见`docs/pm-20260924-three-person-group-ac.md`
- 工作日志见本目录 `WORKLOG.md`，踩过的坑和历次决策都记在里面
