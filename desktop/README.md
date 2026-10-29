# OmniAll Canvas 桌面客户端

本地安装包：内嵌 Next 前端进程和画布 Agent（默认 `127.0.0.1:3210`），通过 `config.json` 的 `apiBaseUrl` 请求远程（或本机）Go API。  
打开 App 时会一起启动前端与 Agent；退出时一并停止。Cursor / Codex「连接」可直接使用本机 Agent。

## 测试打包（指向本机已启动的后端）

先保证本机 API 在跑（例如 `http://127.0.0.1:18080`）：

```bash
DESKTOP_API_BASE_URL=http://127.0.0.1:18080 ./scripts/build-desktop-dmg.sh
```

产物在 `desktop/dist/*.dmg`。安装后打开 App；未签名时需在「隐私与安全性」允许，或右键打开。

## 配置

`desktop/resources/config.json`（打包时写入 `Contents/Resources/config.json`）：

```json
{
  "apiBaseUrl": "http://127.0.0.1:18080",
  "port": 17890,
  "host": "127.0.0.1",
  "agentPort": 3210
}
```

正式环境把 `apiBaseUrl` 换成你的远程服务根地址即可（会转发到 `{apiBaseUrl}/api/...`）。
