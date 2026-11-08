import axios from "axios";

import { modelChannelAttributionHeaders } from "@/lib/model-channel";
import { t } from "@/i18n";
import { buildApiUrl, channelIdForActiveModel, channelProtocolForConfig, localChannelForActiveModel, type AiConfig } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";

export const REDRAW_MODEL = "omniall-redraw-1";
export const REDRAW_POLL_INTERVAL_MS = 10000;
export const REDRAW_MAX_SECONDS = 60;
export const REDRAW_MIN_SECONDS = 4;
export const REDRAW_MAX_BYTES = 200 * 1024 * 1024;

export type RedrawResolution = "720p" | "1080p" | "4k";

export type RedrawTask = {
    id: string;
    task_id?: string;
    status?: string;
    progress?: number | string;
    model?: string;
    video_url?: string;
    result_url?: string;
    url?: string;
    fail_reason?: string;
    error?: { message?: string } | string;
    seconds?: string | number;
    created_at?: string | number;
};

type ApiEnvelope = { code?: number; data?: RedrawTask | null; msg?: string; message?: string };

export class RedrawRequestError extends Error {
    detail?: string;
    constructor(message: string, detail?: string) {
        super(message);
        this.name = "RedrawRequestError";
        this.detail = detail;
    }
}

function usesAccountProxy(config: AiConfig) {
    const token = useUserStore.getState().token;
    return config.channelMode === "remote" || (config.channelMode === "local" && Boolean(token));
}

function aiApiUrl(config: AiConfig, path: string) {
    if (usesAccountProxy(config)) return `/api/v1${path}`;
    const channel = localChannelForActiveModel(config);
    return buildApiUrl(channel?.baseUrl || config.baseUrl, path);
}

function aiHeaders(config: AiConfig) {
    const token = useUserStore.getState().token;
    if (config.channelMode === "remote" && !token) throw new Error(t("请先登录后再使用云端渠道"));
    if (config.channelMode === "remote") {
        return {
            Authorization: `Bearer ${token}`,
            ...(channelIdForActiveModel(config) ? { "X-Model-Channel-ID": channelIdForActiveModel(config) } : {}),
        };
    }
    if (token) {
        return {
            Authorization: `Bearer ${token}`,
            ...(channelIdForActiveModel(config) ? { "X-User-Model-Channel-ID": channelIdForActiveModel(config) } : {}),
        };
    }
    return {
        Authorization: `Bearer ${localChannelForActiveModel(config)?.apiKey || config.apiKey}`,
        ...modelChannelAttributionHeaders(channelProtocolForConfig(config)),
    };
}

function unwrapTask(payload: RedrawTask | ApiEnvelope | null | undefined): RedrawTask {
    if (!payload || typeof payload !== "object") throw new RedrawRequestError(t("重绘接口返回异常"));
    if ("data" in payload && payload.data && typeof payload.data === "object") return payload.data;
    return payload as RedrawTask;
}

function taskIdOf(task: RedrawTask) {
    return String(task.id || task.task_id || "").trim();
}

export function isRedrawSuccess(status?: string) {
    const value = String(status || "").toLowerCase();
    return value === "success" || value === "succeeded" || value === "completed" || value === "done";
}

export function isRedrawFailure(status?: string) {
    const value = String(status || "").toLowerCase();
    return value === "failed" || value === "failure" || value === "error" || value === "cancelled" || value === "canceled";
}

export function extractRedrawResultUrl(task: RedrawTask) {
    return String(task.result_url || task.video_url || task.url || "").trim();
}

export function extractRedrawError(task: RedrawTask) {
    if (typeof task.error === "string" && task.error.trim()) return task.error.trim();
    if (task.error && typeof task.error === "object" && task.error.message) return task.error.message;
    return String(task.fail_reason || "").trim();
}

/** 自研重绘计费秒：max(4, ceil(durationSec - 0.1))，且不超过 60 */
export function billingSecondsFromDuration(durationSec: number) {
    if (!Number.isFinite(durationSec) || durationSec <= 0) return REDRAW_MIN_SECONDS;
    const value = Math.max(REDRAW_MIN_SECONDS, Math.ceil(durationSec - 0.1));
    return Math.min(REDRAW_MAX_SECONDS, value);
}

