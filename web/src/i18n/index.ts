import { useLocaleStore, type AppLocale } from "@/stores/use-locale-store";
import { en } from "./en";

export function t(text: string, vars?: Record<string, string | number>) {
    if (typeof text !== "string") return text;
    const locale = useLocaleStore.getState().locale;
    let value = locale === "en" ? (en[text] ?? text) : text;
    if (locale === "en" && /[\u4e00-\u9fff]/.test(value)) {
        value = value.replace(/[\u4e00-\u9fff]/g, "").replace(/\s+/g, " ").trim();
    }
    if (vars) {
        for (const [key, item] of Object.entries(vars)) value = value.replaceAll(`{${key}}`, String(item));
    }
    return value;
}

/** Subscribe to locale so the component re-renders when language changes. */
export function useLocale(): AppLocale {
    return useLocaleStore((state) => state.locale);
}
