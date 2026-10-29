"use client";

import { t } from "@/i18n";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Grip, X } from "lucide-react";

export const SETUP_GUIDE_KEY = "infinite-canvas:setup-guide";

export type SetupGuideStep = {
    id: string;
    title: string;
    description: string;
};

export function shouldOfferSetupGuide() {
    if (typeof window === "undefined") return false;
    if (window.localStorage.getItem(SETUP_GUIDE_KEY) === "done") return false;
    if (window.sessionStorage.getItem(SETUP_GUIDE_KEY) === "later") return false;
    return true;
}

export function markSetupGuideDone() {
    window.localStorage.setItem(SETUP_GUIDE_KEY, "done");
    window.sessionStorage.removeItem(SETUP_GUIDE_KEY);
}

export function markSetupGuideLater() {
    window.sessionStorage.setItem(SETUP_GUIDE_KEY, "later");
}

export function resetSetupGuide() {
    window.localStorage.removeItem(SETUP_GUIDE_KEY);
    window.sessionStorage.removeItem(SETUP_GUIDE_KEY);
}

type SetupGuideProps = {
    steps: SetupGuideStep[];
    onStepChange: (step: SetupGuideStep) => void;
    onClose: () => void;
};

const GUIDE_GAP = 12;
const GUIDE_MARGIN = 16;

function placeGuideCard(anchor: DOMRect, card: { width: number; height: number }, offset: { x: number; y: number }) {
    const width = card.width;
    const height = card.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const room = {
        bottom: viewportHeight - anchor.bottom,
        top: anchor.top,
        right: viewportWidth - anchor.right,
        left: anchor.left,
    };
    const fits = {
        bottom: room.bottom >= height + GUIDE_GAP + GUIDE_MARGIN,
        top: room.top >= height + GUIDE_GAP + GUIDE_MARGIN,
        right: room.right >= width + GUIDE_GAP + GUIDE_MARGIN,
        left: room.left >= width + GUIDE_GAP + GUIDE_MARGIN,
    };
    const side = (["bottom", "top", "right", "left"] as const).find((item) => fits[item])
        ?? (Object.entries(room).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof room);
    let left = anchor.left;
    let top = anchor.bottom + GUIDE_GAP;
    if (side === "bottom" || side === "top") {
        top = side === "bottom" ? anchor.bottom + GUIDE_GAP : anchor.top - GUIDE_GAP - height;
        left = anchor.width < width ? anchor.right - width : anchor.left;
    } else if (side === "right") {
        left = anchor.right + GUIDE_GAP;
        top = anchor.top + anchor.height / 2 - height / 2;
    } else {
        left = anchor.left - GUIDE_GAP - width;
        top = anchor.top + anchor.height / 2 - height / 2;
    }
    return {
        left: Math.min(viewportWidth - GUIDE_MARGIN - width, Math.max(GUIDE_MARGIN, left + offset.x)),
        top: Math.min(viewportHeight - GUIDE_MARGIN - height, Math.max(GUIDE_MARGIN, top + offset.y)),
    };
}

