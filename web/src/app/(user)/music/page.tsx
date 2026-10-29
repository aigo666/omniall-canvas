"use client";

import { t } from "@/i18n";
import { Music2 } from "lucide-react";
import Link from "next/link";

export default function MusicPage() {
    return (
        <main className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-500 dark:border-white/[0.07] dark:bg-[#171717] dark:text-stone-300">
                <Music2 className="size-6" />
            </span>
            <div>
                <h1 className="text-lg font-semibold text-stone-950 dark:text-white">{t("音乐创作台即将上线")}</h1>
                <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">{t("目前可以在画布中添加音频节点，生成配音与旁白。")}</p>
            </div>
            <Link href="/canvas" className="inline-flex h-9 items-center rounded-full border border-stone-200 px-4 text-sm !text-stone-700 transition hover:border-stone-300 hover:!text-stone-950 dark:border-white/[0.1] dark:!text-stone-200 dark:hover:border-white/[0.2] dark:hover:!text-white">
                
                {t("前往我的画布")}
            </Link>
        </main>
    );
}
