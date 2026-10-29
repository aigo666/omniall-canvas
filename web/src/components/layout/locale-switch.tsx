"use client";

import { Dropdown } from "antd";
import { Check, Languages } from "lucide-react";
import type { ItemType } from "antd/es/menu/interface";

import { cn } from "@/lib/utils";
import { useLocaleStore, type AppLocale } from "@/stores/use-locale-store";

const LOCALE_OPTIONS: Array<{ value: AppLocale; label: string }> = [
    { value: "en", label: "English" },
    { value: "zh", label: "简体中文" },
];

export function LocaleSwitch({ className, inverted = false }: { className?: string; inverted?: boolean }) {
    const locale = useLocaleStore((state) => state.locale);
    const setLocale = useLocaleStore((state) => state.setLocale);

    const items: ItemType[] = LOCALE_OPTIONS.map((item) => {
        const active = locale === item.value;
        return {
            key: item.value,
            label: (
                <span className="flex w-full items-center justify-between gap-6">
                    <span>{item.label}</span>
                    {active ? <Check className="size-3.5 shrink-0 opacity-70" strokeWidth={2.5} /> : <span className="size-3.5 shrink-0" />}
                </span>
            ),
            className: active ? "!bg-stone-100 dark:!bg-white/10" : undefined,
            onClick: () => setLocale(item.value),
        };
    });

    return (
        <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{ items, selectable: false, className: "min-w-[148px] !rounded-2xl !p-1.5 [&_.ant-dropdown-menu-item]:!rounded-xl [&_.ant-dropdown-menu-item]:!px-3 [&_.ant-dropdown-menu-item]:!py-2.5" }}
        >
            <button
                type="button"
                className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition",
                    inverted ? "bg-white/10 text-stone-200 hover:bg-white/15 hover:text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-950 dark:bg-white/10 dark:text-stone-200 dark:hover:bg-white/15 dark:hover:text-white",
                    className,
                )}
                aria-label="Language"
            >
                <Languages className="size-4" strokeWidth={1.75} />
            </button>
        </Dropdown>
    );
}
