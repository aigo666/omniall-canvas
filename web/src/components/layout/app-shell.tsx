"use client";

import { Tooltip } from "antd";
import { ArrowRight, ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { activeNavigationKey, activeWorkbenchSlug, primaryNavigation, secondaryNavigation, workbenchTools, type NavigationItem, type WorkbenchSlug } from "@/constant/navigation-tools";
import { CreditSymbol } from "@/constant/credits";
import { AppConfigModal } from "@/components/layout/app-config-modal";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { UserStatusActions } from "@/components/layout/user-status-actions";
import { VersionReleaseModal } from "@/components/layout/version-release-modal";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/use-user-store";
import { t, useLocale } from "@/i18n";

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const COLLAPSED_KEY = "infinite-canvas:sidebar-collapsed";
const LAST_WORKBENCH_KEY = "infinite-canvas:last-workbench";

const sidebarItemClass = "flex h-9 items-center gap-2.5 rounded-lg text-[13px] transition";
const sidebarItemIdleClass = "!text-stone-600 hover:!bg-stone-100 hover:!text-stone-950 dark:!text-stone-400 dark:hover:!bg-white/[0.05] dark:hover:!text-stone-100";
const sidebarItemActiveClass = "!bg-stone-100 font-medium !text-stone-950 dark:!bg-white/[0.09] dark:!text-white";

function BrandMark({ className }: { className?: string }) {
    return (
        <span
            className={cn("size-5 shrink-0 bg-current", className)}
            style={{
                mask: "url(/logo.svg) center / contain no-repeat",
                WebkitMask: "url(/logo.svg) center / contain no-repeat",
            }}
        />
    );
}

function SidebarTooltip({ collapsed, title, children }: { collapsed: boolean; title: string; children: ReactNode }) {
    if (!collapsed) return <>{children}</>;
    return (
        <Tooltip title={title} placement="right">
            {children}
        </Tooltip>
    );
}

export function WorkbenchTabs({ active, className }: { active: WorkbenchSlug; className?: string }) {
    useLocale();
    return (
        <nav aria-label={t("工作台")} className={cn("hide-scrollbar inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-stone-200 bg-white p-1 dark:border-white/[0.07] dark:bg-[#171717]", className)}>
            {workbenchTools.map((tool) => {
                const selected = tool.slug === active;
                return (
                    <Link
                        key={tool.slug}
                        href={`/${tool.slug}`}
                        aria-current={selected ? "page" : undefined}
                        className={cn(
                            "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] transition",
                            selected ? "!bg-stone-950 font-medium !text-white dark:!bg-white dark:!text-stone-950" : "!text-stone-500 hover:!text-stone-950 dark:!text-stone-400 dark:hover:!text-white",
                        )}
                    >
                        {t(tool.label)}
                    </Link>
                );
            })}
        </nav>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const user = useUserStore((state) => state.user);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [lastWorkbench, setLastWorkbench] = useState<WorkbenchSlug>("image");
    const hideNav = /^\/canvas\/[^/]+/.test(pathname);
    const activeKey = activeNavigationKey(pathname);
    const workbench = activeWorkbenchSlug(pathname);
    const sidebarWidth = hideNav ? 0 : collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

    useEffect(() => {
        try {
            setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
            const saved = localStorage.getItem(LAST_WORKBENCH_KEY);
            if (workbenchTools.some((tool) => tool.slug === saved)) setLastWorkbench(saved as WorkbenchSlug);
        } catch {}
    }, []);

    useEffect(() => {
        if (!workbench) return;
        setLastWorkbench(workbench);
        try {
            localStorage.setItem(LAST_WORKBENCH_KEY, workbench);
        } catch {}
    }, [workbench]);

    const toggleCollapsed = () => {
        setCollapsed((current) => {
            const next = !current;
            try {
                localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
            } catch {}
            return next;
        });
    };

    const createCanvas = async () => {
        const { useCanvasStore } = await import("@/app/(user)/canvas/stores/use-canvas-store");
        const store = useCanvasStore.getState();
        if (!store.hydrated) return router.push("/canvas");
        router.push(`/canvas/${store.createProject(`${t("无限画布")} ${store.projects.length + 1}`)}`);
    };

    const itemHref = (item: NavigationItem) => (item.key === "workbench" ? `/${lastWorkbench}` : item.href);

    const renderNavItem = (item: NavigationItem, trailing?: ReactNode) => {
        const Icon = item.icon;
        const active = item.key === activeKey;
        return (
            <SidebarTooltip key={item.key} collapsed={collapsed} title={t(item.label)}>
                <Link
                    href={itemHref(item)}
                    aria-label={t(item.label)}
                    aria-current={active ? "page" : undefined}
                    className={cn(sidebarItemClass, collapsed ? "justify-center" : "px-3", active ? sidebarItemActiveClass : sidebarItemIdleClass)}
                >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed ? <span className="min-w-0 flex-1 truncate">{t(item.label)}</span> : null}
                    {!collapsed ? trailing : null}
                </Link>
            </SidebarTooltip>
        );
    };

    return (
        <div
            className="flex h-dvh overflow-hidden bg-[#f7f7f5] text-foreground [--app-sidebar-width:0px] md:[--app-sidebar-width:var(--app-sidebar-desktop-width)] dark:bg-[#0b0b0b]"
            style={{ "--app-sidebar-desktop-width": `${sidebarWidth}px` } as CSSProperties}
        >
            {!hideNav ? (
                <aside className="hidden h-full shrink-0 flex-col border-r border-stone-200 bg-white transition-[width] duration-200 md:flex dark:border-white/[0.06] dark:bg-[#111111]" style={{ width: sidebarWidth }}>
                    <Link
                        href="/"
                        className={cn("flex h-14 shrink-0 items-center gap-2 !text-stone-950 transition hover:opacity-80 dark:!text-white", collapsed ? "justify-center" : "px-5")}
                        title={t("无限画布")}
                    >
                        <BrandMark />
                        {!collapsed ? <span className="truncate text-[15px] font-semibold leading-none tracking-tight">{t("无限画布")}</span> : null}
                    </Link>

                    <nav className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pt-2">
                        <div className="space-y-1">
                            <SidebarTooltip collapsed={collapsed} title={t("新建画布")}>
                                <button type="button" onClick={() => void createCanvas()} aria-label={t("新建画布")} className={cn(sidebarItemClass, sidebarItemIdleClass, "w-full", collapsed ? "justify-center" : "px-3")}>
                                    <Plus className="size-4 shrink-0" />
                                    {!collapsed ? <span className="truncate">{t("新建画布")}</span> : null}
                                </button>
                            </SidebarTooltip>
                            {primaryNavigation.map((item) => renderNavItem(item))}
                        </div>
                        <div className="mx-1 my-3 h-px bg-stone-200 dark:bg-white/[0.06]" />
                        <div className="space-y-1">{secondaryNavigation.map((item) => renderNavItem(item, <ChevronRight className="size-3.5 shrink-0 opacity-60" />))}</div>
                    </nav>

                    <div className={cn("flex shrink-0 flex-col gap-2 pb-3", collapsed ? "items-center px-2" : "px-3")}>
                        {!collapsed ? (
                            user ? (
                                <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.04]">
                                    <div className="text-[11px] text-stone-500 dark:text-stone-400">{t("算力点余额")}</div>
                                    <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums text-stone-950 dark:text-white">
                                        <CreditSymbol className="text-sm leading-none" />
                                        {(user.credits ?? 0).toLocaleString()}
                                    </div>
                                </div>
                            ) : (
                                <Link href="/login" className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 !bg-stone-50 px-3 py-2.5 text-xs !text-stone-700 transition hover:border-stone-300 hover:!text-stone-950 dark:border-white/[0.06] dark:!bg-white/[0.04] dark:!text-stone-300 dark:hover:border-white/[0.12] dark:hover:!text-white">
                                    <span className="truncate">{t("登录后同步画布与素材")}</span>
                                    <ArrowRight className="size-3.5 shrink-0" />
                                </Link>
                            )
                        ) : null}
                        <div className={cn("flex items-center text-stone-500 dark:text-stone-400", collapsed ? "flex-col gap-2" : "justify-between px-1")}>
                            <VersionReleaseModal />
                            <button
                                type="button"
                                className="inline-flex size-7 items-center justify-center rounded-md transition hover:bg-stone-100 hover:text-stone-950 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                onClick={toggleCollapsed}
                                aria-label={collapsed ? t("展开侧边栏") : t("收起侧边栏")}
                                title={collapsed ? t("展开侧边栏") : t("收起侧边栏")}
                            >
                                {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                            </button>
                        </div>
                    </div>
                </aside>
            ) : null}

            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                {!hideNav ? (
                    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-3 px-4 md:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                className="inline-flex size-8 shrink-0 items-center justify-center text-stone-600 transition hover:text-stone-950 md:hidden dark:text-stone-300 dark:hover:text-white"
                                onClick={() => setMobileNavOpen(true)}
                                aria-label={t("导航菜单")}
                                title={t("导航菜单")}
                            >
                                <Menu className="size-5" />
                            </button>
                            {!workbench ? (
                                <Link href="/" className="flex min-w-0 items-center gap-2 !text-stone-950 md:hidden dark:!text-white">
                                    <BrandMark />
                                    <span className="truncate text-[15px] font-semibold leading-none">{t("无限画布")}</span>
                                </Link>
                            ) : null}
                            {workbench ? <WorkbenchTabs active={workbench} /> : null}
                        </div>
                        <UserStatusActions showVersion={false} loginVariant="pill" />
                    </header>
                ) : null}
                <div className="relative z-10 min-h-0 flex-1 overflow-hidden">{children}</div>
            </div>

            <MobileNavDrawer open={mobileNavOpen} activeKey={activeKey} workbenchHref={`/${lastWorkbench}`} onClose={() => setMobileNavOpen(false)} />
            <AppConfigModal />
        </div>
    );
}
