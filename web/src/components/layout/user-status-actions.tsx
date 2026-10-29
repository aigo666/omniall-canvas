"use client";

import type { CSSProperties, RefObject } from "react";
import { Avatar, Dropdown, Tooltip, type DropdownProps } from "antd";
import { Keyboard, LogOut, Settings2, Shield } from "lucide-react";
import type { ItemType } from "antd/es/menu/interface";
import Link from "next/link";

import { LocaleSwitch } from "@/components/layout/locale-switch";
import { VersionReleaseModal } from "@/components/layout/version-release-modal";
import { CreditSymbol } from "@/constant/credits";
import { t, useLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { canvasThemes } from "@/lib/canvas-theme";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";

type UserStatusActionsProps = {
    showConfig?: boolean;
    variant?: "default" | "canvas";
    onOpenShortcuts?: () => void;
    accountOpen?: boolean;
    onAccountOpenChange?: (open: boolean) => void;
    accountRef?: RefObject<HTMLDivElement | null>;
    getPopupContainer?: (node: HTMLElement) => HTMLElement;
    dropdownPlacement?: DropdownProps["placement"];
    className?: string;
    showVersion?: boolean;
    loginVariant?: "link" | "pill";
};

export function UserStatusActions({ showConfig = true, variant = "default", onOpenShortcuts, accountOpen, onAccountOpenChange, accountRef, getPopupContainer, dropdownPlacement = "bottomRight", className, showVersion = true, loginVariant = "link" }: UserStatusActionsProps) {
    useLocale();
    const theme = useThemeStore((state) => state.theme);
    const user = useUserStore((state) => state.user);
    const logout = useUserStore((state) => state.clearSession);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const canvasTheme = canvasThemes[theme];
    const userName = user?.displayName || user?.username || "";
    const credits = user?.credits ?? 0;
    const avatarUrl = user?.avatarUrl?.trim();
    const avatarText = (userName.trim()[0] || "U").toUpperCase();
    const naturalIconClass = "inline-flex size-7 shrink-0 items-center justify-center text-stone-600 transition hover:text-stone-950 dark:text-stone-300 dark:hover:text-white [&_svg]:size-4";
    const iconStyle: CSSProperties | undefined = variant === "canvas" ? { color: canvasTheme.node.text } : undefined;
    const versionStyle = iconStyle;
    const avatarStyle: CSSProperties | undefined = variant === "canvas" ? { borderColor: canvasTheme.toolbar.border, color: canvasTheme.node.text, background: "transparent" } : undefined;
    const menuItems: ItemType[] = [
        { key: "user", disabled: true, label: <span className="font-medium text-current">{userName}</span> },
        ...(user?.role === "admin" ? [{ key: "admin", icon: <Shield className="size-4" />, label: <Link href="/admin">{t("管理后台")}</Link> }] : []),
        ...(onOpenShortcuts ? [{ key: "shortcuts", icon: <Keyboard className="size-4" />, label: t("快捷键"), onClick: onOpenShortcuts }] : []),
        { type: "divider" },
        { key: "logout", icon: <LogOut className="size-4" />, label: t("退出登录"), onClick: logout },
    ];

    return (
        <div className={cn("inline-flex shrink-0 items-center gap-1", className)}>
            <LocaleSwitch className={variant === "canvas" ? "mr-1" : undefined} inverted={variant === "canvas"} />
            {showConfig ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={() => openConfigDialog(false)} aria-label={t("配置")} title={t("配置")}>
                    <Settings2 className="size-4" />
                </button>
            ) : null}
            {showVersion ? <VersionReleaseModal style={versionStyle} /> : null}
            {variant === "canvas" && user ? (
                    <Tooltip title={t("当前算力点余额")} placement="bottom">
                    <div className="flex h-8 shrink-0 items-center gap-1.5 px-1.5 text-xs font-medium tabular-nums opacity-75 transition hover:opacity-100" style={{ color: canvasTheme.node.text }}>
                        <CreditSymbol className="text-sm leading-none" />
                        <span>{credits.toLocaleString()}</span>
                    </div>
                </Tooltip>
            ) : null}
            {!user && onOpenShortcuts ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={onOpenShortcuts} aria-label={t("快捷键")} title={t("快捷键")}>
                    <Keyboard className="size-4" />
                </button>
            ) : null}
            {!user && loginVariant === "pill" ? (
                <Link href="/login" className="ml-1 inline-flex h-8 items-center rounded-full !bg-[#c8ff00] px-4 text-xs font-medium !text-[#0a0a0a] transition hover:!bg-[#d6ff33]">
                    {t("注册 / 登录")}
                </Link>
            ) : null}
            {!user && loginVariant === "link" ? (
                <Link href="/login" className="px-1.5 text-sm font-medium text-stone-600 underline-offset-4 transition hover:text-stone-950 hover:underline dark:text-stone-300 dark:hover:text-stone-100" style={iconStyle}>
                    {t("登录")}
                </Link>
            ) : null}
            {user ? (
                <div ref={accountRef}>
                    <Dropdown open={accountOpen} onOpenChange={onAccountOpenChange} trigger={["click"]} placement={dropdownPlacement} getPopupContainer={getPopupContainer} styles={{ root: { minWidth: 150 } }} menu={{ items: menuItems }}>
                        <button type="button" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-transparent p-0 text-[0] leading-[0] transition" aria-label={t("账户菜单")}>
                            <Avatar
                                size={24}
                                src={avatarUrl ? <img src={avatarUrl} alt={userName} referrerPolicy="no-referrer" /> : undefined}
                                alt={userName}
                                className="!flex !items-center !justify-center border border-stone-300 bg-transparent text-[11px] font-semibold text-stone-800 transition hover:border-stone-500 hover:text-stone-950 dark:border-stone-700 dark:text-stone-100 dark:hover:border-stone-400 dark:hover:text-white"
                                style={avatarStyle}
                            >
                                {avatarText}
                            </Avatar>
                        </button>
                    </Dropdown>
                </div>
            ) : null}
        </div>
    );
}
