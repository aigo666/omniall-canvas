export const modelChannelProtocols = [
    { value: "omniall", label: "OmniallAI", baseUrl: "https://api.omniall.ai", apiKeyUrl: "https://omniall.ai/console/token" },
    { value: "openai", label: "OpenAI", baseUrl: "https://api.openai.com" },
    { value: "gemini", label: "Gemini", baseUrl: "https://generativelanguage.googleapis.com" },
    { value: "comfyui", label: "ComfyUI", baseUrl: "" },
    { value: "ark", label: "火山方舟", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", directRequestPlan: true },
] as const;

/** Kept for already-saved channels and adapters; hidden from the add-channel picker. */
export const legacyModelChannelProtocols = [
    { value: "autodl", label: "AutoDL", baseUrl: "https://autodl.art", directRequestPlan: true },
    { value: "kie", label: "KIE", baseUrl: "https://api.kie.ai/api/v1", directRequestPlan: true },
    { value: "mimo", label: "MiMo", baseUrl: "https://api.xiaomimimo.com", apiKeyUrl: "https://platform.xiaomimimo.com/?ref=JFZQR2" },
    { value: "grok2api", label: "Grok2API", baseUrl: "" },
    { value: "minimax", label: "MiniMax & METASO", baseUrl: "https://metaso.cn/api/minimax", apiKeyUrl: "https://metaso.cn/minimax-h3/?s=tt" },
    { value: "apimart", label: "APIMart", baseUrl: "https://api.apimart.ai/v1", apiKeyUrl: "https://apimart.ai/register?aff=fWMrEv", directRequestPlan: true },
    { value: "88api", label: "88API", baseUrl: "https://88api.ai/v1", apiKeyUrl: "https://88api.ai/sign-up?aff=25ty" },
    { value: "tokendance", label: "TokenDance", baseUrl: "https://tokendance.space/gateway/v1", directRequestPlan: true },
    { value: "runninghub", label: "RunningHub", baseUrl: "https://www.runninghub.cn" },
] as const;

const allModelChannelProtocols = [...modelChannelProtocols, ...legacyModelChannelProtocols] as const;

export type ModelChannelProtocol = (typeof allModelChannelProtocols)[number]["value"];
export type DirectAIProvider = Extract<(typeof allModelChannelProtocols)[number], { directRequestPlan: true }>["value"];
export const modelChannelProtocolOptions = modelChannelProtocols.map(({ value, label }) => ({ label, value }));
export const modelChannelDefaultBaseUrls = Object.fromEntries(allModelChannelProtocols.map(({ value, baseUrl }) => [value, baseUrl])) as Record<ModelChannelProtocol, string>;
export const modelChannelApiKeyUrls = Object.fromEntries(allModelChannelProtocols.flatMap((protocol) => ("apiKeyUrl" in protocol ? [[protocol.value, protocol.apiKeyUrl]] : []))) as Partial<Record<ModelChannelProtocol, string>>;

export const tokenDanceAppUrl = "https://infinite-canvas";

export function modelChannelAttributionHeaders(protocol: string) {
    return protocol === "tokendance" ? { "X-App-URL": tokenDanceAppUrl } : {};
}

const directRequestProviders: ReadonlySet<string> = new Set(allModelChannelProtocols.flatMap((protocol) => ("directRequestPlan" in protocol && protocol.directRequestPlan === true ? [protocol.value] : [])));

export function directAIProviderForProtocol(protocol: string): DirectAIProvider | null {
    return directRequestProviders.has(protocol) ? (protocol as DirectAIProvider) : null;
}

export function isWorkflowProtocol(protocol: string): protocol is "runninghub" | "comfyui" {
    return protocol === "runninghub" || protocol === "comfyui";
}
