import { FileText, FolderOpen, House, ImagePlus, Images, LayoutGrid, Music2, Video, type LucideIcon } from "lucide-react";

export const workbenchTools = [
    {
        slug: "image",
        label: "生图工作台",
        icon: ImagePlus,
    },
    {
        slug: "video",
        label: "视频创作台",
        icon: Video,
    },
    {
        slug: "music",
        label: "音乐创作台",
        icon: Music2,
    },
] as const;

export type WorkbenchSlug = (typeof workbenchTools)[number]["slug"];

export type NavigationItem = {
    key: string;
    href: string;
    label: string;
    icon: LucideIcon;
    match: readonly string[];
};

export const primaryNavigation: NavigationItem[] = [
    { key: "home", href: "/", label: "首页", icon: House, match: [""] },
    { key: "workbench", href: "/image", label: "工作台", icon: LayoutGrid, match: workbenchTools.map((tool) => tool.slug) },
    { key: "prompts", href: "/prompts", label: "提示词库", icon: FileText, match: ["prompts"] },
    { key: "assets", href: "/assets", label: "我的素材", icon: Images, match: ["assets"] },
];

export const secondaryNavigation: NavigationItem[] = [{ key: "canvas", href: "/canvas", label: "我的画布", icon: FolderOpen, match: ["canvas"] }];

export function firstPathSegment(pathname: string) {
    return pathname.split("/").filter(Boolean)[0] ?? "";
}

export function activeWorkbenchSlug(pathname: string): WorkbenchSlug | undefined {
    const segment = firstPathSegment(pathname);
    return workbenchTools.find((tool) => tool.slug === segment)?.slug;
}

export function activeNavigationKey(pathname: string) {
    const segment = firstPathSegment(pathname);
    return [...primaryNavigation, ...secondaryNavigation].find((item) => item.match.includes(segment))?.key;
}
