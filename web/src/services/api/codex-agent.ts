import { t } from "@/i18n";
export type CodexConnection = { endpoint: string; token: string };
export type CodexRpcEvent = {
    id?: string | number;
    generation: number;
    method: string;
    params: Record<string, unknown> & {
        threadId?: string; turnId?: string; itemId?: string; delta?: string;
        item?: { id: string; type: string; text?: string };
        turn?: { id: string; status: string; error?: { message: string } };
    };
};
export type CodexToolEvent = { requestId: string; source: "codex" | "external"; generation: number; name: string; arguments: Record<string, unknown> };
export type CodexModel = {
    model: string; displayName: string; defaultReasoningEffort: string; isDefault: boolean;
    supportedReasoningEfforts: Array<{ reasoningEffort: string; description: string }>;
};
export function normalizeCodexEndpoint(endpoint: string) {
    try {
        const url = new URL(endpoint);
        if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
        return url.origin;
    } catch { throw new Error(t("本地 Agent 地址必须为 http://127.0.0.1:端口")); }
}
export type CodexPrepare = CodexConnection & {
    installed: boolean;
    ready: boolean;
    loggedIn: boolean;
    message: string;
    codexSource: string;
    codexLabel: string;
    hasSystemCodex: boolean;
    installUrl: string;
    installCommand: string;
};

async function readLocalJson(endpoint: string, path: string, init?: RequestInit) {
    const url = normalizeCodexEndpoint(endpoint);
    const isCursor = path.startsWith("/cursor/");
    let response: Response;
    try { response = await fetch(url + path, { signal: AbortSignal.timeout(8_000), ...init }); }
    catch {
        throw new Error(isCursor
            ? t("未找到本地画布 Agent，请先启动 canvas-agent（3210）后再连接 Cursor")
            : t("未找到本地 Codex 服务，请先安装并启动"));
    }
    const result = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 404) throw new Error(t("本机端口上的画布服务不支持一键连接。请先退出正在运行的 OmniAll Canvas，再点连接。"));
    if (!response.ok) throw new Error(result.error || (isCursor ? t("本地 Cursor 服务请求失败") : t("本地 Codex 服务请求失败")));
    return { url, result };
}

export async function readCodexSession(endpoint: string): Promise<CodexConnection> {
    const { url, result } = await readLocalJson(endpoint, "/session");
    if (typeof result.token !== "string" || !result.token) throw new Error(result.error || t("本地服务没有返回连接信息"));
    return { endpoint: normalizeCodexEndpoint(typeof result.url === "string" ? result.url : url), token: result.token };
}

export async function prepareCodexConnection(endpoint: string): Promise<CodexPrepare> {
    const { url, result } = await readLocalJson(endpoint, "/prepare");
    if (typeof result.token !== "string" || !result.token) throw new Error(result.error || t("本地服务没有返回连接信息"));
    return {
        endpoint: normalizeCodexEndpoint(typeof result.url === "string" ? result.url : url),
        token: result.token,
        installed: result.installed === true,
        ready: result.ready === true,
        loggedIn: result.loggedIn === true,
        message: typeof result.message === "string" ? result.message : "",
        codexSource: typeof result.codexSource === "string" ? result.codexSource : "missing",
        codexLabel: typeof result.codexLabel === "string" ? result.codexLabel : "Codex",
        hasSystemCodex: result.hasSystemCodex === true || result.installed === true,
        installUrl: typeof result.installUrl === "string" ? result.installUrl : "https://www.npmjs.com/package/@openai/codex",
        installCommand: typeof result.installCommand === "string" ? result.installCommand : "npm install -g @openai/codex",
    };
}

export async function openCodexInstallGuide(endpoint: string) {
    const { result } = await readLocalJson(endpoint, "/install", { method: "POST" });
    return {
        opened: result.opened === true,
        installed: result.installed === true,
        message: typeof result.message === "string" ? result.message : t("请先安装本机 Codex"),
        installUrl: typeof result.installUrl === "string" ? result.installUrl : "https://www.npmjs.com/package/@openai/codex",
        installCommand: typeof result.installCommand === "string" ? result.installCommand : "npm install -g @openai/codex",
    };
}

export async function startCodexLogin(endpoint: string): Promise<{ started: boolean; loggedIn: boolean; message: string; installed?: boolean }> {
    const { result } = await readLocalJson(endpoint, "/login", { method: "POST" });
    return {
        started: result.started === true,
        loggedIn: result.loggedIn === true,
        installed: result.installed !== false,
        message: typeof result.message === "string" ? result.message : t("请在浏览器中完成 Codex 登录"),
    };
}

