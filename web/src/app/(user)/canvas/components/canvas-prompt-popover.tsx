"use client";

import { t } from "@/i18n";
import { useEffect, useState, type CSSProperties, type UIEvent } from "react";
import { Check, ChevronRight, FileText, Search } from "lucide-react";
import { App, Button, Empty, Input, Popover, Spin } from "antd";

import { usePromptList } from "@/components/prompts/use-prompt-list";
import { canvasThemes } from "@/lib/canvas-theme";
import { cn } from "@/lib/utils";
import { ALL_PROMPTS_OPTION, type Prompt } from "@/services/api/prompts";
import { useThemeStore } from "@/stores/use-theme-store";

type CanvasPromptPopoverProps = {
    onSelect: (prompt: string) => void;
};

function promptSummary(item: Prompt) {
    const raw = (item.preview || item.prompt || "").replace(/!\[[^\]]*]\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    return raw || item.title;
}

function PromptDetailCard({ item, theme }: { item: Prompt; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    return (
        <div className="w-[320px] max-w-[calc(100vw-48px)]" onPointerDown={(event) => event.stopPropagation()}>
            {item.coverUrl ? (
                <div className="mb-3 overflow-hidden rounded-xl border" style={{ borderColor: theme.node.stroke, background: theme.node.fill }}>
                    <img src={item.coverUrl} alt="" className="aspect-[16/10] w-full object-cover" />
                </div>
            ) : null}
            <div className="text-sm font-semibold leading-5">{item.title}</div>
            {item.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.tags.slice(0, 6).map((tag) => (
                        <span key={tag} className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: theme.node.fill, color: theme.node.muted }}>
                            {tag}
                        </span>
                    ))}
                </div>
            ) : null}
            <div className="thin-scrollbar mt-3 max-h-[220px] overflow-y-auto whitespace-pre-wrap text-xs leading-5 opacity-80">{item.prompt || item.preview || t("暂无提示词内容")}</div>
        </div>
    );
}

function PromptListItem({
    item,
    selected,
    theme,
    onSelect,
}: {
    item: Prompt;
    selected: boolean;
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    onSelect: () => void;
}) {
    const [detailOpen, setDetailOpen] = useState(false);

    return (
        <div
            className="group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition"
            style={{ background: selected || detailOpen ? theme.toolbar.itemHover : "transparent" }}
            onMouseEnter={() => setDetailOpen(true)}
            onMouseLeave={() => setDetailOpen(false)}
        >
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onSelect}>
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border" style={{ borderColor: theme.node.stroke, background: theme.node.fill }}>
                    {item.coverUrl ? <img src={item.coverUrl} alt="" className="size-full object-cover" /> : <FileText className="size-4 opacity-60" />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-5">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs leading-4 opacity-55">{promptSummary(item)}</span>
                </span>
            </button>

            <Popover
                open={detailOpen}
                placement="rightTop"
                trigger={[]}
                mouseEnterDelay={0.08}
                mouseLeaveDelay={0.12}
                content={<PromptDetailCard item={item} theme={theme} />}
                styles={{
                    container: {
                        padding: 14,
                        background: theme.toolbar.panel,
                        color: theme.node.text,
                        border: `1px solid ${theme.node.stroke}`,
                        borderRadius: 16,
                        boxShadow: "0 12px 40px rgba(0,0,0,.35)",
                    },
                }}
            >
                <div className="flex w-[72px] shrink-0 items-center justify-end">
                    {selected ? (
                        <span className="grid size-7 place-items-center rounded-full" style={{ background: "#ff4d8d", color: "#fff" }}>
                            <Check className="size-3.5" strokeWidth={2.6} />
                        </span>
                    ) : (
                        <button
                            type="button"
                            className="rounded-full px-3 py-1 text-xs font-medium opacity-0 transition group-hover:opacity-100"
                            style={{ background: theme.toolbar.activeText || "#c8ff00", color: "#0a0a0a" }}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelect();
                            }}
                        >
                            
                            {t("使用")}
                        </button>
                    )}
                </div>
            </Popover>
        </div>
    );
}

