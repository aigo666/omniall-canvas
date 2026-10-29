"use client";

import { t } from "@/i18n";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Link from "next/link";

import { DESKTOP_PACKAGES, DESKTOP_RELEASE } from "./releases";

const points = [
    { get title() { return t("一张画布做完整条片"); }, get text() { return t("把剧本、分镜、图片、视频和音频放在同一张无限画布上，连线之后连续改。"); } },
    { get title() { return t("Agent 直接动手"); }, get text() { return t("在面板里说明创作目标，OmniAgent 会读取当前画布并落地节点。"); } },
    { get title() { return t("本机打开即用"); }, get text() { return t("安装包内嵌界面，连上你的服务后即可创作。网页版仍然可以继续使用。"); } },
];

function detectPlatform() {
    const value = `${navigator.userAgent} ${navigator.platform}`;
    if (/Mac|iPhone|iPad/.test(value)) return "mac";
    if (/Win/.test(value)) return "win";
    return "";
}

export function DownloadPage() {
    const [platform, setPlatform] = useState("");
    const [available, setAvailable] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setPlatform(detectPlatform());
        for (const item of DESKTOP_PACKAGES) {
            void fetch(item.href, { method: "HEAD" })
                .then((response) => setAvailable((current) => ({ ...current, [item.id]: response.ok })))
                .catch(() => setAvailable((current) => ({ ...current, [item.id]: false })));
        }
    }, []);

    return (
        <main className="h-full overflow-y-auto bg-[#0b0b0b] text-stone-100">
            <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-6 md:px-10">
                <header className="flex items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-2.5 !text-white">
                        <span className="size-7 bg-current" style={{ mask: "url(/logo.svg) center / contain no-repeat", WebkitMask: "url(/logo.svg) center / contain no-repeat" }} />
                        <span className="text-[15px] font-semibold tracking-tight">{t("无限画布")}</span>
                    </Link>
                    <Link href="/" className="text-[13px] !text-stone-400 transition hover:!text-white">{t("打开网页版")}</Link>
                </header>

                <section className="grid flex-1 items-end gap-12 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
                    <div>
                        <p className="text-[12px] tracking-[0.22em] text-stone-500">OMNIALL CANVAS {DESKTOP_RELEASE.version}</p>
                        <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.15] tracking-tight text-white md:text-6xl">{t("把创作装到自己的电脑上")}</h1>
                        <p className="mt-6 max-w-lg text-[15px] leading-7 text-stone-400">{t("OmniAll Canvas 是面向图片、视频和音频的本地创作台。下载对应系统的安装包，安装后即可在本机打开画布。")}</p>
                    </div>
                    <div className="relative hidden h-56 md:block">
                        <div className="absolute inset-x-8 top-6 h-40 rounded-2xl border border-white/10 bg-[#141414]" />
                        <div className="absolute inset-x-0 top-0 h-44 rounded-2xl border border-white/15 bg-[#101010] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                            <div className="flex h-10 items-center gap-1.5 border-b border-white/10 px-4">
                                <span className="size-2 rounded-full bg-stone-600" />
                                <span className="size-2 rounded-full bg-stone-600" />
                                <span className="size-2 rounded-full bg-stone-600" />
                            </div>
                            <div className="grid grid-cols-3 gap-3 p-4">
                                <div className="col-span-2 h-24 rounded-lg bg-[linear-gradient(135deg,#1c1917,#292524_40%,#44403c)]" />
                                <div className="space-y-2">
                                    <div className="h-8 rounded-md bg-white/10" />
                                    <div className="h-14 rounded-md bg-white/5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    {DESKTOP_PACKAGES.map((item) => {
                        const current = platform === item.id;
                        const ready = available[item.id];
                        return (
                            <article key={item.id} className="rounded-2xl border border-white/10 bg-[#121212] p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-lg font-medium text-white">{item.name}</h2>
                                    {current ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-stone-950">{t("当前系统")}</span> : null}
                                </div>
                                <p className="mt-2 text-[13px] text-stone-500">{item.detail}</p>
                                <a
                                    href={ready === false ? undefined : item.href}
                                    download={ready === false ? undefined : item.fileName}
                                    aria-disabled={ready === false}
                                    className={`mt-6 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium ${current ? "bg-white !text-stone-950" : "border border-white/15 !text-white hover:bg-white/5"} ${ready === false ? "pointer-events-none opacity-50" : ""}`}
                                >
                                    <Download className="size-4" />
                                    {ready === false ? t("安装包尚未上传") : `下载 ${item.name}`}
                                </a>
                                <p className="mt-4 text-[13px] leading-6 text-stone-500">{item.hint}</p>
                            </article>
                        );
                    })}
                </section>

                <section className="grid gap-8 py-16 md:grid-cols-3">
                    {points.map((point) => (
                        <div key={point.title}>
                            <h2 className="text-[15px] font-medium text-white">{point.title}</h2>
                            <p className="mt-2 text-[13px] leading-6 text-stone-500">{point.text}</p>
                        </div>
                    ))}
                </section>
            </div>
        </main>
    );
}
