export const DESKTOP_RELEASE = {
    version: "0.8.2",
    mac: {
        id: "mac",
        name: "macOS",
        href: "/downloads/OmniAll-Canvas-mac.dmg",
        fileName: "OmniAll-Canvas-mac.dmg",
        detail: "macOS 11 及以上，Intel",
        hint: "未签名时，请在「隐私与安全性」中允许打开，或在访达里右键选择打开。",
    },
    win: {
        id: "win",
        name: "Windows",
        href: "/downloads/OmniAll-Canvas-win.exe",
        fileName: "OmniAll-Canvas-win.exe",
        detail: "Windows 10 / 11，64 位",
        hint: "安装时可以选择目录。安装完成后从开始菜单打开 OmniAll Canvas。",
    },
} as const;

export const DESKTOP_PACKAGES = [DESKTOP_RELEASE.mac, DESKTOP_RELEASE.win];
