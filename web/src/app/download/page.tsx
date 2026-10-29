import type { Metadata } from "next";

import { DownloadPage } from "./download-page";

import { t } from "@/i18n";
export const metadata: Metadata = {
    get title() { return t("下载 OmniAll Canvas"); },
    get description() { return t("下载 OmniAll Canvas 的 Windows 与 macOS 安装包，在本机打开无限画布。"); },
};

export default function Page() {
    return <DownloadPage />;
}
