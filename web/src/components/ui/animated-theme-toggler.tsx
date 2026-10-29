"use client";

import { t } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export type TransitionVariant = "circle" | "square" | "triangle" | "diamond" | "hexagon" | "rectangle" | "star";

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
    duration?: number;
    variant?: TransitionVariant;
    /** When true, the transition expands from the viewport center instead of the button center. */
    fromCenter?: boolean;
    theme?: "light" | "dark";
    targetTheme?: "light" | "dark";
    onThemeChange?: (theme: "light" | "dark") => void;
}

export const AnimatedThemeToggler = ({ children, className, duration: _duration, variant: _variant, fromCenter: _fromCenter, theme, targetTheme, onThemeChange, ...props }: AnimatedThemeTogglerProps) => {
    const [isDark, setIsDark] = useState(theme ? theme === "dark" : true);

    useEffect(() => {
        if (theme) {
            setIsDark(theme === "dark");
            return;
        }

        const updateTheme = () => {
            setIsDark(document.documentElement.classList.contains("dark"));
        };

        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, [theme]);

    const toggleTheme = useCallback(() => {
        const nextTheme = targetTheme ?? (isDark ? "light" : "dark");
        if (nextTheme === (isDark ? "dark" : "light")) return;
        setIsDark(nextTheme === "dark");
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        document.documentElement.style.colorScheme = nextTheme;
        document.documentElement.style.backgroundColor = nextTheme === "dark" ? "#0b0b0b" : "#f7f7f5";
        onThemeChange?.(nextTheme);
    }, [isDark, targetTheme, onThemeChange]);

    return (
        <button type="button" onClick={toggleTheme} className={cn(className)} {...props}>
            {children ?? (isDark ? <Sun /> : <Moon />)}
            <span className="sr-only">{props["aria-label"] || t("切换主题")}</span>
        </button>
    );
};
