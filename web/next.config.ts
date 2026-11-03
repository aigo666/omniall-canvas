import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseChangelog } from "@/lib/release";

const webDir = dirname(fileURLToPath(import.meta.url));
const localVersion = readFileSync(resolve(webDir, "../VERSION"), "utf8").trim() || "dev";
const localChangelog = readFileSync(resolve(webDir, "../CHANGELOG.md"), "utf8");

export default function nextConfig(phase: string): NextConfig {
    const isDev = phase === PHASE_DEVELOPMENT_SERVER;
    const releases = parseChangelog(localChangelog);

    return {
        output: "standalone",
        // 固定 tracing 根目录，避免 Docker / 本机因目录层级不同导致 standalone 嵌套不一致。
        outputFileTracingRoot: resolve(webDir, ".."),
        allowedDevOrigins: isDev ? ["*.*.*.*"] : [],
        typescript: {
            ignoreBuildErrors: true,
        },
        env: {
            NEXT_PUBLIC_APP_VERSION: localVersion,
            NEXT_PUBLIC_APP_RELEASES: JSON.stringify(releases),
        },
        // HTML/文档禁止 CDN 长缓存，避免发版后仍引用旧 CSS hash 导致首页排版错乱。
        // 静态资源仍可长期缓存（文件名带 hash）。
        async headers() {
            return [
                {
                    source: "/_next/static/:path*",
                    headers: [
                        {
                            key: "Cache-Control",
                            value: "public, max-age=31536000, immutable",
                        },
                    ],
                },
                {
                    source: "/:path*",
                    headers: [
                        {
                            key: "Cache-Control",
                            value: "private, no-cache, no-store, max-age=0, must-revalidate",
                        },
                    ],
                },
            ];
        },
    };
}
