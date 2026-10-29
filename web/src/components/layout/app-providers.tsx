"use client";

import { t } from "@/i18n";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { ProConfigProvider } from "@ant-design/pro-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";

import { ClientRootInit } from "@/components/layout/client-root-init";
import { WorkflowAgentHost } from "@/components/workflows/workflow-agent-host";
import { getAntThemeConfig } from "@/lib/app-theme";
import { useLocaleStore } from "@/stores/use-locale-store";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: false,
            refetchOnWindowFocus: false,
        },
    },
});

function LocaleTree({ children }: { children: ReactNode }) {
    const locale = useLocaleStore((state) => state.locale);
    return (
        <div key={locale} className="contents">
            {children}
        </div>
    );
}

export function AppProviders({ children }: { children: ReactNode }) {
    const locale = useLocaleStore((state) => state.locale);
    useEffect(() => {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
        document.documentElement.style.backgroundColor = "#0b0b0b";
        document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
        document.title = locale === "en" ? "Canvas" : t("无限画布");
    }, [locale]);

    return (
        <ConfigProvider locale={locale === "en" ? enUS : zhCN} theme={getAntThemeConfig(true)}>
            <ProConfigProvider dark>
                <App>
                    <QueryClientProvider client={queryClient}>
                        <ClientRootInit>
                            <LocaleTree>{children}</LocaleTree>
                        </ClientRootInit>
                        <WorkflowAgentHost />
                    </QueryClientProvider>
                </App>
            </ProConfigProvider>
        </ConfigProvider>
    );
}
