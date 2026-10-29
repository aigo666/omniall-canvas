import assert from "node:assert/strict";
import test from "node:test";
import { directAIProviderForProtocol, modelChannelApiKeyUrls, modelChannelDefaultBaseUrls, modelChannelProtocolOptions } from "./model-channel";

test("add-channel picker hides removed providers and includes OmniallAI", () => {
    assert.deepEqual(modelChannelProtocolOptions, [
        { label: "OmniallAI", value: "omniall" },
        { label: "OpenAI", value: "openai" },
        { label: "Gemini", value: "gemini" },
        { label: "ComfyUI", value: "comfyui" },
        { label: "火山方舟", value: "ark" },
    ]);
    for (const value of ["autodl", "kie", "mimo", "grok2api", "minimax", "apimart", "88api", "tokendance", "runninghub"]) {
        assert.equal(modelChannelProtocolOptions.some((item) => item.value === value), false, value);
    }
});

test("built-in protocols retain default URLs and API Key links for selectable and legacy providers", () => {
    assert.equal(modelChannelDefaultBaseUrls.omniall, "https://api.omniall.ai");
    assert.equal(modelChannelDefaultBaseUrls.openai, "https://api.openai.com");
    assert.equal(modelChannelDefaultBaseUrls.minimax, "https://metaso.cn/api/minimax");
    assert.equal(modelChannelDefaultBaseUrls.tokendance, "https://tokendance.space/gateway/v1");
    assert.deepEqual(modelChannelApiKeyUrls, {
        omniall: "https://omniall.ai/console/token",
        minimax: "https://metaso.cn/minimax-h3/?s=tt",
        apimart: "https://apimart.ai/register?aff=fWMrEv",
        "88api": "https://88api.ai/sign-up?aff=25ty",
        mimo: "https://platform.xiaomimimo.com/?ref=JFZQR2",
    });
});

test("public parameter translation eligibility keeps exact protocol matching", () => {
    assert.equal(directAIProviderForProtocol("kie"), "kie");
    assert.equal(directAIProviderForProtocol("apimart"), "apimart");
    assert.equal(directAIProviderForProtocol("autodl"), "autodl");
    assert.equal(directAIProviderForProtocol("ark"), "ark");
    assert.equal(directAIProviderForProtocol("tokendance"), "tokendance");
    assert.equal(directAIProviderForProtocol("omniall"), null);
    for (const protocol of ["openai", "gemini", "grok2api", "minimax", "mimo", "KIE", " kie ", "APIMart", "ARK", " ark ", "", "unknown"]) {
        assert.equal(directAIProviderForProtocol(protocol), null, protocol);
    }
});