export async function createRedrawTask(
    config: AiConfig,
    input: { videoUrl: string; resolution: RedrawResolution; seconds: number; prompt?: string },
    options?: { signal?: AbortSignal },
) {
    const seconds = Math.max(REDRAW_MIN_SECONDS, Math.min(REDRAW_MAX_SECONDS, Math.round(input.seconds) || REDRAW_MIN_SECONDS));
    const body = {
        model: REDRAW_MODEL,
        prompt: (input.prompt || "重绘").trim() || "重绘",
        video_url: input.videoUrl,
        duration: seconds,
        seconds,
        resolution: input.resolution,
    };
    try {
        const response = await axios.post<RedrawTask | ApiEnvelope>(aiApiUrl(config, "/video/generations"), body, {
            headers: { ...aiHeaders(config), "Content-Type": "application/json" },
            signal: options?.signal,
        });
        const task = unwrapTask(response.data);
        const id = taskIdOf(task);
        if (!id) throw new RedrawRequestError(t("重绘接口没有返回任务 ID"));
        if (usesAccountProxy(config)) void useUserStore.getState().hydrateUser();
        return { ...task, id, task_id: task.task_id || id };
    } catch (error) {
        if (error instanceof RedrawRequestError) throw error;
        if (axios.isAxiosError(error)) {
            const data = error.response?.data as { msg?: string; message?: string; error?: { message?: string } } | string | undefined;
            const message =
                (typeof data === "object" && data && (data.msg || data.message || data.error?.message)) ||
                error.message ||
                t("创建重绘任务失败");
            throw new RedrawRequestError(String(message));
        }
        throw new RedrawRequestError(error instanceof Error ? error.message : t("创建重绘任务失败"));
    }
}

export async function fetchRedrawTask(config: AiConfig, taskId: string, options?: { signal?: AbortSignal }) {
    try {
        const response = await axios.get<RedrawTask | ApiEnvelope>(aiApiUrl(config, `/video/generations/${encodeURIComponent(taskId)}`), {
            headers: aiHeaders(config),
            signal: options?.signal,
        });
        const task = unwrapTask(response.data);
        return { ...task, id: taskIdOf(task) || taskId };
    } catch (error) {
        // 部分网关只开放 /videos/{id}
        try {
            const response = await axios.get<RedrawTask | ApiEnvelope>(aiApiUrl(config, `/videos/${encodeURIComponent(taskId)}`), {
                headers: aiHeaders(config),
                signal: options?.signal,
            });
            const task = unwrapTask(response.data);
            return { ...task, id: taskIdOf(task) || taskId };
        } catch {
            if (axios.isAxiosError(error)) {
                const data = error.response?.data as { msg?: string; message?: string } | undefined;
                throw new RedrawRequestError(data?.msg || data?.message || error.message || t("查询重绘任务失败"));
            }
            throw new RedrawRequestError(error instanceof Error ? error.message : t("查询重绘任务失败"));
        }
    }
}

export async function pollRedrawTask(
    config: AiConfig,
    taskId: string,
    options?: { signal?: AbortSignal; onProgress?: (task: RedrawTask) => void; intervalMs?: number },
) {
    const interval = options?.intervalMs || REDRAW_POLL_INTERVAL_MS;
    while (true) {
        options?.signal?.throwIfAborted();
        const task = await fetchRedrawTask(config, taskId, { signal: options?.signal });
        options?.onProgress?.(task);
        if (isRedrawSuccess(task.status)) return task;
        if (isRedrawFailure(task.status)) {
            throw new RedrawRequestError(extractRedrawError(task) || t("重绘失败"));
        }
        await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => resolve(), interval);
            options?.signal?.addEventListener(
                "abort",
                () => {
                    window.clearTimeout(timer);
                    reject(options.signal!.reason || new DOMException("Aborted", "AbortError"));
                },
                { once: true },
            );
        });
    }
}
