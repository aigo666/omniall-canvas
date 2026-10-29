import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import open from "open";
import { fileURLToPath } from "node:url";

export const CURSOR_INSTALL_URL = "https://cursor.com/download";
const MCP_NAME = "omniall-canvas";
const entry = fileURLToPath(new URL("./index.mjs", import.meta.url));

function run(command, args) {
    return new Promise((resolveResult) => {
        const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
        let out = "";
        child.stdout.on("data", (chunk) => { out += chunk; });
        child.stderr.on("data", (chunk) => { out += chunk; });
        child.on("error", (error) => resolveResult({ code: 1, out: error.message }));
        child.on("close", (code) => resolveResult({ code: code ?? 1, out: out.trim() }));
    });
}

function mcpConfigPath() {
    return join(homedir(), ".cursor", "mcp.json");
}

function cursorAppCandidates() {
    if (process.platform === "darwin") return ["/Applications/Cursor.app", join(homedir(), "Applications", "Cursor.app")];
    if (process.platform === "win32") {
        const local = process.env.LOCALAPPDATA || "";
        return [join(local, "Programs", "cursor", "Cursor.exe"), join(local, "Programs", "Cursor", "Cursor.exe")];
    }
    return [];
}

export async function resolveCursorRuntime() {
    const appPath = cursorAppCandidates().find((path) => existsSync(path)) || "";
    const version = await run("cursor", ["--version"]);
    const hasCli = version.code === 0;
    const installed = Boolean(appPath) || hasCli;
    return {
        installed,
        appPath,
        hasCli,
        version: hasCli ? version.out.split("\n")[0] : "",
        installUrl: CURSOR_INSTALL_URL,
        mcpPath: mcpConfigPath(),
        message: installed
            ? (hasCli ? `已检测到本机 Cursor ${version.out.split("\n")[0]}` : "已检测到本机 Cursor")
            : "本机未安装 Cursor。请先安装后再连接。",
    };
}

function readMcpConfig() {
    const path = mcpConfigPath();
    if (!existsSync(path)) return { path, config: { mcpServers: {} } };
    try {
        const parsed = JSON.parse(readFileSync(path, "utf8"));
        const mcpServers = parsed && typeof parsed === "object" && parsed.mcpServers && typeof parsed.mcpServers === "object"
            ? parsed.mcpServers
            : {};
        return { path, config: { ...parsed, mcpServers } };
    } catch {
        return { path, config: { mcpServers: {} } };
    }
}

export function readCursorMcpStatus(token, port) {
    const { path, config } = readMcpConfig();
    const server = config.mcpServers?.[MCP_NAME];
    if (!server || typeof server !== "object") {
        return { registered: false, mcpPath: path, message: "尚未注册画布 MCP" };
    }
    const args = Array.isArray(server.args) ? server.args.map(String) : [];
    const env = server.env && typeof server.env === "object" ? server.env : {};
    const pointsHere = args.some((item) => resolve(String(item)) === resolve(entry))
        || String(env.CANVAS_AGENT_PORT || "") === String(port);
    const tokenMatched = !token || !env.CANVAS_AGENT_TOKEN || env.CANVAS_AGENT_TOKEN === token;
    return {
        registered: pointsHere && tokenMatched,
        mcpPath: path,
        message: pointsHere && tokenMatched ? "画布 MCP 已写入 Cursor" : "Cursor 中的画布 MCP 配置需要更新",
    };
}

const CLI_INSTALL_COMMAND = "curl https://cursor.com/install -fsS | bash";

function agentBin() {
    const homeBin = join(homedir(), ".local", "bin", "agent");
    return existsSync(homeBin) ? homeBin : "agent";
}

export async function cursorCliStatus() {
    const version = await run(agentBin(), ["--version"]);
    return {
        installed: version.code === 0,
        version: version.code === 0 ? version.out.split("\n")[0] : "",
        installCommand: CLI_INSTALL_COMMAND,
        message: version.code === 0 ? "已检测到 Cursor CLI" : `本机还没有 Cursor CLI。请先安装：${CLI_INSTALL_COMMAND}`,
    };
}

export async function readCursorLoginStatus() {
    const cli = await cursorCliStatus();
    if (!cli.installed) return { installed: false, loggedIn: false, message: cli.message, installCommand: cli.installCommand };
    const result = await run(agentBin(), ["status", "--format", "json"]);
    let loggedIn = false;
    try {
        const status = JSON.parse(result.out);
        loggedIn = status.isAuthenticated === true;
    } catch {
        loggedIn = result.code === 0 && !/not logged in|unauthenticated/i.test(result.out);
    }
    return {
        installed: true,
        loggedIn,
        installCommand: cli.installCommand,
        message: loggedIn ? "本机 Cursor 已登录，可直接连接" : "本机 Cursor 未登录，将打开浏览器完成登录",
    };
}

let loginChild = null;

