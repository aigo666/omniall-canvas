"use client";

import { t } from "@/i18n";

import { useEffect, useRef, useState } from "react";
import {
    ensureLocalCanvasAgent, openCursorInstallGuide, prepareCursorConnection, registerCursorMcp, startCursorLogin, streamCursorChat, waitForCursorCli, waitForCursorInstalled, waitForCursorLogin,
    type CodexConnection,
} from "@/services/api/codex-agent";

const defaultEndpoint = "http://127.0.0.1:3210";
const HEALTH_INTERVAL_MS = 30_000;

export function useCursorAgent(options: {
    canvasBridgeReady: boolean;
    ensureCanvasBridge: (connection: CodexConnection) => Promise<boolean>;
}) {
    const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "error">("idle");
    const [phase, setPhase] = useState("");
    const [error, setError] = useState("");
    const [endpoint, setEndpoint] = useState(defaultEndpoint);
    const tokenRef = useRef("");
    const attempt = useRef(0);
    const abortRef = useRef<AbortController | null>(null);
    const latest = useRef(options);
    latest.current = options;

    const disconnect = () => {
        attempt.current += 1;
        abortRef.current?.abort();
        abortRef.current = null;
        setStatus("idle");
        setPhase("");
        setError("");
    };

    const markDisconnected = (message?: string) => {
        setError(message || t("本地 Agent 连接已断开"));
        setStatus("error");
        setPhase("");
    };

    const connect = async () => {
        disconnect();
        const current = attempt.current;
        const abort = new AbortController();
        abortRef.current = abort;
        setStatus("connecting");
        setError("");
        setPhase(t("正在检查本地画布 Agent"));
        try {
            await ensureLocalCanvasAgent(endpoint, setPhase);
            if (abort.signal.aborted || attempt.current !== current) return false;
            setPhase(t("正在检查本机 Cursor"));
            let prepare = await prepareCursorConnection(endpoint);
            if (abort.signal.aborted || attempt.current !== current) return false;
            tokenRef.current = prepare.token;
            setEndpoint(prepare.endpoint);
            setPhase(prepare.message || t("正在检查本机 Cursor"));
            if (!prepare.installed) {
                setPhase("本机未安装 Cursor，正在打开安装说明");
                const guide = await openCursorInstallGuide(prepare.endpoint);
                if (abort.signal.aborted || attempt.current !== current) return false;
                setPhase(guide.message || t("请安装 Cursor 后回到这里"));
                prepare = await waitForCursorInstalled(prepare.endpoint, setPhase, abort.signal);
            }
            if (abort.signal.aborted || attempt.current !== current) return false;
            if (!prepare.cliInstalled) {
                setPhase(prepare.message || t("请先安装 Cursor CLI"));
                prepare = await waitForCursorCli(prepare.endpoint, setPhase, abort.signal);
            }
            if (abort.signal.aborted || attempt.current !== current) return false;
            if (!prepare.loggedIn) {
                setPhase("正在打开 Cursor 登录");
                const login = await startCursorLogin(prepare.endpoint);
                if (abort.signal.aborted || attempt.current !== current) return false;
                if (!login.loggedIn) {
                    setPhase(login.message || t("请在浏览器完成 Cursor 登录"));
                    prepare = await waitForCursorLogin(prepare.endpoint, setPhase, abort.signal);
                } else {
                    prepare = await prepareCursorConnection(prepare.endpoint);
                }
            }
            if (abort.signal.aborted || attempt.current !== current) return false;
            if (!prepare.loggedIn) throw new Error(t("Cursor 尚未登录，请完成浏览器授权后再连接"));
            setPhase("正在写入 Cursor MCP");
            const registered = await registerCursorMcp(prepare.endpoint);
            if (abort.signal.aborted || attempt.current !== current) return false;
            setPhase("正在连接当前画布");
            const connection = { endpoint: prepare.endpoint, token: prepare.token };
            if (!latest.current.canvasBridgeReady) {
                const bridged = await latest.current.ensureCanvasBridge(connection);
                if (!bridged) throw new Error(t("画布未连接到本地服务"));
            }
            if (abort.signal.aborted || attempt.current !== current) return false;
            const verified = await prepareCursorConnection(prepare.endpoint);
            if (!verified.cliInstalled || !verified.loggedIn) throw new Error(verified.message || t("Cursor 尚未登录"));
            if (!verified.registered) throw new Error(t("Cursor MCP 未写入成功，请重试连接"));
            setPhase(registered.message);
            setStatus("ready");
            return true;
        } catch (reason) {
            if (attempt.current === current && !abort.signal.aborted) {
                setError(reason instanceof Error ? reason.message : t("连接 Cursor 失败"));
                setStatus("error");
                setPhase("");
            }
            return false;
        }
    };

    const chat = async (input: { prompt: string; sessionId?: string; onText: (text: string) => void; signal?: AbortSignal }) => {
        if (status !== "ready" || !tokenRef.current) throw new Error(t("请先点击连接"));
        try {
            return await streamCursorChat(endpoint, tokenRef.current, input.prompt, input.sessionId, input.onText, input.signal);
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : t("Cursor 对话失败");
            if (/连接|未找|超时|Agent|本地服务|断开|Token|登录/i.test(message)) markDisconnected(message);
            throw reason;
        }
    };

    useEffect(() => {
        if (status !== "ready") return;
        let cancelled = false;
        const check = async () => {
            try {
                const prepare = await prepareCursorConnection(endpoint);
                if (cancelled) return;
                if (!prepare.cliInstalled || !prepare.loggedIn || !prepare.registered || prepare.token !== tokenRef.current) {
                    markDisconnected(prepare.message || t("本地 Agent 连接已断开"));
                }
            } catch (reason) {
                if (!cancelled) markDisconnected(reason instanceof Error ? reason.message : t("本地 Agent 连接已断开"));
            }
        };
        const timer = window.setInterval(() => { void check(); }, HEALTH_INTERVAL_MS);
        const onVisible = () => {
            if (document.visibilityState === "visible") void check();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [status, endpoint]);

    return { status, phase, error, connect, chat, disconnect, markDisconnected, endpoint };
}
