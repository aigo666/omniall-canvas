"use client";

import { t } from "@/i18n";
import { useState } from "react";
import { Button, Tooltip } from "antd";
import { ChevronDown, Info, RefreshCw } from "lucide-react";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";


export const CODEX_PLUGIN_INSTALLED_KEY = "omniall:codex-plugin-installed";
export const CURSOR_PLUGIN_INSTALLED_KEY = "omniall:cursor-plugin-installed";

function PluginReconnectButton({ connecting, onReconnect, color }: { connecting?: boolean; onReconnect?: () => void; color: string }) {
    if (!onReconnect) return null;
    return (
        <Tooltip title={t("刷新连接")}>
            <button
                type="button"
                className="inline-flex shrink-0 rounded p-0.5 transition hover:opacity-80 disabled:opacity-40"
                style={{ color }}
                disabled={connecting}
                onClick={(event) => { event.stopPropagation(); onReconnect(); }}
                aria-label={t("刷新连接")}
            >
                <RefreshCw className={`size-3.5 ${connecting ? "animate-spin" : ""}`} />
            </button>
        </Tooltip>
    );
}

function CodexLogo() {
    return (
        <svg viewBox="0 0 32 32" className="size-10 shrink-0 rounded-lg" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#111111" />
            <path fill="#ffffff" d="M16 5.2c.7 3.6 2.2 6.2 4.6 8.2 2.4 2 5 3.1 8.2 3.6-3.2.5-5.8 1.6-8.2 3.6-2.4 2-3.9 4.6-4.6 8.2-.7-3.6-2.2-6.2-4.6-8.2-2.4-2-5-3.1-8.2-3.6 3.2-.5 5.8-1.6 8.2-3.6 2.4-2 3.9-4.6 4.6-8.2Z" />
        </svg>
    );
}

