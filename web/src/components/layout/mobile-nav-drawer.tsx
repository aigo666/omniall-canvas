"use client";

import { Drawer } from "antd";
import Link from "next/link";

import { primaryNavigation, secondaryNavigation, type NavigationItem } from "@/constant/navigation-tools";
import { t, useLocale } from "@/i18n";
import { cn } from "@/lib/utils";

type MobileNavDrawerProps = {
    open: boolean;
    activeKey?: string;
    workbenchHref: string;
    onClose: () => void;
};

export function MobileNavDrawer({ open, activeKey, workbenchHref, onClose }: MobileNavDrawerProps) {
    useLocale();
    const renderItem = (item: NavigationItem) => {
        const Icon = item.icon;
        const active = item.key === activeKey;
        return (
            <Link
                key={item.key}
                href={item.key === "workbench" ? workbenchHref : item.href}
                onClick={onClose}
                className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-base transition",
                    active ? "!bg-stone-100 font-medium !text-stone-950 dark:!bg-white/[0.09] dark:!text-white" : "!text-stone-600 hover:!bg-stone-100 hover:!text-stone-950 dark:!text-stone-300 dark:hover:!bg-white/[0.05] dark:hover:!text-white",
                )}
            >
                <Icon className="size-5" />
                <span>{t(item.label)}</span>
            </Link>
        );
    };

    return (
        <Drawer title={t("导航")} placement="left" size={280} open={open} onClose={onClose} className="md:hidden">
            <div className="space-y-1">{primaryNavigation.map(renderItem)}</div>
            <div className="my-3 h-px bg-stone-200 dark:bg-white/[0.06]" />
            <div className="space-y-1">{secondaryNavigation.map(renderItem)}</div>
        </Drawer>
    );
}
