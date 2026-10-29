import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeName = "light" | "dark";

type ThemeStore = {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
};

export const useThemeStore = create<ThemeStore>()(
    persist(
        () => ({
            theme: "dark",
            // App is dark-only; keep API for existing callers but ignore switches.
            setTheme: () => undefined,
        }),
        {
            name: "infinite-canvas:theme_store",
            version: 1,
            migrate: () => ({ theme: "dark" as const }),
            partialize: () => ({ theme: "dark" as const }),
            merge: (_persisted, current) => ({
                ...current,
                theme: "dark",
            }),
        },
    ),
);