export function SetupGuide({ steps, onStepChange, onClose }: SetupGuideProps) {
    const [phase, setPhase] = useState<"welcome" | "steps">("welcome");
    const [index, setIndex] = useState(0);
    const [anchor, setAnchor] = useState<DOMRect | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [cardSize, setCardSize] = useState({ width: 340, height: 196 });
    const cardRef = useRef<HTMLElement>(null);
    const dragRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
    const step = steps[index];
    const onStepChangeRef = useRef(onStepChange);
    onStepChangeRef.current = onStepChange;

    useEffect(() => {
        setOffset({ x: 0, y: 0 });
    }, [index]);

    useEffect(() => {
        if (phase === "steps" && step) onStepChangeRef.current(step);
    }, [phase, step]);

    useLayoutEffect(() => {
        if (phase !== "steps" || !step) return;
        const sync = () => {
            const node = document.querySelector(`[data-guide-target="${step.id}"]`);
            const next = node instanceof HTMLElement ? node.getBoundingClientRect() : null;
            setAnchor((current) => {
                if (!next && !current) return current;
                if (next && current && next.left === current.left && next.top === current.top && next.width === current.width && next.height === current.height) return current;
                return next;
            });
        };
        sync();
        window.addEventListener("resize", sync);
        window.addEventListener("scroll", sync, true);
        return () => {
            window.removeEventListener("resize", sync);
            window.removeEventListener("scroll", sync, true);
        };
    }, [phase, step]);

    useLayoutEffect(() => {
        const node = cardRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        setCardSize((current) => (Math.abs(current.width - rect.width) < 1 && Math.abs(current.height - rect.height) < 1 ? current : { width: rect.width, height: rect.height }));
    }, [phase, step, index]);

    const dismiss = () => {
        markSetupGuideLater();
        onClose();
    };

    const finish = () => {
        markSetupGuideDone();
        onClose();
    };

    const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setOffset({ x: drag.originX + event.clientX - drag.x, y: drag.originY + event.clientY - drag.y });
    };

    if (phase === "welcome") {
        return (
            <div className="fixed inset-0 z-[2100] grid place-items-center bg-black/45 p-4">
                <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1c1c1c] p-5 text-stone-100 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold">{t("完成第一次创作")}</h2>
                        <button type="button" className="grid size-8 place-items-center rounded-lg border border-white/15 text-stone-300" aria-label={t("关闭")} onClick={dismiss}>
                            <X className="size-4" />
                        </button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-300">{t("跟着高亮操作，点击引导卡上的箭头按钮切换步骤。")}</p>
                    <div className="mt-6 flex justify-end gap-2">
                        <button type="button" className="h-9 rounded-lg px-3 text-sm text-stone-300" onClick={dismiss}>
                            
                            {t("稍后")}
                        </button>
                        <button type="button" className="h-9 rounded-lg bg-[#3a3a3a] px-4 text-sm font-medium text-white" onClick={() => setPhase("steps")}>
                            
                            {t("开始")}
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    if (!step) return null;

    const cardStyle = anchor
        ? placeGuideCard(anchor, cardSize, offset)
        : { left: 24, bottom: 24 };

    return (
        <>
            {anchor ? (
                <div
                    className="pointer-events-none fixed z-[2090] rounded-xl"
                    style={{
                        left: anchor.left - 6,
                        top: anchor.top - 6,
                        width: anchor.width + 12,
                        height: anchor.height + 12,
                        boxShadow: "0 0 0 2px #c8ff00, 0 0 0 6px rgba(200,255,0,0.16)",
                    }}
                />
            ) : null}
            <section ref={cardRef} className="fixed z-[2100] w-[340px] rounded-2xl border border-[#c8ff00] bg-[#1c1c1c] p-4 text-stone-100 shadow-2xl" style={cardStyle}>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                    <button
                        type="button"
                        className="grid size-6 cursor-grab place-items-center text-stone-400"
                        aria-label={t("拖动引导卡")}
                        onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y };
                        }}
                        onPointerMove={move}
                        onPointerUp={() => {
                            dragRef.current = null;
                        }}
                    >
                        <Grip className="size-4" />
                    </button>
                    <span>{t("新手引导 ·")} {index + 1} / {steps.length}</span>
                    <ChevronDown className="size-3.5" />
                    <button type="button" className="ml-auto grid size-6 place-items-center text-stone-400" aria-label={t("关闭引导")} onClick={dismiss}>
                        <X className="size-4" />
                    </button>
                </div>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-300">{step.description}</p>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <button type="button" className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-stone-300 disabled:opacity-30" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>
                        <ChevronLeft className="size-4" />
                        
                        {t("上一步")}
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold"
                        style={{ background: "#c8ff00", color: "#0a0a0a" }}
                        onClick={() => {
                            if (index >= steps.length - 1) finish();
                            else setIndex((value) => value + 1);
                        }}
                    >
                        <span style={{ color: "#0a0a0a" }}>{index === steps.length - 1 ? t("完成") : t("下一步")}</span>
                        <ChevronRight className="size-4" style={{ color: "#0a0a0a" }} />
                    </button>
                </div>
            </section>
        </>
    );
}
