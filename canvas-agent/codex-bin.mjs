import { spawn } from "node:child_process";
import open from "open";

export const CODEX_INSTALL_URL = "https://www.npmjs.com/package/@openai/codex";
export const CODEX_INSTALL_COMMAND = "npm install -g @openai/codex";
const MIN_VERSION = "0.140.0";

function run(command, args, env = process.env) {
    return new Promise((resolve) => {
        const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, env });
        let out = "";
        child.stdout.on("data", (chunk) => { out += chunk; });
        child.stderr.on("data", (chunk) => { out += chunk; });
        child.on("error", (error) => resolve({ code: 1, out: error.message }));
        child.on("close", (code) => resolve({ code: code ?? 1, out: out.trim() }));
    });
}

function parseVersion(text) {
    const match = String(text || "").match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) return 0;
    return Number(match[1]) * 1_000_000 + Number(match[2]) * 1_000 + Number(match[3]);
}

function versionText(out) {
    return String(out || "").replace(/^codex-cli\s+/i, "").trim();
}

export async function resolveCodexRuntime() {
    const version = await run("codex", ["--version"]);
    if (version.code !== 0) {
        return {
            installed: false,
            ready: false,
            source: "missing",
            label: "未安装 Codex",
            command: "codex",
            prefix: [],
            version: "",
            message: "本机未安装 Codex。请先安装后再连接：npm install -g @openai/codex",
            installUrl: CODEX_INSTALL_URL,
            installCommand: CODEX_INSTALL_COMMAND,
        };
    }
    const parsed = versionText(version.out);
    const appServer = await run("codex", ["app-server", "--help"]);
    if (appServer.code !== 0 || parseVersion(parsed) < parseVersion(MIN_VERSION)) {
        return {
            installed: true,
            ready: false,
            source: "outdated",
            label: "本机 Codex 版本过旧",
            command: "codex",
            prefix: [],
            version: parsed,
            message: `本机 Codex ${parsed || "未知版本"} 过旧，请升级到 ${MIN_VERSION} 及以上：npm install -g @openai/codex@latest`,
            installUrl: CODEX_INSTALL_URL,
            installCommand: "npm install -g @openai/codex@latest",
        };
    }
    return {
        installed: true,
        ready: true,
        source: "system",
        label: "本机 Codex",
        command: "codex",
        prefix: [],
        version: parsed,
        message: "已检测到本机 Codex",
        installUrl: CODEX_INSTALL_URL,
        installCommand: CODEX_INSTALL_COMMAND,
    };
}

export function spawnCodex(runtime, args, options = {}) {
    if (!runtime?.ready) throw new Error(runtime?.message || "本机未安装可用的 Codex");
    return spawn(runtime.command, [...runtime.prefix, ...args], {
        stdio: options.stdio || ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: options.env || process.env,
        ...options,
    });
}

export async function readCodexLoginStatus() {
    const runtime = await resolveCodexRuntime();
    if (!runtime.ready) {
        return {
            installed: runtime.installed,
            ready: false,
            loggedIn: false,
            detail: runtime.message,
            source: runtime.source,
            label: runtime.label,
            version: runtime.version,
            message: runtime.message,
            installUrl: runtime.installUrl,
            installCommand: runtime.installCommand,
        };
    }
    const result = await run(runtime.command, [...runtime.prefix, "login", "status"]);
    const loggedIn = result.code === 0 && !/not logged in/i.test(result.out);
    return {
        installed: true,
        ready: true,
        loggedIn,
        detail: result.out || (loggedIn ? "Logged in" : "Not logged in"),
        source: runtime.source,
        label: runtime.label,
        version: runtime.version,
        message: loggedIn ? "本机 Codex 已登录，可直接连接" : "本机 Codex 未登录，将打开浏览器完成登录",
        installUrl: runtime.installUrl,
        installCommand: runtime.installCommand,
    };
}

let loginChild = null;

export async function openCodexInstallGuide() {
    const runtime = await resolveCodexRuntime();
    if (runtime.ready) return { opened: false, installed: true, message: runtime.message, installUrl: runtime.installUrl, installCommand: runtime.installCommand };
    try { await open(runtime.installUrl); } catch { /* 仍返回安装说明 */ }
    return {
        opened: true,
        installed: false,
        message: runtime.message,
        installUrl: runtime.installUrl,
        installCommand: runtime.installCommand,
    };
}

export async function startCodexLogin() {
    const runtime = await resolveCodexRuntime();
    if (!runtime.ready) {
        return {
            started: false,
            loggedIn: false,
            installed: false,
            message: runtime.message,
            installUrl: runtime.installUrl,
            installCommand: runtime.installCommand,
        };
    }
    const status = await readCodexLoginStatus();
    if (status.loggedIn) return { started: false, loggedIn: true, installed: true, message: "Codex 已登录" };
    if (loginChild && loginChild.exitCode === null && loginChild.signalCode === null) {
        return { started: true, loggedIn: false, installed: true, message: "请在浏览器中完成 Codex 登录" };
    }
    loginChild = spawnCodex(runtime, ["login"], { stdio: ["ignore", "ignore", "ignore"] });
    loginChild.on("error", () => { loginChild = null; });
    loginChild.on("close", () => { loginChild = null; });
    return { started: true, loggedIn: false, installed: true, message: "已打开 Codex 登录，请在浏览器中完成授权" };
}
