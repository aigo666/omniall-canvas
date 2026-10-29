import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ENDPOINT = "http://127.0.0.1:3210";
let starting: Promise<{ started: boolean; endpoint: string; message: string }> | null = null;

function isLocalHost(host: string) {
    const value = host.trim().toLowerCase();
    return value === "127.0.0.1" || value === "localhost" || value === "::1" || value === "[::1]";
}

function requestIsLocal(request: NextRequest) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = request.headers.get("x-real-ip")?.trim();
    const candidates = [forwarded, realIp, request.nextUrl.hostname].filter(Boolean) as string[];
    return candidates.some(isLocalHost) || candidates.length === 0;
}

function normalizeLocalEndpoint(raw: unknown) {
    const text = typeof raw === "string" && raw.trim() ? raw.trim() : DEFAULT_ENDPOINT;
    const url = new URL(text);
    if (url.protocol !== "http:" || !isLocalHost(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
        throw new Error("只能自动启动本机 http://127.0.0.1:端口 的画布 Agent");
    }
    return url.origin;
}

async function probeAgent(endpoint: string) {
    try {
        const response = await fetch(`${endpoint}/config`, { signal: AbortSignal.timeout(2_000) });
        return response.ok;
    } catch {
        return false;
    }
}

function resolveAgentEntry() {
    const fromEnv = process.env.CANVAS_AGENT_ENTRY?.trim();
    if (fromEnv && existsSync(fromEnv)) return fromEnv;
    const candidates = [
        resolve(process.cwd(), "agent/index.mjs"),
        resolve(process.cwd(), "../agent/index.mjs"),
        resolve(process.cwd(), "../canvas-agent/index.mjs"),
        resolve(process.cwd(), "../../canvas-agent/index.mjs"),
        resolve(process.cwd(), "canvas-agent/index.mjs"),
    ];
    return candidates.find((path) => existsSync(path)) || "";
}

function spawnAgent(entry: string, endpoint: string) {
    const port = new URL(endpoint).port || "3210";
    const cwd = dirname(entry);
    const env = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        CANVAS_AGENT_PORT: port,
    };
    delete env.ELECTRON_NO_ASAR;
    const child: ChildProcess = spawn(process.execPath, [entry], {
        cwd,
        env,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
    });
    child.unref();
}

async function waitForAgent(endpoint: string, timeoutMs = 45_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        if (await probeAgent(endpoint)) return true;
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    return false;
}

async function ensureAgent(endpoint: string) {
    if (await probeAgent(endpoint)) {
        return { started: false, endpoint, message: "本地画布 Agent 已在运行" };
    }
    const entry = resolveAgentEntry();
    if (!entry) {
        throw new Error("未找到本地 canvas-agent，请先安装依赖或使用桌面客户端");
    }
    spawnAgent(entry, endpoint);
    const ready = await waitForAgent(endpoint);
    if (!ready) throw new Error("已尝试启动本地画布 Agent，但仍未就绪，请检查 3210 端口");
    return { started: true, endpoint, message: "已自动启动本地画布 Agent" };
}

export async function POST(request: NextRequest) {
    if (!requestIsLocal(request)) {
        return Response.json({ error: "仅允许本机请求自动启动画布 Agent" }, { status: 403 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const endpoint = normalizeLocalEndpoint((body as { endpoint?: string }).endpoint);
        if (!starting) {
            starting = ensureAgent(endpoint).finally(() => {
                starting = null;
            });
        }
        const result = await starting;
        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "自动启动画布 Agent 失败" }, { status: 500 });
    }
}
