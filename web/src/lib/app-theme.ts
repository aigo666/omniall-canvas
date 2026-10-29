import type { CSSProperties } from "react";
import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

/** Light: textured terracotta orange. Dark: neon lime on dark surfaces. */
export const brandAccent = {
    light: {
        primary: "#E0704A",
        primaryHover: "#EB8562",
        primaryActive: "#C85A38",
        primaryText: "#FFFFFF",
    },
    dark: {
        primary: "#c8ff00",
        primaryHover: "#d6ff33",
        primaryActive: "#b8ef00",
        primaryText: "#0a0a0a",
    },
};

const neutral = {
    light: {
        ...brandAccent.light,
        menuBg: "#f5f5f5",
        menuText: "#171717",
        selectActiveBg: "#f5f5f5",
        selectSelectedBg: "#f0f0f0",
        selectText: "#171717",
        tableSelectedBg: "rgba(224, 112, 74, 0.08)",
        tableSelectedHoverBg: "rgba(224, 112, 74, 0.12)",
    },
    dark: {
        ...brandAccent.dark,
        menuBg: "#262626",
        menuText: "#fafafa",
        selectActiveBg: "#262626",
        selectSelectedBg: "#333333",
        selectText: "#fafafa",
        tableSelectedBg: "rgba(255, 255, 255, 0.08)",
        tableSelectedHoverBg: "rgba(255, 255, 255, 0.12)",
    },
};

export const adminLayoutStyle = {
    siderWidth: 232,
    headerHeight: 56,
    brandHeight: 56,
    menu: { borderInlineEnd: 0, padding: "18px 12px", fontSize: 15 } satisfies CSSProperties,
    menuItem: { height: 44, lineHeight: "44px", marginBlock: 4, borderRadius: 8 } satisfies CSSProperties,
};

export function getAntThemeConfig(dark: boolean): ThemeConfig {
    const color = dark ? neutral.dark : neutral.light;

    return {
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        cssVar: { key: dark ? "infinite-canvas-dark" : "infinite-canvas-light" },
        token: {
            colorPrimary: color.primary,
            colorInfo: color.primary,
            colorLink: color.primary,
            colorLinkHover: color.primaryHover,
            colorLinkActive: color.primaryActive,
            colorTextLightSolid: color.primaryText,
        },
        components: {
            Button: {
                primaryShadow: "none",
                colorPrimaryHover: color.primaryHover,
                colorPrimaryActive: color.primaryActive,
            },
            Tooltip: {
                colorBgSpotlight: dark ? "rgba(28, 25, 23, 0.94)" : "rgba(41, 37, 36, 0.94)",
                colorTextLightSolid: "#FAFAF9",
            },
            Menu: {
                itemActiveBg: color.menuBg,
                itemHoverBg: color.menuBg,
                itemSelectedBg: color.menuBg,
                itemSelectedColor: color.menuText,
                darkItemHoverBg: neutral.dark.menuBg,
                darkItemSelectedBg: neutral.dark.menuBg,
                darkItemSelectedColor: neutral.dark.menuText,
            },
            Select: {
                optionActiveBg: color.selectActiveBg,
                optionSelectedBg: color.selectSelectedBg,
                optionSelectedColor: color.selectText,
            },
            Table: {
                rowSelectedBg: color.tableSelectedBg,
                rowSelectedHoverBg: color.tableSelectedHoverBg,
            },
        },
    };
}
