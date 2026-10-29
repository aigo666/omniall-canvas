const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

/** @type {import('node:child_process').ChildProcess | null} */
let webProcess = null;
/** @type {import('node:child_process').ChildProcess | null} */
let agentProcess = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;
let shuttingDown = false;
const debugLogPath = path.join(require("node:os").tmpdir(), "omniall-canvas-desktop.log");

function debugLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(debugLogPath, line);
  } catch {
    // ignore
  }
  process.stdout.write(line);
}

function resourcesRoot() {
  if (app.isPackaged) return process.resourcesPath;
  return path.join(__dirname, "..", "resources");
}

function readConfig() {
  const configPath = path.join(resourcesRoot(), "config.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(raw);
  const apiBaseUrl = String(config.apiBaseUrl || "http://127.0.0.1:18080").replace(/\/$/, "");
  const host = String(config.host || "127.0.0.1");
  const port = Number(config.port || 17890);
  const agentPort = Number(config.agentPort || 3210);
  return { apiBaseUrl, host, port, agentPort };
}

function webServerEntry() {
  const root = resourcesRoot();
  const candidates = [
    path.join(root, "web", "server.js"),
    path.join(root, "web", "omniall-canvas", "web", "server.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`未找到本地前端 server.js，请先运行 scripts/prepare-desktop-web.sh\n查找目录: ${path.join(root, "web")}`);
}

function agentServerEntry() {
  const entry = path.join(resourcesRoot(), "agent", "index.mjs");
  if (!fs.existsSync(entry)) {
    throw new Error(`未找到本地画布 Agent：${entry}\n请先运行 scripts/prepare-desktop-web.sh`);
  }
  return entry;
}

function waitForHttp(url, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });
      req.on("error", retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`本地服务启动超时: ${url}`));
        return;
      }
      setTimeout(attempt, 400);
    };
    attempt();
  });
}

function spawnNodeProcess(entry, cwd, env, label) {
  const child = spawn(process.execPath, [entry], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk) => {
    debugLog(`[${label}:stdout] ${String(chunk).trimEnd()}`);
  });
  child.stderr?.on("data", (chunk) => {
    debugLog(`[${label}:stderr] ${String(chunk).trimEnd()}`);
  });
  child.on("error", (error) => {
    debugLog(`${label} process error: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  });
  return child;
}

function startWebServer(config) {
  const entry = webServerEntry();
  const cwd = path.dirname(entry);
  const agentEntry = agentServerEntry();
  debugLog(`starting web server entry=${entry} cwd=${cwd} api=${config.apiBaseUrl} port=${config.port}`);
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    HOSTNAME: config.host,
    PORT: String(config.port),
    API_BASE_URL: config.apiBaseUrl,
    CANVAS_AGENT_ENTRY: agentEntry,
  };
  delete env.ELECTRON_NO_ASAR;
  webProcess = spawnNodeProcess(entry, cwd, env, "web");
  webProcess.on("exit", (code, signal) => {
    debugLog(`web process exit code=${code} signal=${signal || "-"}`);
    webProcess = null;
    if (!shuttingDown) {
      dialog.showErrorBox("前端进程退出", `本地 UI 进程已退出 (code=${code}, signal=${signal || "-"})\n日志: ${debugLogPath}`);
      app.quit();
    }
  });
}

function probeHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(Boolean(res.statusCode && res.statusCode < 500));
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startAgentServer(config) {
  const health = `http://127.0.0.1:${config.agentPort}/config`;
  if (await probeHttp(health)) {
    debugLog(`canvas-agent already running at ${health}`);
    return;
  }
  const entry = agentServerEntry();
  const cwd = path.dirname(entry);
  debugLog(`starting canvas-agent entry=${entry} port=${config.agentPort}`);
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    CANVAS_AGENT_PORT: String(config.agentPort),
  };
  delete env.ELECTRON_NO_ASAR;
  agentProcess = spawnNodeProcess(entry, cwd, env, "agent");
  agentProcess.on("exit", (code, signal) => {
    debugLog(`agent process exit code=${code} signal=${signal || "-"}`);
    agentProcess = null;
    if (!shuttingDown) {
      dialog.showErrorBox("画布 Agent 退出", `本地画布 Agent 已退出 (code=${code}, signal=${signal || "-"})\n日志: ${debugLogPath}`);
    }
  });
}

function createWindow(config) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    title: "OmniAll Canvas",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const url = `http://${config.host}:${config.port}`;
  mainWindow.loadURL(url);
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootstrap() {
  try {
    fs.writeFileSync(debugLogPath, "");
  } catch {
    // ignore
  }
  debugLog(`bootstrap packaged=${app.isPackaged} execPath=${process.execPath} resources=${resourcesRoot()}`);
  const config = readConfig();
  debugLog(`config=${JSON.stringify(config)}`);
  try {
    await startAgentServer(config);
    await waitForHttp(`http://127.0.0.1:${config.agentPort}/config`, 45000);
    debugLog(`agent ready: http://127.0.0.1:${config.agentPort}`);
  } catch (error) {
    debugLog(`agent wait failed: ${error instanceof Error ? error.message : String(error)}`);
    dialog.showErrorBox(
      "画布 Agent 启动失败",
      `${error instanceof Error ? error.message : String(error)}\n\n请确认 resources/agent 已打包。\n日志: ${debugLogPath}`,
    );
    app.quit();
    return;
  }
  startWebServer(config);
  const healthUrl = `http://${config.host}:${config.port}/`;
  try {
    await waitForHttp(healthUrl);
    debugLog(`web ready: ${healthUrl}`);
  } catch (error) {
    debugLog(`web wait failed: ${error instanceof Error ? error.message : String(error)}`);
    dialog.showErrorBox(
      "启动失败",
      `${error instanceof Error ? error.message : String(error)}\n\n请确认远程/本地 API 可访问:\n${config.apiBaseUrl}\n并确认已打包本地前端资源。\n日志: ${debugLogPath}`,
    );
    app.quit();
    return;
  }
  createWindow(config);
}

function stopChild(processRef, label) {
  const child = processRef();
  if (!child || child.killed) return;
  debugLog(`stopping ${label}`);
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child && !child.killed) child.kill("SIGKILL");
  }, 2000);
}

function stopAllChildren() {
  shuttingDown = true;
  stopChild(() => webProcess, "web");
  stopChild(() => agentProcess, "agent");
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on("window-all-closed", () => {
  stopAllChildren();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopAllChildren();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && !webProcess) {
    shuttingDown = false;
    void bootstrap();
  }
});
