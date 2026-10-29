"use client";

import { t, useLocale } from "@/i18n";
import { ChevronRight, Clapperboard, Flame, Globe2, ImagePlus, Maximize2, Sparkles, Video, Workflow, type LucideIcon } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { App, Image } from "antd";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fetchPrompts, type Prompt } from "@/services/api/prompts";
import { cn } from "@/lib/utils";
import { uploadAssetMediaFile } from "@/services/file-storage";
import { uploadImage } from "@/services/image-storage";
import { HomeAquaInkBackground } from "@/components/home/home-aquaink-background";
import { useEffectiveConfig } from "@/stores/use-config-store";
import { AssetPickerModal } from "./canvas/components/asset-picker-modal";
import { CanvasAssistantComposer } from "./canvas/components/canvas-assistant-composer";
import { getNodeSpec } from "./canvas/constants";
import { useCanvasStore } from "./canvas/stores/use-canvas-store";
import { canvasResourceLabel } from "./canvas/utils/canvas-resource-references";
import {
    MAX_CANVAS_AGENT_SKILLS,
    CanvasNodeType,
    type CanvasAgentConfig,
    type CanvasAgentSkillSelection,
    type CanvasAssistantReference,
    type InsertAssetPayload,
    type PendingAgentAsset,
} from "./canvas/types";


type QuickEntry = {
    key: string;
    label: string;
    icon: LucideIcon;
    href?: string;
    tileClass: string;
    borderClass: string;
    flowBorder?: boolean;
    preview?: { imageUrl: string; videoUrl?: string; title: string; description: string };
};