export async function waitForCodexReady(endpoint: string, onPhase?: (message: string) => void, signal?: AbortSignal) {
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
        if (signal?.aborted) throw new DOMException("连接已取消", "AbortError");
        const prepare = await prepareCodexConnection(endpoint);
        if (prepare.ready) return prepare;
        onPhase?.(`${prepare.message}。安装命令：${prepare.installCommand}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    const latest = await prepareCodexConnection(endpoint);
    throw new Error(`${latest.message}。安装命令：${latest.installCommand}`);
}

export async function waitForCodexLogin(endpoint: string, onPhase?: (message: string) => void, signal?: AbortSignal) {
    const deadline = Date.now() + 3 * 60_000;
    while (Date.now() < deadline) {
        if (signal?.aborted) throw new DOMException("连接已取消", "AbortError");
        const prepare = await prepareCodexConnection(endpoint);
        if (!prepare.ready) throw new Error(`${prepare.message}。安装命令：${prepare.installCommand}`);
        if (prepare.loggedIn) return prepare;
        onPhase?.("请在浏览器完成 Codex 登录");
        await new Promise((resolve) => setTimeout(resolve, 1600));
    }
    throw new Error(t("等待 Codex 登录超时，请完成浏览器授权后重新连接"));
}

export type CursorPrepare = CodexConnection & {
    installed: boolean;
    cliInstalled: boolean;
    loggedIn: boolean;
    ready: boolean;
    registered: boolean;
    message: string;
    installUrl: string;
    installCommand: string;
    mcpPath: string;
    mcpName: string;
};

export async function prepareCursorConnection(endpoint: string): Promise<CursorPrepare> {
    const { url, result } = await readLocalJson(endpoint, "/cursor/prepare");
    if (typeof result.token !== "string" || !result.token) throw new Error(result.error || t("本地服务没有返回连接信息"));
    return {
        endpoint: normalizeCodexEndpoint(typeof result.url === "string" ? result.url : url),
        token: result.token,
        installed: result.installed === true,
        cliInstalled: result.cliInstalled === true,
        loggedIn: result.loggedIn === true,
        ready: result.ready === true,
        registered: result.registered === true,
        message: typeof result.message === "string" ? result.message : "",
        installUrl: typeof result.installUrl === "string" ? result.installUrl : "https://cursor.com/download",
        installCommand: typeof result.installCommand === "string" ? result.installCommand : "curl https://cursor.com/install -fsS | bash",
        mcpPath: typeof result.mcpPath === "string" ? result.mcpPath : "",
        mcpName: typeof result.mcpName === "string" ? result.mcpName : "omniall-canvas",
    };
}

export async function openCursorInstallGuide(endpoint: string) {
    const { result } = await readLocalJson(endpoint, "/cursor/install", { method: "POST" });
    return {
        opened: result.opened === true,
        installed: result.installed === true,
        message: typeof result.message === "string" ? result.message : t("请先安装本机 Cursor"),
        installUrl: typeof result.installUrl === "string" ? result.installUrl : "https://cursor.com/download",
    };
}

export async function streamCursorChat(endpoint: string, token: string, prompt: string, sessionId: string | undefined, onDelta: (text: string) => void, signal?: AbortSignal) {
    const url = normalizeCodexEndpoint(endpoint);
    let response: Response;
    try {
        response = await fetch(url + "/cursor/chat", {
            method: "POST",
            headers: { "content-type": "application/json", "x-canvas-agent-token": token },
            body: JSON.stringify({ prompt, sessionId }),
            signal,
        });
    } catch { throw new Error(t("未找到本地服务，请先连接 Cursor")); }
    if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || t("Cursor 对话失败"));
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let nextSessionId = sessionId || "";
    let text = "";
    while (true) {
        const step = await reader.read();
        if (step.done) break;
        buffer += decoder.decode(step.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as { type?: string; text?: string; sessionId?: string; message?: string; isError?: boolean };
            if (event.sessionId) nextSessionId = event.sessionId;
            if (event.type === "delta" && event.text) {
                text += event.text;
                onDelta(text);
            } else if (event.type === "done") {
                if (event.text) { text = event.text; onDelta(text); }
                if (event.isError) throw new Error(text || t("Cursor 对话失败"));
            } else if (event.type === "error") {
                throw new Error(event.message || t("Cursor 对话失败"));
            }
        }
    }
    return { text, sessionId: nextSessionId };
}

export async function openCursorApp(endpoint: string) {
    const { result } = await readLocalJson(endpoint, "/cursor/open", { method: "POST" });
    if (result.opened !== true) throw new Error(result.message || result.error || t("无法打开 Cursor"));
    return { message: typeof result.message === "string" ? result.message : t("已打开 Cursor") };
}

export async function registerCursorMcp(endpoint: string) {
    const { result } = await readLocalJson(endpoint, "/cursor/register", { method: "POST" });
    if (result.registered !== true) throw new Error(result.message || result.error || t("注册 Cursor MCP 失败"));
    return {
        registered: true,
        message: typeof result.message === "string" ? result.message : t("已写入 Cursor MCP"),
        mcpPath: typeof result.mcpPath === "string" ? result.mcpPath : "",
        mcpName: typeof result.mcpName === "string" ? result.mcpName : "omniall-canvas",
    };
}

export async function startCursorLogin(endpoint: string): Promise<{ started: boolean; loggedIn: boolean; message: string; installed?: boolean }> {
    const { result } = await readLocalJson(endpoint, "/cursor/login", { method: "POST" });
    if (result.error && result.started !== true && result.loggedIn !== true) throw new Error(result.error);
    return {
        started: result.started === true,
        loggedIn: result.loggedIn === true,
        installed: result.installed === true,
        message: typeof result.message === "string" ? result.message : "",
    };
}

export async function waitForCursorCli(endpoint: string, onPhase?: (message: string) => void, signal?: AbortSignal) {
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
        if (signal?.aborted) throw new DOMException("连接已取消", "AbortError");
        const prepare = await prepareCursorConnection(endpoint);
        if (prepare.cliInstalled) return prepare;
        onPhase?.(prepare.message || t("请先安装 Cursor CLI"));
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    const latest = await prepareCursorConnection(endpoint);
    throw new Error(`${latest.message || t("等待 Cursor CLI 安装超时")}。安装命令：${latest.installCommand}`);
}

export async function waitForCursorLogin(endpoint: string, onPhase?: (message: string) => void, signal?: AbortSignal) {
    const deadline = Date.now() + 3 * 60_000;
    while (Date.now() < deadline) {
        if (signal?.aborted) throw new DOMException("连接已取消", "AbortError");
        const prepare = await prepareCursorConnection(endpoint);
        if (!prepare.cliInstalled) throw new Error(`${prepare.message}。安装命令：${prepare.installCommand}`);
        if (prepare.loggedIn) return prepare;
        onPhase?.("请在浏览器完成 Cursor 登录");
        await new Promise((resolve) => setTimeout(resolve, 1600));
    }
    throw new Error(t("等待 Cursor 登录超时，请完成浏览器授权后重新连接"));
}

export async function waitForCursorInstalled(endpoint: string, onPhase?: (message: string) => void, signal?: AbortSignal) {
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
        if (signal?.aborted) throw new DOMException("连接已取消", "AbortError");
        const prepare = await prepareCursorConnection(endpoint);
        if (prepare.installed) return prepare;
        onPhase?.(prepare.message || t("请先安装本机 Cursor"));
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error(t("等待 Cursor 安装超时，请安装完成后重新连接"));
}
export async function readCodexAgentConfig(endpoint: string): Promise<{ url: string; hasToken: boolean }> {
    const url = normalizeCodexEndpoint(endpoint);
    let response: Response;
    try { response = await fetch(url + "/config", { signal: AbortSignal.timeout(5_000) }); }
    catch { throw new Error(t("未连接到本地 Agent，请先启动服务，再使用插件自动连接")); }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t("无法读取本地 Agent 状态"));
    return result;
}

/** 若本机 Agent 未运行，通过同机 Next API 自动拉起。 */
export async function ensureLocalCanvasAgent(endpoint: string, onPhase?: (message: string) => void) {
    const url = normalizeCodexEndpoint(endpoint);
    try {
        const response = await fetch(url + "/config", { signal: AbortSignal.timeout(2_000) });
        if (response.ok) return { started: false, endpoint: url, message: t("本地画布 Agent 已在运行") };
    } catch {
        // continue to auto-start
    }
    onPhase?.(t("正在自动启动本地画布 Agent"));
    let response: Response;
    try {
        response = await fetch("/api/local-agent/ensure", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ endpoint: url }),
            signal: AbortSignal.timeout(60_000),
        });
    } catch {
        throw new Error(t("未找到本地画布 Agent，请先启动 canvas-agent（3210）后再连接"));
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || t("自动启动本地画布 Agent 失败"));
    const ready = await fetch(url + "/config", { signal: AbortSignal.timeout(5_000) }).then((item) => item.ok).catch(() => false);
    if (!ready) throw new Error(t("本地画布 Agent 启动后仍不可用，请检查 3210 端口"));
    return {
        started: result.started === true,
        endpoint: typeof result.endpoint === "string" ? result.endpoint : url,
        message: typeof result.message === "string" ? result.message : t("已自动启动本地画布 Agent"),
    };
}
export function createCodexAgentClient(
    connection: CodexConnection,
    canvasId: string,
    tools: unknown[],
    handlers: { rpc: (event: CodexRpcEvent) => void; tool: (event: CodexToolEvent) => void; cancelTool: (requestId: string) => void; ready: () => Promise<void>; error: (error: Error) => void },
) {
    const clientId = crypto.randomUUID();
    const endpoint = normalizeCodexEndpoint(connection.endpoint);
    const lifetime = new AbortController();
    let codexGeneration = 0;
    let serviceId = "";
    const syncCodexGeneration = (generation: number, message: string) => {
        if (!(generation > codexGeneration)) return;
        const previous = codexGeneration;
        codexGeneration = generation;
        handlers.rpc({ generation: previous, method: "bridge/disconnected", params: { message } });
    };
    const request = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
        const response = await fetch(endpoint + path, {
            method: "POST",
            headers: { "content-type": "application/json", "x-canvas-agent-token": connection.token },
            body: JSON.stringify({ clientId, ...body }),
            signal: path === "/rpc" ? lifetime.signal : AbortSignal.any([lifetime.signal, AbortSignal.timeout(30_000)]),
        });
        const result = await response.json();
        if (path === "/rpc") syncCodexGeneration(Number(response.headers.get("x-canvas-agent-generation")), result?.error || t("Codex 连接已断开"));
        if (!response.ok && !(path === "/result" && response.status === 409)) throw new Error(result.error || result.msg || t("本地 Codex 请求失败"));
        return result as T;
    };
    const rpc = async <T>(method: string, params: Record<string, unknown> = {}): Promise<T> => {
        const generation = codexGeneration;
        let result: T | undefined;
        try { result = await request<T>("/rpc", { method, params, generation }); }
        catch (error) { if (generation === codexGeneration) throw error; }
        if (generation !== codexGeneration) throw new DOMException("Codex 请求已停止", "AbortError");
        return result as T;
    };
    const events = new EventSource(endpoint + "/events?" + new URLSearchParams({ clientId, token: connection.token }));
    const fail = (error: unknown) => {
        if (!lifetime.signal.aborted) handlers.error(error instanceof Error ? error : new Error(t("本地 Agent 连接已断开")));
    };
    const listen = <T>(name: string, listener: (value: T) => void) => events.addEventListener(name, (event) => {
        try { listener(JSON.parse((event as MessageEvent).data) as T); } catch (error) { fail(error); }
    });
    listen<CodexRpcEvent>("rpc", (event) => {
        if (event.generation !== codexGeneration) return;
        if (event.method === "bridge/disconnected") syncCodexGeneration(event.generation + 1, String(event.params?.message || t("Codex 连接已断开")));
        else handlers.rpc({ ...event, params: event.params || {} });
    });
    listen<CodexToolEvent>("tool", (event) => { if (event.source === "external" || event.generation === codexGeneration) handlers.tool(event); });
    listen<{ requestId: string }>("tool-cancel", ({ requestId }) => handlers.cancelTool(requestId));
    events.onopen = () => { void request<{ serviceId: string }>("/connect", { canvasId, tools }).then((result) => { serviceId = result.serviceId; return handlers.ready(); }).catch(fail); };
    events.onerror = () => fail(new Error(t("本地 Agent 连接已断开，请检查服务和连接配置")));
    return {
        rpc,
        stop: () => { codexGeneration += 1; return rpc("bridge/stop"); },
        get serviceId() { return serviceId; },
        reply: (event: CodexRpcEvent, result?: unknown, error?: { code: number; message: string }) => request("/reply", { id: event.id, generation: event.generation, result, error }),
        result: (requestId: string, result?: unknown, error?: string) => request("/result", { requestId, result, error }),
        connected: () => events.readyState === EventSource.OPEN,
        signal: lifetime.signal,
        close: () => { events.close(); lifetime.abort(); },
    };
}
