import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { useRef, useState } from "react";
import { Button, Segmented, Switch } from "antd";
import { CircleDot, Eraser, FolderOpen, Globe2, Grid2x2, Hand, Image as ImageIcon, Info, Layers3, Library, MousePointer2, Music2, Palette, Redo2, Settings2, Square, Trash2, Type, Undo2, Upload, Video } from "lucide-react";

import { canvasThemes, type CanvasBackgroundMode, type CanvasTheme } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { useLocaleStore } from "@/stores/use-locale-store";
import { t } from "@/i18n";

export function CanvasToolbar({
    selectedCount,
    canvasTool,
    canUndo,
    canRedo,
    backgroundMode,
    showImageInfo,
    onAddImage,
    onAddVideo,
    onAddAudio,
    onAddText,
    onAddPanorama,
    onAddDirector,
    onAddConfig,
    onUndo,
    onRedo,
    onUpload,
    onDelete,
    onClear,
    onCanvasToolChange,
    onBackgroundModeChange,
    onShowImageInfoChange,
    onOpenAssetLibrary,
    onOpenMyAssets,
}: {
    selectedCount: number;
    canvasTool: "select" | "pan";
    canUndo: boolean;
    canRedo: boolean;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    onAddImage: () => void;
    onAddVideo: () => void;
    onAddAudio: () => void;
    onAddText: () => void;
    onAddPanorama: () => void;
    onAddDirector: () => void;
    onAddConfig: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onUpload: () => void;
    onDelete: () => void;
    onClear: () => void;
    onCanvasToolChange: (tool: "select" | "pan") => void;
    onBackgroundModeChange: (mode: CanvasBackgroundMode) => void;
    onShowImageInfoChange: (show: boolean) => void;
    onOpenAssetLibrary: () => void;
    onOpenMyAssets: () => void;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const colorTheme = useThemeStore((state) => state.theme);
    useLocaleStore((state) => state.locale);
    const theme = canvasThemes[colorTheme];
    const [hovered, setHovered] = useState<string | null>(null);
    const [tipX, setTipX] = useState(0);
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const [panelX, setPanelX] = useState(0);
    const dockStyle = { background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.toolbar.item, boxShadow: colorTheme === "dark" ? "0 18px 45px rgba(0,0,0,.32)" : "0 16px 40px rgba(28,25,23,.12)" };
    const hoverStyle = { background: theme.toolbar.itemHover, color: theme.toolbar.activeText };
    const activeStyle = { background: theme.toolbar.activeBg, color: theme.toolbar.activeText };
    const tip = hovered ? t(toolLabel(hovered)) : "";

    return (
        <div className="pointer-events-none absolute bottom-5 z-50 flex justify-center" style={{ left: 300, right: 16 }}>
            {tip ? <DockTip label={tip} x={tipX} theme={theme} /> : null}
            <div ref={wrapRef} className="thin-scrollbar pointer-events-auto flex h-14 max-w-full items-center gap-1 overflow-x-auto rounded-xl border px-2 shadow-lg backdrop-blur [&>*]:shrink-0" style={dockStyle}>
                <ToolbarButton id={`tool-${canvasTool}`} label={t(canvasTool === "select" ? t("选择") : t("移动"))} active hovered={hovered} activeStyle={activeStyle} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={() => onCanvasToolChange(canvasTool === "select" ? "pan" : "select")}>
                    {canvasTool === "select" ? <MousePointer2 className="size-4.5" /> : <Hand className="size-4.5" />}
                </ToolbarButton>
                <ToolbarButton id="tool-undo" label={t("撤销")} disabled={!canUndo} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onUndo}>
                    <Undo2 className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-redo" label={t("重做")} disabled={!canRedo} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onRedo}>
                    <Redo2 className="size-4.5" />
                </ToolbarButton>
                <Divider theme={theme} />
                <ToolbarButton id="tool-text" label={t("文本")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onAddText}>
                    <Type className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-image" label={t("图片")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onAddImage}>
                    <ImageIcon className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-video" label={t("视频")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onAddVideo}>
                    <Video className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-audio" label={t("音频")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onAddAudio}>
                    <Music2 className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-panorama" label={t("全景图")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onAddPanorama}>
                    <Globe2 className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-director" label={t("导演台")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onAddDirector}>
                    <Layers3 className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-config" label={t("生成配置")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onAddConfig}>
                    <Settings2 className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-upload" label={t("上传素材")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onUpload}>
                    <Upload className="size-4.5" />
                </ToolbarButton>
                <Divider theme={theme} />
                <ToolbarButton id="tool-library" label={t("素材库")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onOpenAssetLibrary}>
                    <Library className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton id="tool-assets" label={t("我的素材")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onOpenMyAssets}>
                    <FolderOpen className="size-4.5" />
                </ToolbarButton>
                <ToolbarButton
                    id="tool-style"
                    label={t("画布外观")}
                    active={appearanceOpen}
                    hovered={hovered}
                    activeStyle={activeStyle}
                    hoverStyle={hoverStyle}
                    wrapRef={wrapRef}
                    onTipX={setTipX}
                    onHover={setHovered}
                    onClick={(event) => {
                        setPanelX(getTipX(wrapRef.current, event.currentTarget));
                        setAppearanceOpen((value) => !value);
                    }}
                >
                    <Palette className="size-4.5" />
                </ToolbarButton>
                {selectedCount ? (
                    <>
                        <Divider theme={theme} />
                        <ToolbarButton id="tool-delete" label={t("删除选中")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onDelete} danger>
                            <Trash2 className="size-4.5" />
                        </ToolbarButton>
                    </>
                ) : null}
                <Divider theme={theme} />
                <ToolbarButton id="tool-clear" label={t("清空画布")} hovered={hovered} hoverStyle={hoverStyle} wrapRef={wrapRef} onTipX={setTipX} onHover={setHovered} onClick={onClear} danger>
                    <Eraser className="size-4.5" />
                </ToolbarButton>
            </div>

            {appearanceOpen ? (
                <div
                    className="pointer-events-auto absolute bottom-[72px] z-30 w-[248px] -translate-x-1/2 rounded-xl border p-2.5 shadow-xl backdrop-blur"
                    style={{ left: panelX || "50%", background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.toolbar.item }}
                >
                    <div className="px-1 pb-2 text-sm font-medium opacity-65">{t("画布外观")}</div>
                    <div className="px-1 pb-1.5 text-[11px] font-medium opacity-50">{t("网格样式")}</div>
                    <Segmented
                        className="w-full !p-1 [&_.ant-segmented-group]:!flex [&_.ant-segmented-item]:!min-h-8 [&_.ant-segmented-item]:!flex-1 [&_.ant-segmented-item-label]:!min-h-8 [&_.ant-segmented-item-label]:!leading-8"
                        value={backgroundMode}
                        onChange={(value) => onBackgroundModeChange(value as CanvasBackgroundMode)}
                        options={[
                            {
                                value: "dots",
                                label: (
                                    <span className="inline-flex items-center gap-1.5">
                                        <CircleDot className="size-4" />{t("点")}
                                    </span>
                                ),
                            },
                            {
                                value: "lines",
                                label: (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Grid2x2 className="size-4" />{t("线")}
                                    </span>
                                ),
                            },
                            {
                                value: "blank",
                                label: (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Square className="size-4" />
                                        {t("空白")}
                                    </span>
                                ),
                            },
                        ]}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg px-1.5 py-1">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium opacity-65">
                            <Info className="size-3.5" />
                            {t("图片信息")}
                        </span>
                        <Switch size="small" checked={showImageInfo} onChange={onShowImageInfoChange} />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function ToolbarButton({
    id,
    label,
    active,
    hovered,
    activeStyle,
    hoverStyle,
    wrapRef,
    onTipX,
    onHover,
    onClick,
    disabled = false,
    danger = false,
    children,
}: {
    id: string;
    label: string;
    active?: boolean;
    hovered: string | null;
    activeStyle?: CSSProperties;
    hoverStyle: CSSProperties;
    wrapRef: RefObject<HTMLDivElement | null>;
    onTipX: (x: number) => void;
    onHover: (id: string | null) => void;
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
    disabled?: boolean;
    danger?: boolean;
    children: ReactNode;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];

    return (
        <Button
            type="text"
            aria-label={label}
            className="!h-8 !w-8 !min-w-8 !p-0"
            disabled={disabled}
            style={active ? activeStyle : hovered === id && !disabled ? hoverStyle : { color: danger ? "#f87171" : theme.toolbar.item, opacity: disabled ? 0.35 : 1 }}
            icon={children}
            onMouseEnter={(event) => {
                onHover(id);
                onTipX(getTipX(wrapRef.current, event.currentTarget));
            }}
            onMouseLeave={() => onHover(null)}
            onClick={onClick}
        />
    );
}

function Divider({ theme }: { theme: CanvasTheme }) {
    return <div className="mx-1 h-6 w-px" style={{ background: theme.toolbar.border }} />;
}

function DockTip({ label, x, theme }: { label: string; x: number; theme: CanvasTheme }) {
    return (
        <span className="absolute bottom-[calc(100%+8px)] -translate-x-1/2 rounded-md px-2 py-1 text-xs shadow-lg" style={{ left: x, background: theme.node.text, color: theme.node.panel }}>
            {label}
        </span>
    );
}

function toolLabel(id: string) {
    if (id === "tool-select") return t("选择");
    if (id === "tool-pan") return t("移动");
    if (id === "tool-undo") return t("撤销");
    if (id === "tool-redo") return t("重做");
    if (id === "tool-text") return t("文本");
    if (id === "tool-image") return t("图片");
    if (id === "tool-video") return t("视频");
    if (id === "tool-audio") return t("音频");
    if (id === "tool-panorama") return t("全景图");
    if (id === "tool-director") return t("导演台");
    if (id === "tool-config") return t("生成配置");
    if (id === "tool-upload") return t("上传素材");
    if (id === "tool-library") return t("素材库");
    if (id === "tool-assets") return t("我的素材");
    if (id === "tool-style") return t("画布外观");
    if (id === "tool-delete") return t("删除选中");
    if (id === "tool-clear") return t("清空画布");
    return "";
}

function getTipX(wrap: HTMLDivElement | null, target: HTMLElement) {
    if (!wrap) return 0;
    const wrapBox = wrap.parentElement?.getBoundingClientRect() || wrap.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    return box.left - wrapBox.left + box.width / 2;
}