export function CanvasPromptPopover({ onSelect }: CanvasPromptPopoverProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(ALL_PROMPTS_OPTION);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const [appliedId, setAppliedId] = useState<string | null>(null);
    const { query: listQuery, items, tags, categories } = usePromptList({
        keyword: query,
        tags: selectedTags,
        category: selectedCategory,
        enabled: open,
    });

    useEffect(() => {
        if (listQuery.isError) message.error(listQuery.error instanceof Error ? listQuery.error.message : t("获取提示词失败"));
    }, [listQuery.error, listQuery.isError, message]);

    const selectPrompt = (item: Prompt) => {
        onSelect(item.prompt);
        setAppliedId(item.id);
        setOpen(false);
    };

    const toggleTag = (tag: string) => {
        if (tag === ALL_PROMPTS_OPTION) {
            setSelectedTags([]);
            return;
        }
        setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
    };

    const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        if (listQuery.hasNextPage && !listQuery.isFetchingNextPage && target.scrollTop + target.clientHeight >= target.scrollHeight - 80) {
            void listQuery.fetchNextPage();
        }
    };

    const categoryTabs = categories.length > 1 ? categories : [ALL_PROMPTS_OPTION];
    const filterTags = tags.filter((tag) => tag !== ALL_PROMPTS_OPTION);

    const content = (
        <div className="w-[440px] max-w-[calc(100vw-24px)]" onPointerDown={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{t("提示词")}</div>
                <Input
                    allowClear
                    size="small"
                    className="!w-[200px]"
                    prefix={<Search className="size-3.5 opacity-55" />}
                    placeholder={t("搜索提示词")}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
            </div>

            <div className="mb-2.5 flex items-center gap-1">
                <div className="hide-scrollbar flex min-w-0 flex-1 gap-3 overflow-x-auto pb-0.5">
                    {categoryTabs.map((category) => {
                        const active = selectedCategory === category;
                        const label = category === ALL_PROMPTS_OPTION ? t("全部") : category;
                        return (
                            <button
                                key={category}
                                type="button"
                                className={cn("shrink-0 whitespace-nowrap pb-1 text-[13px] transition", active ? "font-semibold" : "opacity-55 hover:opacity-85")}
                                style={active ? { color: theme.node.text, boxShadow: `inset 0 -2px 0 ${theme.toolbar.activeText || "#c8ff00"}` } : { color: theme.node.muted }}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
                {categoryTabs.length > 4 ? <ChevronRight className="size-4 shrink-0 opacity-40" /> : null}
            </div>

            {filterTags.length ? (
                <div className="mb-3 flex items-center gap-1">
                    <div className="hide-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
                        <button
                            type="button"
                            className="shrink-0 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition"
                            style={
                                selectedTags.length === 0
                                    ? { background: theme.toolbar.activeBg, color: theme.toolbar.activeText, borderColor: "transparent" }
                                    : { background: "transparent", color: theme.node.muted, borderColor: theme.node.stroke }
                            }
                            onClick={() => setSelectedTags([])}
                        >
                            
                            {t("全部")}
                        </button>
                        {filterTags.map((tag) => {
                            const active = selectedTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    className="shrink-0 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition"
                                    style={
                                        active
                                            ? { background: theme.toolbar.activeBg, color: theme.toolbar.activeText, borderColor: "transparent" }
                                            : { background: "transparent", color: theme.node.muted, borderColor: theme.node.stroke }
                                    }
                                    onClick={() => toggleTag(tag)}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                    {filterTags.length > 4 ? <ChevronRight className="size-4 shrink-0 opacity-40" /> : null}
                </div>
            ) : null}

            <div className="thin-scrollbar h-[320px] overflow-y-auto" onScroll={handleListScroll}>
                <Spin spinning={listQuery.isLoading}>
                    {items.length ? (
                        <div className="space-y-1">
                            {items.map((item) => (
                                <PromptListItem key={item.id} item={item} selected={appliedId === item.id} theme={theme} onSelect={() => selectPrompt(item)} />
                            ))}
                        </div>
                    ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("暂无提示词")} />
                    )}
                    {listQuery.isFetchingNextPage ? (
                        <div className="flex justify-center py-3">
                            <Spin size="small" />
                        </div>
                    ) : null}
                </Spin>
            </div>
        </div>
    );

    return (
        <Popover
            trigger="click"
            placement="topLeft"
            open={open}
            onOpenChange={setOpen}
            content={content}
            styles={{ container: { padding: 14, background: theme.toolbar.panel, color: theme.node.text, border: `1px solid ${theme.node.stroke}`, borderRadius: 18 } as CSSProperties }}
        >
            <Button type="text" shape="circle" className="!h-8 !w-8 !min-w-8" style={{ color: theme.node.text }} icon={<FileText className="size-4" />} title={t("提示词")} aria-label={t("提示词")} />
        </Popover>
    );
}
