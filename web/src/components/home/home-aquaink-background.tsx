"use client";

import { useEffect, useRef } from "react";

declare global {
    interface Window {
        __AQUA_INK_TARGET__?: HTMLCanvasElement | null;
        __AQUA_INK_DITHER__?: string;
        __AQUA_INK_DESTROY__?: () => void;
    }
}

/**
 * Full-bleed ink background for the main content column (excludes sidebar).
 * Ink fluid background (AquaInkGL-based).
 */
export function HomeAquaInkBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || typeof window === "undefined") return;

        let alive = true;
        let scriptEl: HTMLScriptElement | null = null;
        let blobUrl: string | null = null;
        let raf = 0;

        const cleanupRuntime = () => {
            try {
                window.__AQUA_INK_DESTROY__?.();
            } catch {
                /* ignore */
            }
            delete window.__AQUA_INK_DESTROY__;
            if (window.__AQUA_INK_TARGET__ === canvas) {
                delete window.__AQUA_INK_TARGET__;
            }
            delete window.__AQUA_INK_DITHER__;
            scriptEl?.remove();
            scriptEl = null;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                blobUrl = null;
            }
        };

        const boot = async () => {
            for (let i = 0; i < 60; i++) {
                if (!alive) return;
                if (canvas.clientWidth >= 2 && canvas.clientHeight >= 2) break;
                await new Promise<void>((resolve) => {
                    raf = requestAnimationFrame(() => resolve());
                });
            }
            if (!alive) return;

            window.__AQUA_INK_TARGET__ = canvas;
            window.__AQUA_INK_DITHER__ = "/aquaink/LDR_LLL1_0.png";

            try {
                const response = await fetch("/aquaink/script.js", { cache: "no-store" });
                if (!response.ok) throw new Error(`script ${response.status}`);
                const source = await response.text();
                if (!alive) return;

                blobUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
                scriptEl = document.createElement("script");
                scriptEl.src = blobUrl;
                scriptEl.async = false;
                await new Promise<void>((resolve, reject) => {
                    scriptEl!.onload = () => resolve();
                    scriptEl!.onerror = () => reject(new Error("AquaInkGL script failed to execute"));
                    document.body.appendChild(scriptEl!);
                });
                if (!alive) cleanupRuntime();
            } catch (error) {
                if (alive) console.warn("[AquaInkGL]", error);
            }
        };

        void boot();

        return () => {
            alive = false;
            if (raf) cancelAnimationFrame(raf);
            cleanupRuntime();
        };
    }, []);

    return (
        <div className="relative h-full w-full overflow-hidden bg-[#050505]" aria-hidden>
            <canvas ref={canvasRef} id="aquaink-bg" className="absolute inset-0 block h-full w-full" />
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.48) 50%, rgba(0,0,0,0.62) 100%)",
                }}
            />
        </div>
    );
}
