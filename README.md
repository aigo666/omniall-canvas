<p align="center">
  <img src="web/public/logo.svg" width="96" alt="OmniAll Canvas logo">
</p>

<p align="center">
  <strong>English</strong> · <a href="./README.zh-CN.md">中文</a>
</p>

<h1 align="center">OmniAll Canvas</h1>

<p align="center">
  <a href="https://omniall.ai"><img src="https://img.shields.io/badge/OmniAll.ai-compatible-0ea5e9?style=flat-square" alt="OmniAll.ai"></a>
  <a href="VERSION"><img src="https://img.shields.io/badge/version-v0.8.2-2563eb?style=flat-square" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-f97316?style=flat-square" alt="License"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-ready-2496ed?style=flat-square&logo=docker&logoColor=white" alt="Docker ready"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=nextdotjs" alt="Next.js"></a>
  <a href="https://go.dev/"><img src="https://img.shields.io/badge/Go-1.25-00add8?style=flat-square&logo=go&logoColor=white" alt="Go"></a>
</p>

<p align="center">
  <strong>Built for <a href="https://omniall.ai">OmniAll.ai</a></strong><br>
  <sub>Open-source AI creation studio · Infinite canvas · Agent · Director stage · Multimodal generation</sub>
</p>

<p align="center">
  <a href="https://agent.omniall.ai">Live demo</a> ·
  <a href="https://github.com/aigo666/omniall-canvas">GitHub</a> ·
  <a href="https://omniall.ai">OmniAll.ai</a>
</p>

OmniAll Canvas is an open-source all-in-one creation studio for images, video, and audio. It combines canvas orchestration, AI image/video/audio generation, reference editing, chat assistants, prompt libraries, and asset management in one UI — made for continuous visual exploration and iteration.

The project is fully adapted for **[OmniAll.ai](https://omniall.ai)**: use OmniAll’s OpenAI-compatible API (`Base URL` + `API Key`) to call text-to-image, image-to-image, video, and chat models out of the box.

## OmniAll.ai compatibility

- **Protocol**: Standard OpenAI-compatible requests against the OmniAll.ai gateway.
- **Models**: Text-to-image, image-to-image, reference editing, chat, audio, and video — whatever you have enabled on OmniAll.
- **Setup**: Enter OmniAll `Base URL` and `API Key` in system / canvas settings.
- **Flexibility**: Custom image/video call shapes are supported when a model path differs from the defaults.

## Features

- **Agent**: Analyze selected nodes and upstream context, plan and generate images or video, apply Skills, and insert results back onto the canvas
- **Panorama**: Text-to-panorama, reference-based generation, and local 2:1 panorama import as Director Stage environments
- **Director Stage**: Place characters, models, panoramas, and cameras in a 3D scene; manage shots, capture frames, and send camera views as linked image nodes
- **Camera controls**: Set camera, lens, focal length, and aperture on image/video/config nodes; parameters are written into prompts and persist with copy/save
- **Infinite canvas**: Multi-project boards, drag/zoom, links, minimap, undo/redo, import/export
- **AI creation**: OpenAI-compatible Images API & Responses API, image-to-image, reference edits, streaming, Base64 outputs (OmniAll.ai recommended)
- **Image workbench**: Side/floating dock, concurrent tasks, merged history, categories, failure details, reference thumbnails, size display, and “My assets” reuse
- **Creative workflows**: Public/personal templates, variable forms, AI-created workflows, single/multi-image series, reference inputs, results into generation history
- **Prompts & assets**: Prompt library, server asset library, and “My assets” reusable across generation, canvas AI, and workflows

Full feature list: [docs/features.md](docs/overview/features.md)

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Ant Design, Zustand, TanStack Query
- Backend: Go, Gin, GORM
- Storage: SQLite, IndexedDB, S3-compatible object storage, Cloudflare R2
- Deploy: Docker

## Quick start

### Recommended: OmniAll.ai

1. Get an API Key from [OmniAll.ai](https://omniall.ai)
2. Start OmniAll Canvas with one of the methods below
3. Set OmniAll `Base URL` and `API Key` in settings
4. Pick enabled models and create images / video / chat on the canvas

### Docker

```bash
git clone https://github.com/aigo666/omniall-canvas.git
cd omniall-canvas
cp .env.example .env
# adjust default credentials as needed
docker compose up -d --build
```

### Local development

```bash
cp .env.example .env
go run .

# another terminal
cd web
bun install
bun run dev
```

### Local source build with Docker

```bash
cp .env.example .env
docker compose -f docker-compose.local.yml up -d --build
```

Default port is `3000` → `http://localhost:3000`.

Prompt admin: `http://localhost:3000/admin/prompts`

## Gallery

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

## Docs

- [Features](docs/overview/features.md)
- [Docker deploy](docs/overview/docker.md)
- [Canvas node manual](docs/canvas/canvas-node-manual.md)
- [Canvas shortcuts](docs/canvas/canvas-shortcuts.md)
- [Todo](docs/progress/todo.md)
- [Backend database](docs/backend/backend-database.md)
- [System settings schema](docs/backend/system-settings.md)
- [API response conventions](docs/backend/api-response.md)

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).
