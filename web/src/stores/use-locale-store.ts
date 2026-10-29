import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppLocale = "zh" | "en";

type LocaleStore = {
    locale: AppLocale;
    setLocale: (locale: AppLocale) => void;
};

export const useLocaleStore = create<LocaleStore>()(
    persist(
        (set) => ({
            locale: "zh",
            setLocale: (locale) => set({ locale }),
        }),
        { name: "omniall:locale" },
    ),
);
