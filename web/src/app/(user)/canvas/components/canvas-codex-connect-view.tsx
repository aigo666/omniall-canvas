"use client";

import type { useCodexAgent } from "../agent/use-codex-agent";
import { CanvasCodexPluginCard } from "./canvas-codex-plugin-card";

export function CanvasCodexConnectView({ agent, onChat }: {
    agent: Pick<ReturnType<typeof useCodexAgent>, "connection" | "status" | "error" | "connect">;
    onChat: () => void;
}) {
    return (
        <CanvasCodexPluginCard
            connecting={agent.status === "connecting"}
            error={agent.error}
            onConnect={() => { void agent.connect(agent.connection).then((ok) => { if (ok) onChat(); }); }}
        />
    );
}
