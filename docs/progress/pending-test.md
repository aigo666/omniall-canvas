---
title: 待测试
description: 当前版本已实现但仍需人工验证的变更项
---

# 待测试

- 3D 导演台顶栏已去掉 GitHub 图标按钮；从画布打开导演台后不应再看到 GitHub 入口。用户端提示词接口不再返回 `githubUrl`，版本检查不再请求外部仓库
- 桌面端已重新打包为 `v0.8.2`（含去掉 GitHub 入口的导演台）：`desktop/dist/OmniAll Canvas-0.8.2.dmg`、`OmniAll Canvas Setup 0.8.2.exe`，并已同步到 `web/public/downloads/` 与 xgapi `web/default/public/downloads/`。安装包不再内嵌 downloads，体积约 Mac 133MB / Win 111MB。安装后关于页/版本应为 0.8.2，Agent 插件区含 Cursor（连接后可「开始创作」）
- 已合并上游最新提交：生图工作台可对选中图片做局部重绘，并保留当前模型、渠道、画质和尺寸；生图、视频工作台勾选结果后可批量下载。视频任务轮询在切换账号时会取消旧请求，列表刷新不会把进行中的轮询一起取消。参数转译和 ComfyUI 不再把本地参考视频的完整 Base64 写入记录
- 账号菜单旁有圆形翻译图标按钮。点击后下拉选择 English / 简体中文，当前项带灰色底和勾选。点选后界面立刻切换，不必刷新。选 English 后菜单、提示和 Ant Design 组件改为英文；菜单用短词，例如 Home、Create、Prompts、Assets、Canvases。选 简体中文 恢复中文。语言会记在本机
- 首页「自由画布 / Agent 一句话成片」悬停预览视频每次从片头开始播放，不会只看到后半段
- 打开首页时控制台不再出现 “Encountered a script tag while rendering React component”。页面仍是深色背景
- 首页快捷入口将「音乐创作台」换成「全景图」，位于「3D导演台」之后；悬停显示原首页第五张幻灯片 `panorama.webp` 预览卡，点击会新建带全景节点的画布。首页已去掉「下载客户端」按钮
- 网页端点 Cursor / Codex「连接」时，若本机 3210 未运行，会通过 `/api/local-agent/ensure` 自动拉起仓库内 `canvas-agent`
- 桌面端启动时一并拉起内嵌画布 Agent（`resources/agent`，端口可配 `agentPort`），退出时一起停止；Cursor / Codex 连接不再需要单独手动开 Agent
- Cursor 连接失败时的提示应为画布 Agent / Cursor 相关文案，不再误报「未找到本地 Codex 服务」
- Cursor 对话前必须已打开画布并完成连接；未连接时面板直接提示，而不是回复「没有 omniall-canvas MCP」。连接后每次对话会把当前画布 clientId 写入 MCP
- Agent 设置旁有拼图图标，点击后展开插件列表。点顶部标题可在 OmniAgent、Codex Agent、Cursor 之间切换；未连接的项不可选
- 点「连接」时，如果 3210 端口上是旧的本地服务，提示退出正在运行的 OmniAll Canvas 后再连，不再显示「Token 不正确」
- 点「连接」只使用本机 Codex，不再内置安装包。未安装会打开安装说明并等待安装完成；已安装未登录会打开浏览器登录。安装、登录和模型都就绪后，插件卡片才显示「已连接」
- 插件列表增加 Cursor。未安装会打开下载页；没有 Cursor CLI 会提示安装命令并等待；未登录会打开浏览器登录并等待。应用、CLI、登录和画布 MCP 都就绪后，卡片才显示「已连接」
- 点 Cursor「连接」不会让 Codex 进入连接中。连接成功后按钮变为「开始创作」：Codex 和 Cursor 都在 OmniAll 面板里对话。点顶部标题可以切回 OmniAgent。Cursor 对话里的画布操作自动执行，面板不弹出「允许」。每次对话都会重新加载画布 MCP
- Cursor / Codex 空闲断线后，插件卡片不再一直显示「开始创作」：状态会变为未连接/错误，标题旁有刷新图标可一键重连；对话区会出现「重新连接」按钮，断线错误消息里也可点重连，不必新建画布