const QUICK_ENTRIES: QuickEntry[] = [
    {
        key: "canvas",
        get label() { return t("自由画布"); },
        icon: Maximize2,
        tileClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        borderClass: "border-emerald-500/25 hover:border-emerald-500/60",
        flowBorder: true,
        preview: {
            imageUrl: "https://gcore.jsdelivr.net/gh/tigerowo/cdn-tdeh@v0.4/img/infinite-canvas/agent.webp",
            videoUrl: "https://gcore.jsdelivr.net/gh/tigerowo/cdn-tdeh@v0.4/img/infinite-canvas/agent.webm",
            get title() { return t("Agent 一句话成片"); },
            get description() { return t("Agent 辅助灵感创作，快速生成完整作品"); },
        },
    },
    {
        key: "director",
        get label() { return t("3D导演台"); },
        icon: Clapperboard,
        tileClass: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
        borderClass: "border-fuchsia-500/25 hover:border-fuchsia-500/60",
        preview: {
            imageUrl: "https://gcore.jsdelivr.net/gh/tigerowo/cdn-tdeh@v0.4/img/infinite-canvas/3ddirector.webp",
            get title() { return t("3D 导演台"); },
            get description() { return t("在独立 3D 场景中布置角色、模型与机位，快速完成镜头预演"); },
        },
    },
    {
        key: "panorama",
        get label() { return t("全景图"); },
        icon: Globe2,
        tileClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        borderClass: "border-amber-500/25 hover:border-amber-500/60",
        preview: {
            imageUrl: "https://gcore.jsdelivr.net/gh/tigerowo/cdn-tdeh@v0.4/img/infinite-canvas/panorama.webp",
            get title() { return t("全景图"); },
            get description() { return t("建筑内景、风景全景、沉浸视角"); },
        },
    },
    { key: "image", get label() { return t("生图工作台"); }, icon: ImagePlus, href: "/image", tileClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400", borderClass: "border-violet-500/25 hover:border-violet-500/60" },
    { key: "video", get label() { return t("视频创作台"); }, icon: Video, href: "/video", tileClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400", borderClass: "border-sky-500/25 hover:border-sky-500/60" },
    { key: "workflows", get label() { return t("创意工作流"); }, icon: Workflow, href: "/workflows", tileClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400", borderClass: "border-rose-500/25 hover:border-rose-500/60" },
];

const SHOWCASE_LIMIT = 8;

const HOME_PLACEHOLDERS = [
    "描述创作目标，或让我继续操作画布",
    "用自由画布一句话生成完整分镜故事",
    "在生图工作台画出产品主图与海报",
    "在视频创作台快速生成高质量短片",
    "用 3D 导演台布置角色、场景和机位",
    "在画布中生成建筑内景与风景全景",
    "打开 Skill，按品牌宣传流程创作",
    "从提示词库挑选灵感并一键填充",
    "用创意工作流批量完成系列内容",
];

function QuickEntryButton({ entry, onClick }: { entry: QuickEntry; onClick?: () => void }) {
    const Icon = entry.icon;
    const [hovered, setHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const preview = entry.preview;

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !preview?.videoUrl) return;

        let cancelled = false;

        if (!hovered) {
            video.pause();
            try {
                video.currentTime = 0;
            } catch {}
            return;
        }

        const playFromStart = async () => {
            try {
                if (video.readyState < 1) {
                    await new Promise<void>((resolve, reject) => {
                        const onMeta = () => {
                            cleanup();
                            resolve();
                        };
                        const onError = () => {
                            cleanup();
                            reject(new Error("video metadata failed"));
                        };
                        const cleanup = () => {
                            video.removeEventListener("loadedmetadata", onMeta);
                            video.removeEventListener("error", onError);
                        };
                        video.addEventListener("loadedmetadata", onMeta);
                        video.addEventListener("error", onError);
                        video.load();
                    });
                }
                if (cancelled) return;
                video.pause();
                video.currentTime = 0;
                if (video.seeking) {
                    await new Promise<void>((resolve) => {
                        const onSeeked = () => {
                            video.removeEventListener("seeked", onSeeked);
                            resolve();
                        };
                        video.addEventListener("seeked", onSeeked);
                    });
                }
                if (!cancelled) await video.play();
            } catch {
                // ignore aborted play / seek
            }
        };

        void playFromStart();
        return () => {
            cancelled = true;
            video.pause();
        };
    }, [hovered, preview?.videoUrl]);

    const className = cn(
        "inline-flex h-10 items-center gap-2 rounded-xl border !bg-white pl-1.5 pr-3.5 text-[13px] !text-stone-700 transition hover:!text-stone-950 dark:!bg-[#141414] dark:!text-stone-200 dark:hover:!text-white",
        entry.borderClass,
        entry.flowBorder && "flow-border",
        entry.flowBorder && hovered && "ring-1 ring-emerald-400/30",
    );
    const content = (
        <>
            <span className={cn("grid h-7 w-9 place-items-center rounded-lg", entry.tileClass)}>
                <Icon className="size-4" />
            </span>
            {entry.label}
        </>
    );

    return (
        <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}>
            {entry.href ? (
                <Link href={entry.href} className={className}>
                    {content}
                </Link>
            ) : (
                <button type="button" onClick={onClick} className={className}>
                    {content}
                </button>
            )}
            {preview ? (
                <div
                    className={cn(
                        "pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-30 w-[280px] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition duration-200",
                        hovered ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0",
                    )}
                >
                    <div className="relative aspect-video overflow-hidden bg-stone-900">
                        <img src={preview.imageUrl} alt={preview.title} className="absolute inset-0 h-full w-full object-cover" />
                        {preview.videoUrl ? (
                            <video ref={videoRef} src={preview.videoUrl} poster={preview.imageUrl} muted loop playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" onLoadedMetadata={(event) => { event.currentTarget.currentTime = 0; }} />
                        ) : null}
                    </div>
                    <div className="space-y-1 px-3.5 py-3">
                        <div className="text-sm font-semibold text-white">{preview.title}</div>
                        <p className="text-xs leading-5 text-stone-400">{preview.description}</p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function toPendingAgentAsset(payload: InsertAssetPayload, label: string): PendingAgentAsset {
    const nodeId = nanoid();
    let reference: CanvasAssistantReference;
    if (payload.kind === "text") {
        reference = { id: nodeId, type: CanvasNodeType.Text, title: payload.title, label, text: payload.content };
    } else {
        const common = { id: nodeId, title: payload.title, label, storageKey: payload.storageKey, mimeType: payload.mimeType };
        if (payload.kind === "image") reference = { ...common, type: CanvasNodeType.Image, dataUrl: payload.dataUrl };
        else if (payload.kind === "video") reference = { ...common, type: CanvasNodeType.Video, url: payload.url };
        else reference = { ...common, type: CanvasNodeType.Audio, url: payload.url };
    }
    return { nodeId, payload, reference };
}

export default function IndexPage() {
    useLocale();
    const { message } = App.useApp();
    const router = useRouter();
    const effectiveConfig = useEffectiveConfig();
    const createProject = useCanvasStore((state) => state.createProject);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const [promptShowcase, setPromptShowcase] = useState<Prompt[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [pendingAssets, setPendingAssets] = useState<PendingAgentAsset[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<CanvasAgentSkillSelection[]>([]);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [agentConfig, setAgentConfig] = useState<CanvasAgentConfig>(() => ({
        textApiMode: "chat",
        autoGenerateMedia: false,
        imageQuality: effectiveConfig.quality,
        imageSize: effectiveConfig.size,
        videoQuality: effectiveConfig.vquality,
        videoSize: effectiveConfig.videoSize,
    }));
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const pendingAssetCountsRef = useRef<Record<InsertAssetPayload["kind"], number>>({ text: 0, image: 0, video: 0, audio: 0 });

    useEffect(() => {
        void fetchPrompts({ pageSize: 12 })
            .then((data) => setPromptShowcase(data.items))
            .catch((error) => message.error(error instanceof Error ? error.message : t("获取提示词失败")));
    }, [message]);

    const addPendingAsset = (payload: InsertAssetPayload) => {
        const asset = toPendingAgentAsset(payload, canvasResourceLabel(payload.kind, pendingAssetCountsRef.current[payload.kind]++));
        setPendingAssets((current) => [...current, asset]);
        setPrompt((current) => `${current}${current.endsWith(" ") ? "" : " "}${asset.reference.label} `);
    };

    const uploadFile = async (file: File) => {
        try {
            if (file.type.startsWith("image/")) {
                const uploaded = await uploadImage(file);
                addPendingAsset({ kind: "image", dataUrl: uploaded.url, title: file.name, ...uploaded });
            } else if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
                const uploaded = await uploadAssetMediaFile(file);
                if (file.type.startsWith("video/")) addPendingAsset({ kind: "video", title: file.name, ...uploaded });
                else addPendingAsset({ kind: "audio", title: file.name, ...uploaded });
            } else {
                throw new Error(t("仅支持图片、视频和音频文件"));
            }
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("素材上传失败"));
        }
    };

    const onUploadInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void uploadFile(file);
    };

    const submit = (nextPrompt = prompt, referenceIds = pendingAssets.map((asset) => asset.nodeId)) => {
        const text = nextPrompt.trim();
        if (!text || submitting) return;
        if (!hydrated) {
            message.info(t("画布数据正在加载，请稍后再试"));
            return;
        }
        setSubmitting(true);
        const titles = new Set(useCanvasStore.getState().projects.map(({ title }) => title));
        let title = t("无限画布");
        for (let i = 1; titles.has(title); i++) title = `无限画布 ${i}`;
        const projectId = createProject(title, {
            agentConfig,
            pendingAgentRequest: { prompt: text, assets: pendingAssets.filter((asset) => referenceIds.includes(asset.nodeId)), skills: selectedSkills },
        });
        router.push(`/canvas/${projectId}`);
    };

    const createBlankCanvas = () => {
        if (!hydrated) {
            message.info(t("画布数据正在加载，请稍后再试"));
            return;
        }
        router.push(`/canvas/${createProject(`无限画布 ${useCanvasStore.getState().projects.length + 1}`)}`);
    };

    const createDirectorCanvas = () => {
        if (!hydrated) {
            message.info(t("画布数据正在加载，请稍后再试"));
            return;
        }
        const store = useCanvasStore.getState();
        const projectId = createProject(`3D导演台 ${store.projects.length + 1}`);
        const spec = getNodeSpec(CanvasNodeType.Director);
        store.updateProject(projectId, {
            nodes: [
                {
                    id: `director-${nanoid(6)}`,
                    type: CanvasNodeType.Director,
                    title: spec.title,
                    position: { x: 280, y: 180 },
                    width: spec.width,
                    height: spec.height,
                    metadata: { ...spec.metadata },
                },
            ],
        });
        router.push(`/canvas/${projectId}`);
    };

    const createPanoramaCanvas = () => {
        if (!hydrated) {
            message.info(t("画布数据正在加载，请稍后再试"));
            return;
        }
        const store = useCanvasStore.getState();
        const projectId = createProject(`${t("全景图")} ${store.projects.length + 1}`);
        const spec = getNodeSpec(CanvasNodeType.Panorama);
        store.updateProject(projectId, {
            nodes: [
                {
                    id: `panorama-${nanoid(6)}`,
                    type: CanvasNodeType.Panorama,
                    title: spec.title,
                    position: { x: 280, y: 180 },
                    width: spec.width,
                    height: spec.height,
                    metadata: { ...spec.metadata },
                },
            ],
        });
        router.push(`/canvas/${projectId}`);
    };

    const selectSkill = (skill: CanvasAgentSkillSelection) => {
        const existingIndex = selectedSkills.findIndex((selected) => selected.id === skill.id && selected.source === skill.source);
        if (existingIndex >= 0) return setSelectedSkills(selectedSkills.map((selected, index) => index === existingIndex ? skill : selected));
        if (selectedSkills.length >= MAX_CANVAS_AGENT_SKILLS) return void message.warning(t("最多选择 {MAX_CANVAS_AGENT_SKILLS} 个 Skill", { MAX_CANVAS_AGENT_SKILLS }));
        setSelectedSkills([...selectedSkills, skill]);
    };

    return (
        <main className="relative h-full overflow-x-hidden overflow-y-auto bg-[#050505] text-stone-100">
            {/* Full main-column ink bg (sidebar excluded via --app-sidebar-width). */}
            <div
                className="pointer-events-none fixed inset-y-0 right-0 z-0 overflow-hidden"
                style={{ left: "var(--app-sidebar-width, 0px)" }}
                aria-hidden
            >
                <HomeAquaInkBackground />
            </div>
            <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
                <section className="flex flex-col items-center pb-14 pt-[9vh]">
                    <div className="inline-flex max-w-full items-center gap-3">
                        <span aria-hidden className="home-logo-mark relative inline-flex size-9 shrink-0 translate-y-px items-center justify-center sm:size-10">
                            <span
                                className="absolute inset-0 bg-[#c8ff00]"
                                style={{ mask: "url(/logo.svg) center / contain no-repeat", WebkitMask: "url(/logo.svg) center / contain no-repeat" }}
                            />
                            <span className="pointer-events-none absolute left-[48%] top-[58%] flex -translate-x-1/2 -translate-y-1/2 gap-[4px]">
                                <span className="home-logo-eye" />
                                <span className="home-logo-eye home-logo-eye--delay" />
                            </span>
                        </span>
                        <h1 className="m-0 whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-white sm:text-[28px]">{t("无限画布 创作 Agent")}</h1>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-300">
                        <Sparkles className="size-3.5 text-lime-400" />
                        <span className="text-lime-400">{t("回车发送")}</span>
                        <span>{t("，自动新建画布并开始创作")}</span>
                    </p>
                    <div className="mt-8 w-full max-w-[780px]" data-aquaink-ignore>
                        <CanvasAssistantComposer
                            prompt={prompt}
                            isRunning={false}
                            size="large"
                            showPromptLibrary
                            placeholders={HOME_PLACEHOLDERS.map((item) => t(item))}
                            references={pendingAssets.map((asset) => asset.reference)}
                            selectedSkills={selectedSkills}
                            agentConfig={agentConfig}
                            onAgentConfigChange={(patch) => setAgentConfig((current) => ({ ...current, ...patch }))}
                            onPromptChange={setPrompt}
                            onReferenceIdsChange={(ids) => setPendingAssets((current) => current.filter((asset) => ids.includes(asset.nodeId)))}
                            onSkillSelect={selectSkill}
                            onSkillRemove={(id, source) => setSelectedSkills((current) => current.filter((skill) => skill.id !== id || skill.source !== source))}
                            onSubmit={submit}
                            onOpenUpload={() => uploadInputRef.current?.click()}
                            onOpenAssets={() => setAssetPickerOpen(true)}
                            onPasteImage={(file) => void uploadFile(file)}
                        />
                    </div>
                    <input ref={uploadInputRef} hidden type="file" accept="image/*,video/*,audio/*" onChange={onUploadInputChange} />

                    <div className="mt-5 flex max-w-[860px] flex-wrap justify-center gap-2.5">
                        {QUICK_ENTRIES.map((entry) => (
                            <QuickEntryButton
                                key={entry.key}
                                entry={entry}
                                onClick={entry.key === "canvas" ? createBlankCanvas : entry.key === "director" ? createDirectorCanvas : entry.key === "panorama" ? createPanoramaCanvas : undefined}
                            />
                        ))}
                    </div>
                </section>

                {promptShowcase.length ? (
                    <section className="pb-16">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                                <Flame className="size-4 text-[#c8ff00]" />
                                
                                {t("精选灵感")}
                            </h2>
                            <Link href="/prompts" className="inline-flex items-center gap-0.5 text-xs !text-stone-400 transition hover:!text-white">
                                
                                {t("查看更多")}
                                <ChevronRight className="size-3.5" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {promptShowcase.slice(0, SHOWCASE_LIMIT).map((item, index) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setPreviewIndex(index);
                                        setPreviewOpen(true);
                                    }}
                                    className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-left dark:border-white/[0.06] dark:bg-[#161616]"
                                >
                                    <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                                    {item.tags[0] ? (
                                        <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white backdrop-blur">
                                            <Flame className="size-3 shrink-0 text-[#c8ff00]" />
                                            {item.tags[0]}
                                        </span>
                                    ) : null}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pb-2.5 pt-8">
                                        <h3 className="truncate text-[13px] font-medium text-white">{item.title}</h3>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
            <AssetPickerModal
                open={assetPickerOpen}
                defaultTab="my-assets"
                onInsert={(payload) => {
                    addPendingAsset(payload);
                    setAssetPickerOpen(false);
                }}
                onClose={() => setAssetPickerOpen(false)}
            />
            <Image.PreviewGroup
                items={promptShowcase.map((item) => ({
                    src: item.coverUrl,
                    alt: item.title,
                }))}
                preview={{
                    open: previewOpen,
                    current: previewIndex,
                    onOpenChange: setPreviewOpen,
                    onChange: setPreviewIndex,
                }}
            />
        </main>
    );
}