export async function startCursorLogin() {
    const status = await readCursorLoginStatus();
    if (!status.installed) return { started: false, loggedIn: false, installed: false, message: status.message, installCommand: status.installCommand };
    if (status.loggedIn) return { started: false, loggedIn: true, installed: true, message: "Cursor 已登录" };
    if (loginChild && loginChild.exitCode === null && loginChild.signalCode === null) {
        return { started: true, loggedIn: false, installed: true, message: "请在浏览器中完成 Cursor 登录" };
    }
    loginChild = spawn(agentBin(), ["login"], { stdio: ["ignore", "ignore", "ignore"], windowsHide: true });
    loginChild.on("error", () => { loginChild = null; });
    loginChild.on("close", () => { loginChild = null; });
    return { started: true, loggedIn: false, installed: true, message: "已打开 Cursor 登录，请在浏览器中完成授权" };
}

export function buildCanvasMcpServer({ token, port, clientId = "" }) {
    const env = {
        CANVAS_AGENT_TOKEN: token,
        CANVAS_AGENT_PORT: String(port),
        CANVAS_AGENT_SOURCE: "external",
    };
    if (clientId) env.CANVAS_AGENT_CLIENT_ID = clientId;
    return {
        command: process.execPath,
        args: [entry, "mcp"],
        env,
        startup_timeout_sec: 180,
        tool_timeout_sec: 90,
    };
}

export function syncCursorWorkspaceMcp(workspace, server) {
    const next = server && typeof server === "object"
        ? server
        : readMcpConfig().config.mcpServers?.[MCP_NAME];
    if (!next || typeof next !== "object") return false;
    const path = join(workspace, ".cursor", "mcp.json");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ mcpServers: { [MCP_NAME]: next } }, null, 2) + "\n", { mode: 0o600 });
    return true;
}

export function startCursorChat({ prompt, token, port, clientId = "" }) {
    const workspace = join(homedir(), ".omniall-canvas", "cursor-workspace");
    mkdirSync(workspace, { recursive: true });
    const server = buildCanvasMcpServer({ token, port, clientId });
    syncCursorWorkspaceMcp(workspace, server);
    const args = ["-p", "--output-format", "stream-json", "--stream-partial-output", "--approve-mcps", "--trust", "--force", "--workspace", workspace];
    args.push("你在 OmniAll 画布面板里对话。请直接调用 MCP 服务器 omniall-canvas 操作当前已连接的画布，不要修改代码文件。若工具列表为空，说明画布未连接，请让用户先在网页完成连接。这里没有授权弹窗，不要要求用户点允许；工具失败时说明返回的错误。下面是当前面板里的对话。\n\n" + prompt);
    return spawn(agentBin(), args, { cwd: workspace, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
}

export async function openCursorApp() {
    const runtime = await resolveCursorRuntime();
    if (!runtime.installed) return { opened: false, installed: false, message: runtime.message, installUrl: runtime.installUrl };
    if (runtime.appPath) {
        await open(runtime.appPath);
        return { opened: true, installed: true, message: "已打开 Cursor，可在 Cursor 对话里操作当前画布" };
    }
    const child = spawn("cursor", [], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    return { opened: true, installed: true, message: "已打开 Cursor，可在 Cursor 对话里操作当前画布" };
}

export async function openCursorInstallGuide() {
    const runtime = await resolveCursorRuntime();
    if (runtime.installed) return { opened: false, installed: true, message: runtime.message, installUrl: runtime.installUrl };
    try { await open(runtime.installUrl); } catch { /* 仍返回安装说明 */ }
    return { opened: true, installed: false, message: runtime.message, installUrl: runtime.installUrl };
}

export async function registerCursorMcp({ token, port }) {
    const runtime = await resolveCursorRuntime();
    if (!runtime.installed) {
        return {
            registered: false,
            installed: false,
            message: runtime.message,
            installUrl: runtime.installUrl,
            mcpPath: runtime.mcpPath,
        };
    }
    const { path, config } = readMcpConfig();
    mkdirSync(dirname(path), { recursive: true });
    config.mcpServers = {
        ...config.mcpServers,
        [MCP_NAME]: buildCanvasMcpServer({ token, port }),
    };
    writeFileSync(path, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
    syncCursorWorkspaceMcp(join(homedir(), ".omniall-canvas", "cursor-workspace"), config.mcpServers[MCP_NAME]);
    return {
        registered: true,
        installed: true,
        message: "已写入 Cursor MCP，可在 Cursor 对话里操作当前画布",
        installUrl: runtime.installUrl,
        mcpPath: path,
        mcpName: MCP_NAME,
    };
}

export function attachCursorMcpClient(clientId) {
    if (!clientId) return false;
    const { path, config } = readMcpConfig();
    const server = config.mcpServers?.[MCP_NAME];
    if (!server || typeof server !== "object") return false;
    server.env = { ...(server.env && typeof server.env === "object" ? server.env : {}), CANVAS_AGENT_CLIENT_ID: clientId, CANVAS_AGENT_SOURCE: "external" };
    writeFileSync(path, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
    return true;
}
