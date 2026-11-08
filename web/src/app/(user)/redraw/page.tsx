"use client";

import { App, Empty, Tag } from "antd";
import localforage from "localforage";
import {
    BookOpen,
    CloudUpload,
    Download,
    ExternalLink,
    FolderOpen,
    Images,
    LoaderCircle,
    Sparkles,
    Trash2,
    Upload,
    VideoIcon,
    X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { saveAs } from "file-saver";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from "react";

import { AssetPickerModal, type AssetPickerTab, type InsertAssetPayload } from "@/app/(user)/canvas/components/asset-picker-modal";
import { RedrawGuide, resetRedrawGuide, shouldOfferRedrawGuide, type RedrawGuideStep } from "@/app/(user)/redraw/components/redraw-guide";
import { REDRAW_DOCS_URL, REDRAW_MAX_ITEMS, REDRAW_RECORD_STORE, formatClock, readRemoteVideoMeta, readVideoFileMeta, resolutionOptions } from "@/app/(user)/redraw/lib";
import { t, useLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { uploadAssetMediaFile } from "@/services/file-storage";
import {
    REDRAW_MAX_BYTES,
    REDRAW_MAX_SECONDS,
    REDRAW_MIN_SECONDS,
    RedrawRequestError,
    billingSecondsFromDuration,
    createRedrawTask,
    extractRedrawError,
    extractRedrawResultUrl,
    isRedrawFailure,
    isRedrawSuccess,
    pollRedrawTask,
    type RedrawResolution,
    type RedrawTask,
} from "@/services/api/redraw";
import { useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";

type QueueItem = {
    id: string;
    title: string;
    previewUrl: string;
    remoteUrl?: string;
    file?: File;
    durationSec: number;
    bytes: number;
    width: number;
    height: number;
};

type RedrawRecord = {
    id: string;
    createdAt: number;
    title: string;
    status: "pending" | "success" | "failed";
    resolution: RedrawResolution;
    seconds: number;
    sourceUrl?: string;
    resultUrl?: string;
    previewUrl?: string;
    error?: string;
    task?: RedrawTask;
    progress?: number;
};

type RecordFilter = "all" | "pending" | "success" | "failed";

const recordStore = localforage.createInstance({ name: "infinite-canvas", storeName: REDRAW_RECORD_STORE });

export default function RedrawPage() {
    const locale = useLocale();
    const { message } = App.useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const config = useEffectiveConfig();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);

    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [resolution, setResolution] = useState<RedrawResolution>("1080p");
    const [records, setRecords] = useState<RedrawRecord[]>([]);
    const [filter, setFilter] = useState<RecordFilter>("all");
    const [dragging, setDragging] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [assetPickerTab, setAssetPickerTab] = useState<AssetPickerTab>("my-assets");
    const [guideOpen, setGuideOpen] = useState(false);
    const [guideKey, setGuideKey] = useState(0);

    const guideSteps: RedrawGuideStep[] = useMemo(
        () => [
            {
                id: "upload",
                title: t("上传视频"),
                description: t("上传待重绘视频。可上传本地视频，或从我的作品 / 素材库选择。"),
            },
            {
                id: "resolution",
                title: t("选择输出清晰度"),
                description: t("在右侧选择 4K / 1080P / 720P，再继续下一步。"),
            },
            {
                id: "submit",
                title: t("开始重绘"),
                description: t("确认设置后点击「开始重绘」。任务异步处理，可在下方记录中查看进度与成片。"),
            },
        ],
        [locale],
    );

    const focusGuideStep = useCallback((step: RedrawGuideStep) => {
        window.requestAnimationFrame(() => document.querySelector(`[data-guide-target="${step.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    }, []);

    const patchRecord = useCallback((id: string, patch: Partial<RedrawRecord>) => {
        setRecords((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    }, []);

    useEffect(() => {
        let cancelled = false;
        const controllers: AbortController[] = [];
        void recordStore.getItem<RedrawRecord[]>("items").then((items) => {
            if (cancelled || !Array.isArray(items)) return;
            setRecords(items);
            for (const record of items) {
                if (record.status !== "pending" || !record.task?.id) continue;
                const controller = new AbortController();
                controllers.push(controller);
                void pollRedrawTask(config, record.task.id, {
                    signal: controller.signal,
                    onProgress: (task) => {
                        const progressRaw = typeof task.progress === "string" ? Number.parseFloat(task.progress) : Number(task.progress);
                        patchRecord(record.id, {
                            task,
                            progress: Number.isFinite(progressRaw) ? progressRaw : undefined,
                            status: isRedrawFailure(task.status) ? "failed" : isRedrawSuccess(task.status) ? "success" : "pending",
                            error: isRedrawFailure(task.status) ? extractRedrawError(task) : undefined,
                            resultUrl: extractRedrawResultUrl(task) || undefined,
                        });
                    },
                })
                    .then((finished) => {
                        patchRecord(record.id, {
                            status: "success",
                            task: finished,
                            resultUrl: extractRedrawResultUrl(finished),
                            progress: 100,
                        });
                        if (config.channelMode === "remote") void useUserStore.getState().hydrateUser();
                    })
                    .catch((error) => {
                        if (controller.signal.aborted) return;
                        const text = error instanceof RedrawRequestError ? error.message : error instanceof Error ? error.message : t("重绘失败");
                        patchRecord(record.id, { status: "failed", error: text });
                    });
            }
        });
        if (shouldOfferRedrawGuide()) setGuideOpen(true);
        return () => {
            cancelled = true;
            for (const controller of controllers) controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- resume pending polls once on mount
    }, [patchRecord]);

    useEffect(() => {
        void recordStore.setItem("items", records.slice(0, 100));
    }, [records]);

    const filteredRecords = useMemo(() => {
        if (filter === "all") return records;
        return records.filter((item) => item.status === filter);
    }, [filter, records]);

    const revokePreview = (url?: string) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };

    const addFiles = useCallback(
        async (files: File[]) => {
            const videos = files.filter((file) => file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name));
            if (!videos.length) {
                message.warning(t("请选择视频文件"));
                return;
            }
            const room = REDRAW_MAX_ITEMS - queue.length;
            if (room <= 0) {
                message.warning(t("单次最多添加 {n} 个视频", { n: REDRAW_MAX_ITEMS }));
                return;
            }
            const next: QueueItem[] = [];
            for (const file of videos.slice(0, room)) {
                if (file.size > REDRAW_MAX_BYTES) {
                    message.error(t("「{name}」超过 200MB，请压缩后再传", { name: file.name }));
                    continue;
                }
                try {
                    const meta = await readVideoFileMeta(file);
                    if (meta.durationSec > REDRAW_MAX_SECONDS + 0.2) {
                        message.error(t("「{name}」超过 60 秒，请先裁剪", { name: file.name }));
                        continue;
                    }
                    if (meta.durationSec > 0 && meta.durationSec < REDRAW_MIN_SECONDS - 0.2) {
                        message.warning(t("「{name}」短于 4 秒，仍可提交", { name: file.name }));
                    }
                    next.push({
                        id: nanoid(),
                        title: file.name,
                        previewUrl: URL.createObjectURL(file),
                        file,
                        durationSec: meta.durationSec || REDRAW_MIN_SECONDS,
                        bytes: file.size,
                        width: meta.width,
                        height: meta.height,
                    });
                } catch {
                    message.error(t("无法读取「{name}」", { name: file.name }));
                }
            }
            if (next.length) setQueue((current) => [...current, ...next]);
        },
        [message, queue.length],
    );

    const addRemoteVideo = useCallback(
        async (payload: InsertAssetPayload) => {
            if (payload.kind !== "video" || !payload.url) {
                message.warning(t("请选择视频素材"));
                return;
            }
            if (queue.length >= REDRAW_MAX_ITEMS) {
                message.warning(t("单次最多添加 {n} 个视频", { n: REDRAW_MAX_ITEMS }));
                return;
            }
            try {
                const meta = await readRemoteVideoMeta(payload.url).catch(() => ({ durationSec: REDRAW_MIN_SECONDS, width: 0, height: 0 }));
                if (meta.durationSec > REDRAW_MAX_SECONDS + 0.2) {
                    message.error(t("视频超过 60 秒，请先裁剪"));
                    return;
                }
                setQueue((current) => [
                    ...current,
                    {
                        id: nanoid(),
                        title: payload.title || t("素材视频"),
                        previewUrl: payload.url,
                        remoteUrl: payload.url,
                        durationSec: meta.durationSec || REDRAW_MIN_SECONDS,
                        bytes: payload.bytes || 0,
                        width: meta.width || payload.width || 0,
                        height: meta.height || payload.height || 0,
                    },
                ]);
            } catch {
                message.error(t("添加素材失败"));
            }
        },
        [message, queue.length],
    );

    const removeQueueItem = (id: string) => {
        setQueue((current) => {
            const target = current.find((item) => item.id === id);
            revokePreview(target?.previewUrl);
            return current.filter((item) => item.id !== id);
        });
    };

    const ensurePublicUrl = async (item: QueueItem) => {
        if (item.remoteUrl && /^https?:\/\//i.test(item.remoteUrl)) return item.remoteUrl;
        if (!item.file) throw new Error(t("缺少可上传的视频文件"));
        message.loading({ content: t("正在上传视频..."), key: `upload-${item.id}`, duration: 0 });
        try {
            const uploaded = await uploadAssetMediaFile(item.file, "redraw-source");
            if (!uploaded.url || !/^https?:\/\//i.test(uploaded.url)) throw new Error(t("上传后未获得公网地址，请检查对象存储配置"));
            return uploaded.url;
        } finally {
            message.destroy(`upload-${item.id}`);
        }
    };

    const startRedraw = async () => {
        if (!queue.length || submitting) return;
        if (config.channelMode === "remote" && !useUserStore.getState().token) {
            message.warning(t("请先登录后再使用云端渠道"));
            return;
        }
        if (config.channelMode === "local" && !config.apiKey && !config.localChannels.some((channel) => channel.apiKey)) {
            openConfigDialog(false);
            message.warning(t("请先配置 API Key"));
            return;
        }
        setSubmitting(true);
        const batch = [...queue];
        setQueue([]);
        try {
            for (const item of batch) {
                const recordId = nanoid();
                const seconds = billingSecondsFromDuration(item.durationSec);
                const draft: RedrawRecord = {
                    id: recordId,
                    createdAt: Date.now(),
                    title: item.title,
                    status: "pending",
                    resolution,
                    seconds,
                    previewUrl: item.previewUrl.startsWith("blob:") ? undefined : item.previewUrl,
                    sourceUrl: item.remoteUrl,
                    progress: 0,
                };
                setRecords((current) => [draft, ...current]);
                try {
                    const videoUrl = await ensurePublicUrl(item);
                    const created = await createRedrawTask(config, { videoUrl, resolution, seconds });
                    patchRecord(recordId, { task: created, sourceUrl: videoUrl, progress: 1 });
                    const finished = await pollRedrawTask(config, created.id, {
                        onProgress: (task) => {
                            const progressRaw = typeof task.progress === "string" ? Number.parseFloat(task.progress) : Number(task.progress);
                            patchRecord(recordId, {
                                task,
                                progress: Number.isFinite(progressRaw) ? progressRaw : undefined,
                                status: isRedrawFailure(task.status) ? "failed" : isRedrawSuccess(task.status) ? "success" : "pending",
                                error: isRedrawFailure(task.status) ? extractRedrawError(task) : undefined,
                                resultUrl: extractRedrawResultUrl(task) || undefined,
                            });
                        },
                    });
                    patchRecord(recordId, {
                        status: "success",
                        task: finished,
                        resultUrl: extractRedrawResultUrl(finished),
                        progress: 100,
                    });
                    if (config.channelMode === "remote") void useUserStore.getState().hydrateUser();
                } catch (error) {
                    const text = error instanceof RedrawRequestError ? error.message : error instanceof Error ? error.message : t("重绘失败");
                    patchRecord(recordId, { status: "failed", error: text });
                    message.error(text);
                } finally {
                    revokePreview(item.previewUrl);
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    const onDrop = (event: ReactDragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        void addFiles(Array.from(event.dataTransfer.files || []));
    };

    return (
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                    <header className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">AI Diffusion Redraw</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-white">{t("顶级重绘")}</h1>
                            <Tag className="m-0 rounded-full border-0 !bg-orange-500/15 !text-orange-600 dark:!text-orange-300">{t("热门")}</Tag>
                        </div>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 dark:text-stone-400">
                            {t("扩散模型逐帧重绘，补细节、修模糊与 AI 违和感。支持 720P / 1080P / 4K。")}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                            <a href={REDRAW_DOCS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-500 dark:text-sky-400">
                                <BookOpen className="size-3.5" />
                                {t("API 文档")}
                                <ExternalLink className="size-3" />
                            </a>
                            <button type="button" className="inline-flex items-center gap-1 text-stone-500 transition hover:text-stone-950 dark:hover:text-white" onClick={() => openConfigDialog(false)}>
                                {t("管理 API Key")}
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 text-stone-500 transition hover:text-stone-950 dark:hover:text-white"
                                onClick={() => {
                                    resetRedrawGuide();
                                    setGuideKey((value) => value + 1);
                                    setGuideOpen(true);
                                }}
                            >
                                {t("新手引导")}
                            </button>
                        </div>
                    </header>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <section
                            data-guide-target="upload"
                            className={cn(
                                "relative overflow-hidden rounded-2xl border bg-white p-4 dark:bg-[#141414]",
                                dragging ? "border-sky-400 dark:border-sky-500" : "border-stone-200 dark:border-white/[0.08]",
                            )}
                            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                            onDragOver={(event) => event.preventDefault()}
                            onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
                            onDrop={onDrop}
                        >
                            {queue.length === 0 ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-6 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
                                    <div className="grid size-14 place-items-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                        <CloudUpload className="size-7" />
                                    </div>
                                    <div className="mt-4 text-sm font-medium text-stone-950 dark:text-white">{t("拖拽视频到这里，或点击上传")}</div>
                                    <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t("支持 mp4 / mov，单文件 ≤ 200MB，时长 4–60 秒")}</div>
                                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 text-sm font-medium text-white hover:bg-sky-400" onClick={() => fileInputRef.current?.click()}>
                                            <Upload className="size-4" />
                                            {t("上传视频")}
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 text-sm text-stone-700 hover:bg-stone-50 dark:border-white/[0.1] dark:bg-transparent dark:text-stone-200 dark:hover:bg-white/[0.04]"
                                            onClick={() => {
                                                setAssetPickerTab("my-assets");
                                                setAssetPickerOpen(true);
                                            }}
                                        >
                                            <FolderOpen className="size-4" />
                                            {t("我的作品")}
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 text-sm text-stone-700 hover:bg-stone-50 dark:border-white/[0.1] dark:bg-transparent dark:text-stone-200 dark:hover:bg-white/[0.04]"
                                            onClick={() => {
                                                setAssetPickerTab("library");
                                                setAssetPickerOpen(true);
                                            }}
                                        >
                                            <Images className="size-4" />
                                            {t("素材库")}
                                        </button>
                                    </div>
                                    <div className="mt-4 text-xs text-stone-400">{t("视频")}：{queue.length}/{REDRAW_MAX_ITEMS}</div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium text-stone-950 dark:text-white">{t("待重绘视频")} · {queue.length}/{REDRAW_MAX_ITEMS}</div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg border border-stone-200 px-2.5 text-xs text-stone-600 dark:border-white/[0.1] dark:text-stone-300" onClick={() => fileInputRef.current?.click()}>
                                                <Upload className="size-3.5" />
                                                {t("继续添加")}
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-stone-200 px-2.5 text-xs text-stone-600 dark:border-white/[0.1] dark:text-stone-300"
                                                onClick={() => {
                                                    setAssetPickerTab("my-assets");
                                                    setAssetPickerOpen(true);
                                                }}
                                            >
                                                <FolderOpen className="size-3.5" />
                                                {t("素材")}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {queue.map((item) => (
                                            <div key={item.id} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 dark:border-white/[0.08] dark:bg-white/[0.03]">
                                                <div className="relative aspect-video bg-black/90">
                                                    <video src={item.previewUrl} className="size-full object-contain" muted playsInline preload="metadata" />
                                                    <button type="button" className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white" onClick={() => removeQueueItem(item.id)} aria-label={t("移除")}>
                                                        <X className="size-3.5" />
                                                    </button>
                                                </div>
                                                <div className="space-y-1 px-3 py-2.5">
                                                    <div className="truncate text-sm font-medium text-stone-950 dark:text-white">{item.title}</div>
                                                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                                                        {formatClock(item.durationSec * 1000)}
                                                        {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        <aside className="space-y-4">
                            <section data-guide-target="resolution" className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#141414]">
                                <div className="text-sm font-medium text-stone-950 dark:text-white">{t("重绘设置")}</div>
                                <div className="mt-3 text-xs text-stone-500 dark:text-stone-400">{t("输出清晰度")}</div>
                                <div className="mt-2 grid gap-2">
                                    {resolutionOptions.map((option) => {
                                        const active = resolution === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={cn(
                                                    "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition",
                                                    active
                                                        ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                                        : "border-stone-200 text-stone-600 hover:border-stone-300 dark:border-white/[0.08] dark:text-stone-300 dark:hover:border-white/[0.16]",
                                                )}
                                                onClick={() => setResolution(option.value)}
                                            >
                                                {t(option.label)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#141414]">
                                <p className="text-[11px] leading-5 text-stone-400">{t("最长 60 秒 · 文件 ≤ 200MB · 建议 24–60 fps")}</p>
                                <button
                                    data-guide-target="submit"
                                    type="button"
                                    disabled={!queue.length || submitting}
                                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 dark:disabled:bg-white/10 dark:disabled:text-stone-500"
                                    onClick={() => void startRedraw()}
                                >
                                    {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                    {submitting ? t("提交中...") : t("开始重绘")}
                                </button>
                            </section>
                        </aside>
                    </div>

                    {guideOpen ? (
                        <RedrawGuide key={guideKey} steps={guideSteps} onStepChange={focusGuideStep} onClose={() => setGuideOpen(false)} />
                    ) : null}

                    <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#141414]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm font-medium text-stone-950 dark:text-white">{t("重绘记录")}</div>
                            <div className="flex flex-wrap items-center gap-1 rounded-full border border-stone-200 p-1 dark:border-white/[0.08]">
                                {(
                                    [
                                        ["all", t("全部")],
                                        ["pending", t("进行中")],
                                        ["success", t("已完成")],
                                        ["failed", t("失败")],
                                    ] as const
                                ).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={cn(
                                            "h-7 rounded-full px-3 text-xs transition",
                                            filter === key ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950" : "text-stone-500 hover:text-stone-950 dark:hover:text-white",
                                        )}
                                        onClick={() => setFilter(key)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredRecords.length === 0 ? (
                            <div className="py-12">
                                <Empty description={t("暂无记录。添加视频并选择输出后，点击开始重绘。")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {filteredRecords.map((record) => (
                                    <RecordRow
                                        key={record.id}
                                        record={record}
                                        onDelete={() => setRecords((current) => current.filter((item) => item.id !== record.id))}
                                        onDownload={async () => {
                                            if (!record.resultUrl) return;
                                            try {
                                                const response = await fetch(record.resultUrl);
                                                const blob = await response.blob();
                                                saveAs(blob, `${record.title.replace(/\.[^.]+$/, "") || "redraw"}-${record.resolution}.mp4`);
                                            } catch {
                                                window.open(record.resultUrl, "_blank", "noopener,noreferrer");
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v"
                multiple
                className="hidden"
                onChange={(event) => {
                    void addFiles(Array.from(event.target.files || []));
                    event.target.value = "";
                }}
            />

            <AssetPickerModal
                open={assetPickerOpen}
                defaultTab={assetPickerTab}
                onClose={() => setAssetPickerOpen(false)}
                onInsert={(payload) => {
                    setAssetPickerOpen(false);
                    void addRemoteVideo(payload);
                }}
            />
        </div>
    );
}

function RecordRow({ record, onDelete, onDownload }: { record: RedrawRecord; onDelete: () => void; onDownload: () => void }) {
    useLocale();
    const statusLabel =
        record.status === "pending" ? t("进行中") : record.status === "success" ? t("已完成") : t("失败");
    const statusClass =
        record.status === "pending"
            ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
            : record.status === "success"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/15 text-rose-700 dark:text-rose-300";

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-stone-200 p-3 sm:flex-row sm:items-center dark:border-white/[0.08]">
            <div className="relative h-20 w-full overflow-hidden rounded-lg bg-stone-100 sm:w-36 dark:bg-white/[0.04]">
                {record.resultUrl || record.previewUrl || record.sourceUrl ? (
                    <video src={record.resultUrl || record.previewUrl || record.sourceUrl} className="size-full object-cover" muted playsInline preload="metadata" />
                ) : (
                    <div className="grid size-full place-items-center text-stone-400">
                        <VideoIcon className="size-5" />
                    </div>
                )}
                {record.status === "pending" ? (
                    <div className="absolute inset-0 grid place-items-center bg-black/35 text-white">
                        <LoaderCircle className="size-5 animate-spin" />
                    </div>
                ) : null}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-medium text-stone-950 dark:text-white">{record.title}</div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusClass)}>{statusLabel}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500 dark:bg-white/[0.06] dark:text-stone-400">{record.resolution.toUpperCase()}</span>
                </div>
                <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {new Date(record.createdAt).toLocaleString()} · {record.seconds}s
                    {typeof record.progress === "number" && record.status === "pending" ? ` · ${Math.round(record.progress)}%` : ""}
                </div>
                {record.error ? <div className="mt-1 text-xs text-rose-500">{record.error}</div> : null}
            </div>
            <div className="flex items-center gap-1.5">
                {record.resultUrl ? (
                    <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg border border-stone-200 px-2.5 text-xs text-stone-600 dark:border-white/[0.1] dark:text-stone-300" onClick={onDownload}>
                        <Download className="size-3.5" />
                        {t("下载")}
                    </button>
                ) : null}
                <button type="button" className="inline-flex size-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 dark:border-white/[0.1]" onClick={onDelete} aria-label={t("删除")}>
                    <Trash2 className="size-3.5" />
                </button>
            </div>
        </div>
    );
}