export function CanvasCodexPluginCard({ connecting, connected, phase, error, onConnect, onStart, onReconnect, onInstalledChange }: {
    connecting?: boolean;
    connected?: boolean;
    phase?: string;
    error?: string;
    onConnect: () => void;
    onStart?: () => void;
    onReconnect?: () => void;
    onInstalledChange?: (installed: boolean) => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [open, setOpen] = useState(true);
    const [installed, setInstalled] = useState(() => {
        try { return localStorage.getItem(CODEX_PLUGIN_INSTALLED_KEY) === "1"; } catch { return false; }
    });
    const install = () => {
        try { localStorage.setItem(CODEX_PLUGIN_INSTALLED_KEY, "1"); } catch { /* 仍更新当前界面 */ }
        setInstalled(true);
        onInstalledChange?.(true);
    };
    const showReconnect = Boolean(onReconnect && (connected || error));
    return (
        <div>
            <button type="button" className="flex w-full items-center gap-1.5 py-1 text-xs" style={{ color: theme.node.muted }} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
                <ChevronDown className="size-3.5" style={{ transform: open ? undefined : "rotate(-90deg)" }} />
                <span>{t("插件")}</span>
                <span className="ml-auto rounded-full px-1.5 py-0.5 text-[11px]" style={{ background: theme.node.fill, color: theme.node.text }}>2</span>
            </button>
            {open ? (
                <div className="mt-1 flex items-start gap-2.5 rounded-md px-1.5 py-2" style={{ background: theme.toolbar.itemHover }}>
                    <CodexLogo />
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1">
                            <div className="truncate text-sm font-medium leading-5" style={{ color: theme.node.text }}>Codex Agent</div>
                            <Tooltip title={<span className="block max-w-64 text-xs leading-5">{t("把当前画布接到本机 Codex。需要本机先安装 Codex：已安装会直接使用，未安装会打开安装说明；未登录会引导浏览器登录。安装、登录和模型都就绪后才会显示已连接。")}</span>}>
                                <button type="button" className="inline-flex shrink-0" style={{ color: theme.node.faint }} aria-label={t("Codex Agent 功能说明")}><Info className="size-3.5" /></button>
                            </Tooltip>
                            {connected ? <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] leading-4" style={{ background: "color-mix(in srgb, #22c55e 18%, transparent)", color: "#16a34a" }}>{t("已连接")}</span> : null}
                            {showReconnect ? <PluginReconnectButton connecting={connecting} onReconnect={onReconnect} color={theme.node.faint} /> : null}
                        </div>
                        <div className="truncate text-xs leading-5" style={{ color: theme.node.muted }}>{t("在 Codex 对话里操作当前画布")}</div>
                        <div className="truncate text-[11px] leading-4" style={{ color: theme.node.faint }}>OmniAll</div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                        <Button size="small" disabled={installed} onClick={install}>{installed ? t("已安装") : t("安装")}</Button>
                        <Button size="small" type="primary" loading={connecting} onClick={connected ? onStart : onConnect}>{connected ? t("开始创作") : t("连接")}</Button>
                    </div>
                </div>
            ) : null}
            {connecting && phase ? <p className="mt-2 text-xs leading-5" style={{ color: theme.node.muted }}>{phase}</p> : null}
            {error ? <p className="mt-2 text-xs leading-5 text-red-500" role="alert">{error}</p> : null}
        </div>
    );
}

function CursorLogo() {
    return (
        <svg viewBox="0 0 32 32" className="size-10 shrink-0 rounded-lg" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#111111" />
            <path fill="#ffffff" d="M8.2 8.4 23.6 15.2c.8.4.8 1.5 0 1.9L8.2 23.9c-.9.4-1.8-.4-1.5-1.3l2.1-6.2c.1-.3.1-.7 0-1l-2.1-6.2c-.3-.9.6-1.7 1.5-1.3Z" />
        </svg>
    );
}

export function CanvasCursorPluginCard({ connecting, connected, phase, error, onConnect, onStart, onReconnect, onInstalledChange }: {
    connecting?: boolean;
    connected?: boolean;
    phase?: string;
    error?: string;
    onConnect: () => void;
    onStart?: () => void;
    onReconnect?: () => void;
    onInstalledChange?: (installed: boolean) => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [installed, setInstalled] = useState(() => {
        try { return localStorage.getItem(CURSOR_PLUGIN_INSTALLED_KEY) === "1"; } catch { return false; }
    });
    const install = () => {
        try { localStorage.setItem(CURSOR_PLUGIN_INSTALLED_KEY, "1"); } catch { /* 仍更新当前界面 */ }
        setInstalled(true);
        onInstalledChange?.(true);
    };
    const showReconnect = Boolean(onReconnect && (connected || error));
    return (
        <div className="mt-1">
            <div className="flex items-start gap-2.5 rounded-md px-1.5 py-2" style={{ background: theme.toolbar.itemHover }}>
                <CursorLogo />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1">
                        <div className="truncate text-sm font-medium leading-5" style={{ color: theme.node.text }}>Cursor</div>
                        <Tooltip title={<span className="block max-w-64 text-xs leading-5">{t("把当前画布接到本机 Cursor。未安装会打开下载页；没有 Cursor CLI 会提示安装命令；未登录会打开浏览器登录。安装、登录和画布 MCP 都就绪后才会显示已连接。开始创作后，在 OmniAll 面板里用 Cursor 对话操作这张画布。")}</span>}>
                            <button type="button" className="inline-flex shrink-0" style={{ color: theme.node.faint }} aria-label={t("Cursor 功能说明")}><Info className="size-3.5" /></button>
                        </Tooltip>
                        {connected ? <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] leading-4" style={{ background: "color-mix(in srgb, #22c55e 18%, transparent)", color: "#16a34a" }}>{t("已连接")}</span> : null}
                        {showReconnect ? <PluginReconnectButton connecting={connecting} onReconnect={onReconnect} color={theme.node.faint} /> : null}
                    </div>
                    <div className="truncate text-xs leading-5" style={{ color: theme.node.muted }}>{t("在 OmniAll 面板里用 Cursor 操作当前画布")}</div>
                    <div className="truncate text-[11px] leading-4" style={{ color: theme.node.faint }}>OmniAll</div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                    <Button size="small" disabled={installed} onClick={install}>{installed ? t("已安装") : t("安装")}</Button>
                    <Button size="small" type="primary" loading={connecting} onClick={connected ? onStart : onConnect}>{connected ? t("开始创作") : t("连接")}</Button>
                </div>
            </div>
            {connecting && phase ? <p className="mt-2 text-xs leading-5" style={{ color: theme.node.muted }}>{phase}</p> : null}
            {error ? <p className="mt-2 text-xs leading-5 text-red-500" role="alert">{error}</p> : null}
        </div>
    );
}
