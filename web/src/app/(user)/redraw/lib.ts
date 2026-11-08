import type { RedrawResolution } from "@/services/api/redraw";

export const REDRAW_DOCS_URL = "https://docs.omniall.ai/zh-CN/api-reference/video-redraw";
export const REDRAW_MAX_ITEMS = 20;
export const REDRAW_RECORD_STORE = "redraw_records";

export const resolutionOptions: { value: RedrawResolution; label: string }[] = [
    { value: "4k", label: "任意分辨率 → 4K" },
    { value: "1080p", label: "任意分辨率 → 1080P" },
    { value: "720p", label: "任意分辨率 → 720P" },
];

export function formatClock(ms: number) {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function readVideoFileMeta(file: File): Promise<{ durationSec: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
            const durationSec = Number.isFinite(video.duration) ? video.duration : 0;
            const width = video.videoWidth || 0;
            const height = video.videoHeight || 0;
            URL.revokeObjectURL(url);
            resolve({ durationSec, width, height });
        };
        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("无法读取视频信息"));
        };
        video.src = url;
    });
}

export function readRemoteVideoMeta(url: string): Promise<{ durationSec: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.crossOrigin = "anonymous";
        video.onloadedmetadata = () => {
            resolve({
                durationSec: Number.isFinite(video.duration) ? video.duration : 0,
                width: video.videoWidth || 0,
                height: video.videoHeight || 0,
            });
        };
        video.onerror = () => reject(new Error("无法读取视频信息"));
        video.src = url;
    });
}
