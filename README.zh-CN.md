<p align="center">
  <img src="web/public/logo.svg" width="96" alt="OmniAll Canvas logo">
</p>

<p align="center">
  <a href="./README.md">English</a> · <strong>中文</strong>
</p>

<h1 align="center">OmniAll Canvas · 无限画布</h1>

<p align="center">
  <a href="https://omniall.ai"><img src="https://img.shields.io/badge/OmniAll.ai-完美兼容-0ea5e9?style=flat-square" alt="OmniAll.ai"></a>
  <a href="VERSION"><img src="https://img.shields.io/badge/version-v0.8.2-2563eb?style=flat-square" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-f97316?style=flat-square" alt="License"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-ready-2496ed?style=flat-square&logo=docker&logoColor=white" alt="Docker ready"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=nextdotjs" alt="Next.js"></a>
  <a href="https://go.dev/"><img src="https://img.shields.io/badge/Go-1.25-00add8?style=flat-square&logo=go&logoColor=white" alt="Go"></a>
</p>

<p align="center">
  <strong>完美兼容适配 <a href="https://omniall.ai">OmniAll.ai</a></strong><br>
  <sub>开源 AI 创作工作台 · 无限画布 · Agent · 导演台 · 多模态生成</sub>
</p>

<p align="center">
  <a href="https://agent.omniall.ai">在线体验</a> ·
  <a href="https://github.com/aigo666/omniall-canvas">GitHub</a> ·
  <a href="https://omniall.ai">OmniAll.ai</a>
</p>

OmniAll Canvas（无限画布）是面向图片、视频、音频的全能创作开源工作台。它把画布编排、AI 生图 / 生视频 / 音频、参考图编辑、对话助手、提示词库和素材沉淀放在同一界面，适合连续探索与迭代视觉方案。

本项目已针对 **[OmniAll.ai](https://omniall.ai)** 做完整兼容适配：使用 OmniAll 的 OpenAI 兼容 API（`Base URL` + `API Key`）即可调用平台上的文生图、图生图、视频生成与对话模型，开箱即用。

## 与 OmniAll.ai 的兼容说明

- **接口协议**：标准 OpenAI 兼容请求格式，直接对接 OmniAll.ai 网关。
- **模型能力**：文生图、图生图、参考图编辑、文本对话、音频与视频生成，均可使用 OmniAll 侧已开通模型。
- **配置方式**：在系统 / 画布配置中填写 OmniAll 的 `Base URL` 与 `API Key` 即可开始创作。
- **调用扩展**：若个别模型路径与默认形态不同，可在画布内自定义生图 / 视频调用方式，灵活适配 OmniAll 各通道。

## 核心功能

- Agent：围绕选中节点和上游节点分析、规划并生成图片或视频，支持选择 Skill 指导当前创作任务，并将结果插回画布
- 全景图：支持文字生成、参考图生成和本地 2:1 全景图导入，可作为导演台的场景环境背景
- 导演台：在独立 3D 场景中布置角色、模型、全景环境和机位，支持镜头管理、截图，并将机位画面自动发送为连线图片节点
- 摄像机控制：图片、视频和生成配置节点支持独立设置相机、镜头、焦距和光圈，将镜头参数自动写入生成提示词，并随节点保存和复制
- 无限画布：多画布项目、节点拖拽缩放、连线、小地图、撤销重做、导入导出
- AI 创作：支持 OpenAI 兼容接口的 Images API、Responses API、图生图、参考图编辑、流式接收、Base64 图片返回（推荐对接 OmniAll.ai）
- 生图工作台：支持侧边/悬浮底部工作台、多任务并发、历史结果合并展示、分类管理、失败详情、参考图缩略图、图片体积展示和“我的素材”复用
- 创作工作流：支持公开/个人模板、变量表单、AI 创建工作流、单图/多图系列工作流、参考图输入和结果自动进入生图历史
- 提示词与素材：提示词库、服务器素材库和“我的素材”可在生图、画布 AI 和工作流中复用

完整功能说明见 [docs/features.md](docs/overview/features.md)

## 技术栈

- 前端：Next.js、React、TypeScript、Tailwind CSS、Ant Design、Zustand、TanStack Query
- 后端：Go、Gin、GORM
- 存储：SQLite、本地 IndexedDB、S3 兼容对象存储、Cloudflare R2
- 部署：Docker

## 快速开始

### 推荐：对接 OmniAll.ai

1. 在 [OmniAll.ai](https://omniall.ai) 获取 API Key
2. 按下方方式启动 OmniAll Canvas
3. 在系统配置中填写 OmniAll 的 `Base URL` 与 `API Key`
4. 选择已开通模型，即可在画布中生图 / 生视频 / 对话

### Docker 部署

```bash
git clone https://github.com/aigo666/omniall-canvas.git
cd omniall-canvas
cp .env.example .env
# 按需修改默认账号密码等信息
docker compose up -d --build
```

### 本地开发

```bash
cp .env.example .env
go run .

# 另开一个终端
cd web
bun install
bun run dev
```

### 本地源码构建运行

```bash
cp .env.example .env
docker compose -f docker-compose.local.yml up -d --build
```

运行后默认端口 `3000`，访问 `http://localhost:3000`。

如需管理提示词，可前往：`http://localhost:3000/admin/prompts`

## 效果展示

<table width="100%">
  <tr>
    <td width="50%"><img src="https://cdn3.ldstatic.com/original/4X/d/7/c/d7cecc7df20fcd935ce760757f8799cf4436c936.png" alt="preview 1" border="0"></td>
    <td width="50%"><img src="https://cdn3.ldstatic.com/original/4X/6/0/7/607af375f9182a86f31655b8326337a536f70e34.png" alt="preview 2" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://cdn3.ldstatic.com/original/4X/6/e/6/6e60f82eec3602151abccc60fc4b55d028ac8415.png" alt="preview 3" border="0"></td>
    <td width="50%"><img src="https://cdn3.ldstatic.com/original/4X/8/b/a/8bae005a727727c8d83e0e01b05fea90155e56a5.jpeg" alt="preview 4" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://cdn3.ldstatic.com/original/4X/e/b/e/ebe20a7cb4c4837495cdbd55b4327fa741ce2938.png" alt="preview 5" border="0"></td>
    <td width="50%"><img src="https://cdn3.ldstatic.com/original/4X/0/f/b/0fbe4f543ac554a7950cf011ceb4586d27e6d681.png" alt="preview 6" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://i.ibb.co/MxXZkWc7/1.png" alt="preview 7" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/5g46rH3L/2.png" alt="preview 8" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://i.ibb.co/NfHpv5q/3.png" alt="preview 9" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/svXg7dPp/4.png" alt="preview 10" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://cdn3.ldstatic.com/original/4X/8/6/7/867532c5c6dfff38cfa2b90ca0e0f76809b066d4.png" alt="preview 11" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/BHjjXcV4/6.png" alt="preview 12" border="0"></td>
  </tr>
</table>

## 文档

- [功能介绍](docs/overview/features.md)
- [部署说明](docs/overview/docker.md)
- [画布节点操作手册](docs/canvas/canvas-node-manual.md)
- [画布快捷键](docs/canvas/canvas-shortcuts.md)
- [待办事项](docs/progress/todo.md)
- [后端数据库说明](docs/backend/backend-database.md)
- [系统配置数据结构](docs/backend/system-settings.md)
- [接口响应约定](docs/backend/api-response.md)

## 开源协议

本项目使用 GNU Affero General Public License v3.0，见 [LICENSE](LICENSE)。
