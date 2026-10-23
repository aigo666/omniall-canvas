"use client";

import { t } from "@/i18n";
import { App, Button, Form, Input, Modal, Radio, Segmented, Select, Switch } from "antd";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChannelModelSelectorModal } from "@/components/channel-model-selector-modal";
import type { WorkflowChannelSettings } from "@/components/workflow/workflow-channel-pane";
import { GrokTtsVoiceSelect } from "@/components/grok-tts-voice-select";
import { ModelPicker } from "@/components/model-picker";
import { fetchImageModels } from "@/services/api/image";
import { fetchUserConfig, measureUserStorageProvider, syncUserModelConfig, syncUserStorageProvider } from "@/services/api/user-config";
import { clearStorageConfigCache as clearFileStorageCache } from "@/services/file-storage";
import { clearStorageConfigCache as clearImageStorageCache, defaultUserStorageProvider, defaultUserWebDAVStorageProvider, loadStorageConfig, loadUserS3StorageProvider, loadUserWebDAVStorageProvider, saveUserStorageProvider, saveUserWebDAVStorageProvider, type UserStorageProvider } from "@/services/image-storage";
import { audioFormatOptions, audioVoiceOptions, glmTtsFormatOptions, glmTtsVoiceOptions, isGlmTtsModel, normalizeAudioSpeedValue, normalizeGlmTtsFormat, normalizeGlmTtsSpeed, normalizeGlmTtsVoice } from "@/lib/audio-generation";
import { grokTtsFormatOptions, grokTtsLanguageOptions, isGrok2APITtsConfig, normalizeGrokTtsFormat, normalizeGrokTtsLanguage, normalizeGrokTtsSpeed } from "@/lib/grok-tts";
import { isGeminiConfig, isGeminiTtsModel } from "@/lib/gemini";
import { geminiTtsVoiceOptions, normalizeGeminiTtsVoice } from "@/lib/gemini-tts";
import { isMimoPresetTtsModel, isMimoTtsModel, isMimoVoiceCloneModel, isMimoVoiceDesignModel, mimoTtsFormatOptions, mimoTtsVoiceOptions } from "@/lib/mimo-tts";
import { isWorkflowProtocol, modelChannelApiKeyUrls, modelChannelDefaultBaseUrls, modelChannelProtocolOptions } from "@/lib/model-channel";
import { startTokenDanceOAuth } from "@/lib/tokendance-oauth";
import type { WorkflowChannelData, WorkflowEntry } from "@/lib/workflow-channel";
import { listWorkflowChannels, readWorkflowChannel, replaceWorkflowChannels, saveWorkflowChannel } from "@/services/workflow-channel-storage";
import { commitPreparedLocalChannels, filterChannelModelsByCapability, normalizeLocalChannels, useConfigStore, useEffectiveConfig, type AiConfig, type LocalModelChannel, type ModelCapabilities, type ModelCapability } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";
import { useChannelTranslationStore } from "@/stores/use-channel-translation-store";
import { SetupGuide, resetSetupGuide, shouldOfferSetupGuide, type SetupGuideStep } from "@/components/layout/setup-guide";

type ModelGroup = {
    capability: ModelCapability;
    modelKey: "imageModel" | "videoModel" | "textModel" | "audioModel";
    workflowKey?: "imageWorkflowRef" | "videoWorkflowRef" | "audioWorkflowRef";
    channelKey: "imageChannelId" | "videoChannelId" | "textChannelId" | "audioChannelId";
    modelsKey: "imageModels" | "videoModels" | "textModels" | "audioModels";
    defaultLabel: string;
    optionsLabel: string;
};

const modelGroups: ModelGroup[] = [
    { capability: "image", modelKey: "imageModel", workflowKey: "imageWorkflowRef", channelKey: "imageChannelId", modelsKey: "imageModels", get defaultLabel() { return t("默认生图模型"); }, get optionsLabel() { return t("生图模型可选项"); } },
    { capability: "video", modelKey: "videoModel", workflowKey: "videoWorkflowRef", channelKey: "videoChannelId", modelsKey: "videoModels", get defaultLabel() { return t("默认视频模型"); }, get optionsLabel() { return t("视频模型可选项"); } },
    { capability: "text", modelKey: "textModel", channelKey: "textChannelId", modelsKey: "textModels", get defaultLabel() { return t("默认文本模型"); }, get optionsLabel() { return t("文本模型可选项"); } },
    { capability: "audio", modelKey: "audioModel", workflowKey: "audioWorkflowRef", channelKey: "audioChannelId", modelsKey: "audioModels", get defaultLabel() { return t("默认音频模型"); }, get optionsLabel() { return t("音频模型可选项"); } },
];

const WorkflowChannelPane = dynamic(() => import("@/components/workflow/workflow-channel-pane").then((module) => module.WorkflowChannelPane), { ssr: false });

export function AppConfigModal() {
    const { message } = App.useApp();
    const [loadingModels, setLoadingModels] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [modelSelectChannelId, setModelSelectChannelId] = useState("");
    const [parameterTranslation, setParameterTranslation] = useState<string>();
    const [workflowEntries, setWorkflowEntries] = useState<WorkflowEntry[]>([]);
    const accountConfigRef = useRef<{ ready: boolean; workflowChannels?: WorkflowChannelData[] }>({ ready: false });
    const [remoteStorageSyncEnabled, setRemoteStorageSyncEnabled] = useState(false);
    const [remoteWebDAVStorageSyncEnabled, setRemoteWebDAVStorageSyncEnabled] = useState(false);
    const [allowUserStorageProvider, setAllowUserStorageProvider] = useState(false);
    const [userStorage, setUserStorage] = useState(() => defaultUserStorageProvider());
    const [userWebDAVStorage, setUserWebDAVStorage] = useState(() => defaultUserWebDAVStorageProvider());
    const [measuringStorageType, setMeasuringStorageType] = useState<"s3" | "webdav" | null>(null);
    const [storageUsageText, setStorageUsageText] = useState("");
    const [webDAVStorageUsageText, setWebDAVStorageUsageText] = useState("");
    const [setupGuideOpen, setSetupGuideOpen] = useState(false);
    const [setupGuideKey, setSetupGuideKey] = useState(0);
    const config = useConfigStore((state) => state.config);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const isConfigOpen = useConfigStore((state) => state.isConfigOpen);
    const shouldPromptContinue = useConfigStore((state) => state.shouldPromptContinue);
    const setConfigDialogOpen = useConfigStore((state) => state.setConfigDialogOpen);
    const clearPromptContinue = useConfigStore((state) => state.clearPromptContinue);
    const publicSettings = useConfigStore((state) => state.publicSettings);
    const token = useUserStore((state) => state.token);
    const user = useUserStore((state) => state.user);
    const effectiveConfig = useEffectiveConfig();
    const modelChannel = publicSettings?.modelChannel;
    const isLoggedIn = Boolean(token && user);
    const canUseRemoteChannel = isLoggedIn && (user?.role === "admin" || modelChannel?.allowUserRemoteChannel === true);
    const allowCustomChannel = isLoggedIn && modelChannel?.allowCustomChannel === true;
    const effectiveMode = canUseRemoteChannel ? (allowCustomChannel ? config.channelMode : "remote") : "local";
    const localModelConfig: AiConfig = effectiveMode === "local" && config.channelMode !== "local" ? { ...config, channelMode: "local" } : config;
    const modelConfig = effectiveMode === "remote" ? effectiveConfig : localModelConfig;
    const canUseUserStorageProvider = allowUserStorageProvider;
    const setupSteps = useMemo<SetupGuideStep[]>(() => {
        const steps: SetupGuideStep[] = [];
        if (allowCustomChannel && canUseRemoteChannel) {
            steps.push({ id: "channel-mode", title: t("选择渠道"), description: t("本地直连使用你自己的 OmniallAI 令牌；云端渠道由系统转发，不用自己填密钥。") });
        }
        if (!canUseRemoteChannel || allowCustomChannel) {
            steps.push(
                { id: "local-protocol", title: t("连接 OmniallAI"), description: t("本地渠道选择 OmniallAI，地址会随所选渠道自动填好。") },
                { id: "api-key", title: t("创建令牌"), description: t("点「创建令牌」打开 OmniallAI 工作台，创建后把令牌粘贴到 API Key。") },
                { id: "fetch-models", title: t("拉取模型列表"), description: t("地址和令牌填好后，点「拉取全部渠道」，先拿到这个渠道的模型列表。") },
            );
        }
        if (canUseRemoteChannel) {
            steps.push({ id: "remote-channel", title: t("云端渠道"), description: t("切到云端渠道后，直接使用系统已开通的模型。") });
        }
        steps.push(
            { id: "default-models", title: t("默认模型"), description: t("为生图、视频、文本、音频分别选择要使用的默认模型。") },
            { id: "finish", title: t("保存配置"), description: t("点完成保存。之后可以从右上角设置重新打开。") },
        );
        return steps;
    }, [allowCustomChannel, canUseRemoteChannel]);
    const glmTts = isGlmTtsModel(config.audioModel);
    const audioConfig = { ...modelConfig, model: config.audioModel, audioModel: config.audioModel, activeChannelId: modelConfig.audioChannelId || modelConfig.activeChannelId };
    const grokTts = isGrok2APITtsConfig(audioConfig, config.audioModel);
    const geminiTts = isGeminiTtsModel(config.audioModel) && isGeminiConfig(audioConfig, config.audioModel);
    const modelSelectChannel = normalizeLocalChannels(config).find((channel) => channel.id === modelSelectChannelId);

    useEffect(() => {
        setParameterTranslation(undefined);
        if (!modelSelectChannelId) return;
        let canceled = false;
        void useChannelTranslationStore.getState().load(user?.id || "guest")
            .then((records) => { if (!canceled) setParameterTranslation(records[modelSelectChannelId] || ""); })
            .catch((error) => { if (!canceled) message.error(error instanceof Error ? error.message : t("读取传参配置失败")); });
        return () => { canceled = true; };
    }, [modelSelectChannelId, user?.id, message]);

    useEffect(() => {
        setWorkflowEntries([]);
        if (!modelSelectChannel || !isWorkflowProtocol(modelSelectChannel.protocol)) return;
        const protocol = modelSelectChannel.protocol;
        let canceled = false;
		void readWorkflowChannel(user?.id || "guest", protocol, modelSelectChannel.id)
            .then((items) => { if (!canceled) setWorkflowEntries(items); })
            .catch((error) => { if (!canceled) message.error(error instanceof Error ? error.message : t("读取工作流配置失败")); });
        return () => { canceled = true; };
    }, [modelSelectChannelId, modelSelectChannel?.protocol, user?.id]);

    useEffect(() => {
        setUserStorage(loadUserS3StorageProvider() || defaultUserStorageProvider());
        setUserWebDAVStorage(loadUserWebDAVStorageProvider() || defaultUserWebDAVStorageProvider());
        accountConfigRef.current = { ready: false };
        if (!isConfigOpen || !token || !user?.id) return;
        const accountToken = token;
        const accountId = user.id;
        const translationRevision = useChannelTranslationStore.getState().revisions[accountId] || 0;
        let canceled = false;
        void fetchUserConfig(accountToken)
            .then(async (payload) => {
                if (canceled || useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) return;
                const remoteConfig = payload.modelConfig;
                const remoteWorkflowChannels = remoteConfig?.workflowChannels;
                const syncS3 = remoteConfig?.syncStorageConfig === true;
                const syncWebDAV = remoteConfig?.syncWebDAVStorageConfig === true;
                setRemoteStorageSyncEnabled(syncS3);
                setRemoteWebDAVStorageSyncEnabled(syncWebDAV);
                if (remoteConfig) {
                    const { workflowChannels, channelTranslations, ...modelFields } = remoteConfig;
                    delete modelFields.workflowSyncTouched;
                    await useChannelTranslationStore.getState().replace(accountId, channelTranslations || [], translationRevision);
                    if (canceled || useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) return;
                    if (workflowChannels !== undefined) {
                        try {
                            await replaceWorkflowChannels(accountId, workflowChannels);
                            if (canceled || useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) return;
                            updateConfig("workflowSyncTouched", true);
                        } catch {
                            if (canceled || useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) return;
                            updateConfig("workflowSyncTouched", false);
                        }
                    }
                    if (canceled || useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) return;
                    Object.entries(modelFields)
                        .forEach(([key, value]) => updateConfig(key as keyof AiConfig, value as never));
                    commitPreparedLocalChannels(updateConfig);
                }
                accountConfigRef.current = { ready: true, workflowChannels: remoteWorkflowChannels };
                updateConfig("syncStorageConfig", syncS3);
                updateConfig("syncWebDAVStorageConfig", syncWebDAV);
                if (syncS3 && payload.storageProvider?.s3) {
                    const next = { ...defaultUserStorageProvider(), ...payload.storageProvider.s3, type: "s3" as const };
                    setUserStorage(next);
                    saveUserStorageProvider(next);
                }
                if (syncWebDAV && payload.storageProvider?.webdav) {
                    const next = { ...defaultUserWebDAVStorageProvider(), ...payload.storageProvider.webdav, type: "webdav" as const };
                    setUserWebDAVStorage(next);
                    saveUserWebDAVStorageProvider(next);
                }
            })
            .catch(() => { });
        return () => {
            canceled = true;
        };
    }, [isConfigOpen, token, updateConfig, user?.id]);

    useEffect(() => {
        if (!isConfigOpen) return;
        let canceled = false;
        void loadStorageConfig()
            .then((storage) => {
                if (!canceled) setAllowUserStorageProvider(storage.allowUserProvider === true);
            })
            .catch(() => {
                if (!canceled) setAllowUserStorageProvider(false);
            });
        return () => {
            canceled = true;
        };
    }, [isConfigOpen]);

    const finishConfig = async () => {
        const localIncomplete = effectiveMode === "local" && normalizeLocalChannels(config).filter((channel) => !isWorkflowProtocol(channel.protocol)).some((channel) => !channel.baseUrl.trim() || !channel.apiKey.trim());
        const modelIncomplete = !modelConfig.imageModel.trim() || !modelConfig.videoModel.trim() || !modelConfig.textModel.trim();
		if (userStorage.enabled && userWebDAVStorage.enabled) {
			message.error(t("S3/R2 与 WebDAV 不能同时启用"));
			return;
		}
		if (token && !accountConfigRef.current.ready) {
			message.warning(t("账号配置仍在加载，请稍后再保存"));
			return;
		}
        if (!canUseRemoteChannel && config.channelMode !== "local") updateConfig("channelMode", "local");
        else if (canUseRemoteChannel && !allowCustomChannel && config.channelMode !== "remote") updateConfig("channelMode", "remote");
        if (canUseUserStorageProvider) {
            saveUserStorageProvider(userStorage);
            saveUserWebDAVStorageProvider(userWebDAVStorage);
        }
        setSavingConfig(true);
		try {
			if (token) {
                const configToSave = effectiveMode === "local" && config.channelMode !== "local" ? { ...config, channelMode: "local" as const } : config;
                const workflowChannels = normalizeLocalChannels(config).filter((channel) => isWorkflowProtocol(channel.protocol));
                let workflowData = accountConfigRef.current.workflowChannels;
                if (config.workflowSyncTouched) {
                    const stored = user?.id ? await listWorkflowChannels(user.id) : [];
                    const activeKeys = new Set(workflowChannels.map((channel) => `${channel.protocol}:${channel.id}`));
                    workflowData = stored.filter((channel) => activeKeys.has(`${channel.protocol}:${channel.channelId}`));
                }
                const translations = user?.id && accountConfigRef.current.ready
                    ? await useChannelTranslationStore.getState().list(user.id, normalizeLocalChannels(configToSave).map((channel) => channel.id)) : undefined;
                await syncUserModelConfig(token, configToSave, workflowData, translations);
            }
            const providers = {
                ...(config.syncStorageConfig || remoteStorageSyncEnabled ? { s3: config.syncStorageConfig ? userStorage : { ...userStorage, enabled: false, endpoint: "", bucket: "", accessKeyId: "", secretAccessKey: "" } } : {}),
                ...(config.syncWebDAVStorageConfig || remoteWebDAVStorageSyncEnabled ? { webdav: config.syncWebDAVStorageConfig ? userWebDAVStorage : { ...userWebDAVStorage, enabled: false, endpoint: "", username: "", password: "" } } : {}),
            };
            if (token && canUseUserStorageProvider && Object.keys(providers).length) {
                await syncUserStorageProvider(token, providers);
                setRemoteStorageSyncEnabled(config.syncStorageConfig);
                setRemoteWebDAVStorageSyncEnabled(config.syncWebDAVStorageConfig);
            }
            clearImageStorageCache();
            clearFileStorageCache();
            setConfigDialogOpen(false);
            if ((config.syncStorageConfig || config.syncWebDAVStorageConfig) && !token) message.warning(t("请登录后再同步配置"));
            else if (localIncomplete || modelIncomplete) message.warning(t("部分模型或本地渠道密钥尚未配置完整，配置已保存"));
            else message.success(shouldPromptContinue ? t("配置已保存，请继续刚才的请求") : t("配置已保存"));
            clearPromptContinue();
        } catch (error) {
            message.error(error instanceof Error ? t("同步配置失败：") + error.message : t("同步配置失败"));
        } finally {
            setSavingConfig(false);
        }
    };

    const refreshModels = async () => {
        if (effectiveMode === "remote") return;
        const allChannels = normalizeLocalChannels(config);
        const channels = allChannels.filter((channel) => !isWorkflowProtocol(channel.protocol));
        if (channels.some((channel) => !channel.baseUrl.trim() || !channel.apiKey.trim())) {
            message.error(t("请先填写所有本地渠道的 Base URL 和 API Key"));
            return;
        }
        setLoadingModels(true);
        try {
            const results = await Promise.allSettled(channels.map(async (channel) => fetchImageModels(configForLocalChannel(config, channel))));
            const updated = new Map(channels.map((channel, index) => [channel.id, results[index]] as const));
            updateLocalChannels(allChannels.map((channel) => {
                const result = updated.get(channel.id);
                return result?.status === "fulfilled" ? { ...channel, models: result.value } : channel;
            }));
            const failedCount = results.filter((result) => result.status === "rejected").length;
            if (failedCount) message.warning(t("{failedCount} 个渠道拉取失败，已保留原有模型，可在“选择”中手动增加模型", { failedCount }));
            else message.success(t("模型列表已更新"));
        } finally {
            setLoadingModels(false);
        }
    };

	const updateLocalChannels = (channels: LocalModelChannel[]) => {
		const normalized = channels.length ? channels : normalizeLocalChannels({ baseUrl: config.baseUrl, apiKey: config.apiKey, models: config.models });
		const modelChannels = normalized.filter((channel) => !isWorkflowProtocol(channel.protocol));
        const models = uniqueModels(modelChannels.flatMap((channel) => channel.models));
        const nextImageModels = filterChannelModelsByCapability(modelChannels, "image");
        const nextVideoModels = filterChannelModelsByCapability(modelChannels, "video");
        const nextTextModels = filterChannelModelsByCapability(modelChannels, "text");
        const nextAudioModels = filterChannelModelsByCapability(modelChannels, "audio");
        const imageModel = nextImageModels.includes(config.imageModel) ? config.imageModel : nextImageModels[0] || "";
        const videoModel = nextVideoModels.includes(config.videoModel) ? config.videoModel : nextVideoModels[0] || "";
        const textModel = nextTextModels.includes(config.textModel) ? config.textModel : nextTextModels[0] || "";
        const audioModel = nextAudioModels.includes(config.audioModel) ? config.audioModel : nextAudioModels[0] || "";
        updateConfig("localChannels", normalized);
        updateConfig("models", models);
        updateConfig("imageModels", nextImageModels);
        updateConfig("videoModels", nextVideoModels);
        updateConfig("textModels", nextTextModels);
        updateConfig("audioModels", nextAudioModels);
        updateConfig("imageModel", imageModel);
        updateConfig("videoModel", videoModel);
        updateConfig("textModel", textModel);
        updateConfig("audioModel", audioModel);
        updateConfig("imageChannelId", channelIdForLocalModel(modelChannels, imageModel, config.imageChannelId, "image"));
        updateConfig("videoChannelId", channelIdForLocalModel(modelChannels, videoModel, config.videoChannelId, "video"));
        updateConfig("textChannelId", channelIdForLocalModel(modelChannels, textModel, config.textChannelId, "text"));
        updateConfig("audioChannelId", channelIdForLocalModel(modelChannels, audioModel, config.audioChannelId, "audio"));
        updateConfig("baseUrl", modelChannels[0]?.baseUrl || config.baseUrl);
        updateConfig("apiKey", modelChannels[0]?.apiKey || config.apiKey);
    };

    const focusGuideStep = useCallback((step: SetupGuideStep) => {
        const current = useConfigStore.getState().config;
        if ((step.id === "local-protocol" || step.id === "api-key" || step.id === "fetch-models") && current.channelMode !== "local") updateConfig("channelMode", "local");
        if (step.id === "remote-channel" && canUseRemoteChannel && current.channelMode !== "remote") updateConfig("channelMode", "remote");
        window.requestAnimationFrame(() => document.querySelector(`[data-guide-target="${step.id}"]`)?.scrollIntoView({ block: "nearest" }));
    }, [canUseRemoteChannel, updateConfig]);

    useEffect(() => {
        if (!isConfigOpen || !shouldOfferSetupGuide()) {
            setSetupGuideOpen(false);
            return;
        }
        setSetupGuideOpen(true);
    }, [isConfigOpen]);

    const patchLocalChannel = (id: string, patch: Partial<LocalModelChannel>) => {
        updateLocalChannels(normalizeLocalChannels(config).map((channel) => (channel.id === id ? { ...channel, ...patch } : channel)));
    };

    const addLocalChannel = () => {
        updateLocalChannels([...normalizeLocalChannels(config), { id: "local-" + Date.now(), protocol: "omniall", name: "新渠道", baseUrl: modelChannelDefaultBaseUrls.omniall, apiKey: "", models: [] }]);
    };

    const removeLocalChannel = (id: string) => {
        updateLocalChannels(normalizeLocalChannels(config).filter((channel) => channel.id !== id));
        void useChannelTranslationStore.getState().save(user?.id || "guest", id, "").catch((error) => message.error(error instanceof Error ? error.message : t("删除传参配置失败")));
    };

    const loginTokenDance = (channelId: string) => {
        void startTokenDanceOAuth({ target: "local", channelId })
            .catch((error) => message.error(error instanceof Error ? error.message : t("TokenDance 登录失败")));
    };

    const openLocalModelSelector = (channel: LocalModelChannel) => setModelSelectChannelId(channel.id);

    const closeLocalModelSelector = () => setModelSelectChannelId("");

    const confirmLocalModelSelector = async (models: string[], modelCapabilities: ModelCapabilities, source: string) => {
        if (!modelSelectChannelId) return;
        const accountId = user?.id || "guest";
        if (parameterTranslation !== undefined && source !== parameterTranslation) {
            if (token && !accountConfigRef.current.ready) throw new Error(t("账号配置尚未加载成功，请重新打开设置后保存传参配置"));
            const latest = (await useChannelTranslationStore.getState().load(accountId))[modelSelectChannelId] || "";
            if (latest !== parameterTranslation) throw new Error(t("渠道传参配置已更新，请重新打开模型设置后保存"));
            await useChannelTranslationStore.getState().save(accountId, modelSelectChannelId, source);
            if ((useUserStore.getState().user?.id || "guest") !== accountId) throw new Error(t("登录状态已变化"));
        }
        patchLocalChannel(modelSelectChannelId, { models, modelCapabilities });
        closeLocalModelSelector();
    };

    const changePersonalWorkflows = (items: WorkflowEntry[]) => {
        if (!modelSelectChannel || !isWorkflowProtocol(modelSelectChannel.protocol)) return;
        const protocol = modelSelectChannel.protocol;
        setWorkflowEntries(items);
        patchLocalChannel(modelSelectChannel.id, { workflowSummaries: items.map(({ provider, kind, workflowId, title, capability, enabled }) => ({ provider, kind, workflowId, title, capability, enabled })) });
		void saveWorkflowChannel(user?.id || "guest", protocol, modelSelectChannel.id, items).catch((error) => {
			message.error(error instanceof Error ? error.message : t("保存工作流配置失败"));
        });
    };

    const syncPersonalWorkflows = async () => {
        if (!token || !user || !modelSelectChannel || !isWorkflowProtocol(modelSelectChannel.protocol)) {
            throw new Error(t("请先登录并选择工作流渠道"));
        }
        const accountToken = token;
        const accountId = user.id;
        const channelId = modelSelectChannel.id;
        const protocol = modelSelectChannel.protocol;
        const entries = workflowEntries;
        if (useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) {
            throw new Error(t("登录状态已变化"));
		}
		const current = useConfigStore.getState().config;
		if (!current.workflowSyncTouched) throw new Error(t("账号配置仍在加载"));
		await saveWorkflowChannel(accountId, protocol, channelId, entries);
        if (useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) {
            throw new Error(t("登录状态已变化"));
        }
        const channels = normalizeLocalChannels(current).filter((item) => isWorkflowProtocol(item.protocol));
        const keys = new Set(channels.map((item) => `${item.protocol}:${item.id}`));
        if (!keys.has(`${protocol}:${channelId}`)) throw new Error(t("工作流渠道已变化"));
        const saved = (await listWorkflowChannels(accountId)).filter((item) => keys.has(`${item.protocol}:${item.channelId}`));
        if (useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) {
            throw new Error(t("登录状态已变化"));
        }
        const translations = await useChannelTranslationStore.getState().list(accountId, normalizeLocalChannels(current).map((channel) => channel.id));
        await syncUserModelConfig(accountToken, current, saved, translations);
        if (useUserStore.getState().token !== accountToken || useUserStore.getState().user?.id !== accountId) {
            throw new Error(t("登录状态已变化"));
        }
        return channelId;
    };

    const finishWorkflowChannel = () => {
        if (!token || !user) {
            closeLocalModelSelector();
            return;
        }
        void syncPersonalWorkflows()
            .then(closeLocalModelSelector)
            .catch((error) => message.error(error instanceof Error ? error.message : t("同步工作流配置失败")));
    };

    const fetchLocalModelList = async () => {
        if (!modelSelectChannel) return;
        if (!modelSelectChannel.baseUrl.trim() || !modelSelectChannel.apiKey.trim()) {
            message.error(t("请先填写该渠道的 Base URL 和 API Key"));
            return;
        }
        return uniqueModels(await fetchImageModels(configForLocalChannel(config, modelSelectChannel)));
    };


    const measureStorage = async (provider: UserStorageProvider) => {
        if (!token) {
            message.warning(t("请先登录后再统计容量"));
            return;
        }
        setMeasuringStorageType(provider.type);
        try {
            const result = await measureUserStorageProvider(token, provider);
            const usageText = formatBytes(result.bytes) + " / " + formatBytes(result.limitBytes) + (result.overLimit ? t("，已达到上限") : "");
            if (provider.type === "webdav") {
                setWebDAVStorageUsageText(usageText);
                if (result.overLimit) {
                    const next = { ...userWebDAVStorage, enabled: false };
                    setUserWebDAVStorage(next);
                    saveUserWebDAVStorageProvider(next);
                }
            } else {
                setStorageUsageText(usageText);
                if (result.overLimit) {
                    const next = { ...userStorage, enabled: false };
                    setUserStorage(next);
                    saveUserStorageProvider(next);
                }
            }
            message.success(t("容量统计完成"));
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("容量统计失败"));
        } finally {
            setMeasuringStorageType(null);
        }
    };

    return (
        <>
            <Modal
            title={
                <div className="flex items-start justify-between gap-3 pr-8">
                    <div>
                        <div className="text-lg font-semibold">{t("配置与用户偏好")}</div>
                        <div className="mt-1 text-xs font-normal text-stone-500">{t("模型、渠道和画布默认行为")}</div>
                    </div>
                    <Button
                        size="small"
                        className="!border-[#c8ff00] !text-[#c8ff00]"
                        onClick={() => {
                            resetSetupGuide();
                            setSetupGuideKey((value) => value + 1);
                            setSetupGuideOpen(true);
                        }}
                    >
                        
                        {t("新手引导")}
                    </Button>
                </div>
            }
            open={isConfigOpen}
            width={960}
            centered
            onCancel={() => setConfigDialogOpen(false)}
            styles={{ body: { maxHeight: "72vh", overflowY: "auto", paddingRight: 18 } }}
            footer={
                <span data-guide-target="finish">
                    <Button type="primary" loading={savingConfig} onClick={() => void finishConfig()}>
                        
                        {t("完成")}
                    </Button>
                </span>
            }
        >
            <div className="pt-1">
                <Form layout="vertical" requiredMark={false}>
                    {allowCustomChannel && canUseRemoteChannel ? (
                        <Form.Item label={t("渠道模式")} className="mb-5" data-guide-target="channel-mode">
                            <Segmented
                                block
                                size="middle"
                                value={effectiveMode}
                                onChange={(value) => updateConfig("channelMode", value as AiConfig["channelMode"])}
                                options={[
                                    { label: t("本地直连"), value: "local" },
                                    { label: t("云端渠道"), value: "remote" },
                                ]}
                            />
                        </Form.Item>
                    ) : null}
                    {effectiveMode === "local" ? (
                        <>
                            <div className="mb-5 space-y-3 rounded-lg border border-stone-200 p-3 dark:border-stone-800" data-guide-target="local-protocol">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium">{t("本地模型渠道")}</div>
                                        <div className="mt-1 text-xs text-stone-500">{t("可为生图、视频、文本、音频分别选择不同渠道的模型。")}</div>
                                    </div>
                                    <Button size="small" onClick={addLocalChannel}>
                                        
                                        {t("新增渠道")}
                                    </Button>
                                </div>
                                {normalizeLocalChannels(config).map((channel, index) => (
                                    <div key={channel.id} className="space-y-2 rounded-md bg-stone-50 p-2 dark:bg-stone-900">
                                        <div className="grid gap-2 md:grid-cols-[130px_150px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                            <Input value={channel.name} placeholder={t("渠道名称")} onChange={(event) => patchLocalChannel(channel.id, { name: event.target.value })} />
                                            <Select
                                                value={channel.protocol}
                                                options={modelChannelProtocolOptions}
                                                onChange={(protocol: LocalModelChannel["protocol"]) => patchLocalChannel(channel.id, { protocol, protocolSelected: true, baseUrl: modelChannelDefaultBaseUrls[protocol] })}
                                            />
                                            {isWorkflowProtocol(channel.protocol) ? <div className="flex h-8 items-center justify-center rounded-md border border-dashed border-[var(--ant-color-border)] px-3 text-xs text-[var(--ant-color-text-secondary)] md:col-span-2">{t("连接信息和工作流在「选择」里配置")}</div> : <><Input value={channel.baseUrl} placeholder="Base URL" onChange={(event) => patchLocalChannel(channel.id, { baseUrl: event.target.value })} /><Input.Password value={channel.apiKey} placeholder="API Key" onChange={(event) => patchLocalChannel(channel.id, { apiKey: event.target.value })} /></>}
                                            <div className="relative flex flex-wrap gap-2 md:flex-nowrap">
                                                <Button size="small" onClick={() => openLocalModelSelector(channel)}>
                                                    
                                                    {t("选择")}
                                                </Button>
                                                <Button size="small" danger disabled={index === 0 && normalizeLocalChannels(config).length === 1} onClick={() => removeLocalChannel(channel.id)}>
                                                    
                                                    {t("删除")}
                                                </Button>
                                                {channel.protocol === "tokendance" || modelChannelApiKeyUrls[channel.protocol] ? (
                                                    <div className="w-full md:absolute md:left-0 md:top-8" data-guide-target={index === 0 ? "api-key" : undefined}>
                                                        <Button
                                                            block
                                                            type="primary"
                                                            size="small"
                                                            href={channel.protocol === "tokendance" ? undefined : modelChannelApiKeyUrls[channel.protocol]}
                                                            target={channel.protocol === "tokendance" ? undefined : "_blank"}
                                                            onClick={channel.protocol === "tokendance" ? () => void loginTokenDance(channel.id) : undefined}
                                                        >
                                                            {channel.protocol === "tokendance" ? t("登录") : channel.protocol === "omniall" ? t("创建令牌") : t("获取 API Key")}
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="text-xs text-stone-500">{isWorkflowProtocol(channel.protocol) ? `已保存 ${channel.workflowSummaries?.length || 0} 条工作流` : `已保存 ${channel.models.length} 个模型`}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-800" data-guide-target="fetch-models">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium">{t("模型列表")}</div>
                                    <div className="mt-1 text-xs text-stone-500">{t("当前已保存")} {config.models.length}  {t("个模型")}</div>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                    <Button size="small" loading={loadingModels} onClick={() => void refreshModels()}>
                                        
                                        {t("拉取全部渠道")}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="mb-5 rounded-lg border border-stone-200 p-3 text-sm text-stone-500 dark:border-stone-800" data-guide-target="remote-channel">
                            <div className="font-medium text-stone-900 dark:text-stone-100">{t("云端渠道")}</div>
                            <div className="mt-1">{t("由系统后台渠道转发请求，当前可用")} {modelChannel?.availableModels.length || 0}  {t("个模型。")}</div>
                        </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-guide-target="default-models">
                        {modelGroups.map((group) => (
                            <Form.Item key={group.modelKey} label={group.defaultLabel} className="mb-4">
                                <ModelPicker config={modelConfig} value={modelConfig[group.modelKey]} channelId={modelConfig[group.channelKey]} workflowRef={group.workflowKey ? modelConfig[group.workflowKey] : undefined} onWorkflowChange={group.workflowKey ? (ref) => updateConfig(group.workflowKey!, ref) : undefined} onChange={(model, channelId) => { updateConfig(group.modelKey, model); if (channelId) updateConfig(group.channelKey, channelId); }} capability={group.capability} fullWidth />
                            </Form.Item>
                        ))}
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Form.Item label={t("画布默认生图张数")} extra={t("新建画布生图和配置节点默认使用，单个节点仍可单独覆盖。")} className="mb-4">
                            <Input
                                type="number"
                                min={1}
                                max={15}
                                value={config.canvasImageCount}
                                onChange={(event) => updateConfig("canvasImageCount", event.target.value)}
                                onBlur={(event) => updateConfig("canvasImageCount", normalizeImageCount(event.target.value))}
                            />
                        </Form.Item>
                        {geminiTts ? (
                            <Form.Item label={t("默认 Gemini 音色")} className="mb-4">
                                <Select showSearch optionFilterProp="label" value={normalizeGeminiTtsVoice(config.geminiTtsVoice)} options={geminiTtsVoiceOptions} onChange={(value) => updateConfig("geminiTtsVoice", value)} />
                            </Form.Item>
                        ) : isMimoPresetTtsModel(config.audioModel) ? (
                            <Form.Item label={t("默认 MiMo 音色")} className="mb-4">
                                <Select value={config.mimoTtsVoice} options={[...mimoTtsVoiceOptions]} onChange={(value) => updateConfig("mimoTtsVoice", value)} />
                            </Form.Item>
                        ) : isMimoVoiceDesignModel(config.audioModel) ? (
                            <Form.Item label={t("默认音色描述")} className="mb-4">
                                <Input value={config.mimoVoiceDesignPrompt} placeholder={t("例如：年轻女性，声音清亮自然，有亲和力。")} onChange={(event) => updateConfig("mimoVoiceDesignPrompt", event.target.value)} />
                            </Form.Item>
                        ) : isMimoTtsModel(config.audioModel) ? null : (
                            <Form.Item label={t("默认音频声音")} className="mb-4">
                                {grokTts ? <GrokTtsVoiceSelect config={audioConfig} model={config.audioModel} value={config.grokTtsVoice} enabled={isConfigOpen} onChange={(value) => updateConfig("grokTtsVoice", value)} /> : <Select value={glmTts ? normalizeGlmTtsVoice(config.glmTtsVoice) : config.audioVoice} options={glmTts ? glmTtsVoiceOptions : audioVoiceOptions} onChange={(value) => updateConfig(glmTts ? "glmTtsVoice" : "audioVoice", value)} />}
                            </Form.Item>
                        )}
                        {grokTts ? (
                            <Form.Item label={t("默认音频语言")} className="mb-4">
                                <Select value={normalizeGrokTtsLanguage(config.grokTtsLanguage)} options={grokTtsLanguageOptions} showSearch optionFilterProp="label" onChange={(value) => updateConfig("grokTtsLanguage", value)} />
                            </Form.Item>
                        ) : null}
                        {!geminiTts ? (
                            <Form.Item label={t("默认音频格式")} className="mb-4">
                                <Select value={isMimoTtsModel(config.audioModel) ? config.mimoTtsFormat : glmTts ? normalizeGlmTtsFormat(config.glmTtsFormat) : grokTts ? normalizeGrokTtsFormat(config.grokTtsFormat) : config.audioFormat} options={isMimoTtsModel(config.audioModel) ? [...mimoTtsFormatOptions] : glmTts ? glmTtsFormatOptions : grokTts ? grokTtsFormatOptions : audioFormatOptions} onChange={(value) => isMimoTtsModel(config.audioModel) ? updateConfig("mimoTtsFormat", value) : updateConfig(glmTts ? "glmTtsFormat" : grokTts ? "grokTtsFormat" : "audioFormat", value)} />
                            </Form.Item>
                        ) : null}
                        {!geminiTts && !isMimoTtsModel(config.audioModel) ? (
                            <Form.Item label={t("默认音频语速")} className="mb-4">
                                <Input
                                    type="number"
                                    min={glmTts ? 0.5 : grokTts ? 0.7 : 0.25}
                                    max={glmTts ? 2 : grokTts ? 1.5 : 4}
                                    step={0.05}
                                    value={glmTts ? config.glmTtsSpeed : grokTts ? config.grokTtsSpeed : config.audioSpeed}
                                    onChange={(event) => updateConfig(glmTts ? "glmTtsSpeed" : grokTts ? "grokTtsSpeed" : "audioSpeed", event.target.value)}
                                    onBlur={(event) => updateConfig(glmTts ? "glmTtsSpeed" : grokTts ? "grokTtsSpeed" : "audioSpeed", glmTts ? normalizeGlmTtsSpeed(event.target.value) : grokTts ? normalizeGrokTtsSpeed(event.target.value) : normalizeAudioSpeedValue(event.target.value))}
                                />
                            </Form.Item>
                        ) : null}
                    </div>
                    <Form.Item label={t("已有内容的节点再次生成时")} className="mb-4">
                        <Radio.Group value={config.nodeRegenerateBehavior} onChange={(event) => updateConfig("nodeRegenerateBehavior", event.target.value)} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", width: "100%", gap: 8 }}>
                            <Radio value="overwrite">
                                <span className="block text-sm font-medium">{t("覆盖当前节点")}</span>
                                <span className="mt-0.5 block text-xs opacity-60">{t("直接替换该节点的内容和参数，想保留旧结果时，先复制或切换节点模式")}</span>
                            </Radio>
                            <Radio value="new-node">
                                <span className="block text-sm font-medium">{t("新建衍生节点")}</span>
                                <span className="mt-0.5 block text-xs opacity-60">{t("保留当前节点，新建一个节点承接生成结果，适合做变体或分支")}</span>
                            </Radio>
                        </Radio.Group>
                    </Form.Item>
                    <div className="mb-4 grid gap-3 md:grid-cols-3">
                        <FeatureSwitch title={t("流式传输")} description={t("开启后请求中追加 stream，支持读取中间图片事件并避免长时间无数据。")} checked={Boolean(config.streamImages)} onChange={(checked) => updateConfig("streamImages", checked ? "1" : "")} />
                        <FeatureSwitch title={t("返回 Base64 图片数据")} description={t("开启后 Image API 请求会追加 response_format: b64_json。")} checked={Boolean(config.responseFormatB64Json)} onChange={(checked) => updateConfig("responseFormatB64Json", checked ? "1" : "")} />
                        <FeatureSwitch title={t("Codex CLI 兼容模式")} description={t("开启后减少不兼容参数，并追加防提示词改写前缀。")} checked={Boolean(config.codexCli)} onChange={(checked) => updateConfig("codexCli", checked ? "1" : "")} />
                    </div>
                    {canUseUserStorageProvider ? (
                        <>
                            <section className="mb-5 mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium">{t("用户 S3/R2 存储")}</div>
                                        <div className="mt-1 text-xs text-stone-500">
                                            
                                            {t("开启后，新生成图片和媒体文件会优先保存到你的 S3 兼容对象存储。")}
                                            {storageUsageText ? <>{t("当前容量：")}{storageUsageText}</> : null}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                        <Button size="small" loading={measuringStorageType === "s3"} onClick={() => void measureStorage(userStorage)}>
                                            
                                            {t("统计容量")}
                                        </Button>
                                        <span className="text-xs text-stone-500">{t("自动同步")}</span>
                                        <Switch size="small" checked={config.syncStorageConfig} onChange={(checked) => updateConfig("syncStorageConfig", checked)} />
                                        <Switch checked={userStorage.enabled} disabled={userWebDAVStorage.enabled} onChange={(enabled) => setUserStorage((value) => ({ ...value, enabled }))} />
                                    </div>
                                </div>
                                {userStorage.enabled ? (
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <Input value={userStorage.name} placeholder={t("配置名称")} onChange={(event) => setUserStorage((value) => ({ ...value, name: event.target.value }))} />
                                        <Input value={userStorage.endpoint} placeholder={t("Endpoint，例如 https://<account>.r2.cloudflarestorage.com")} onChange={(event) => setUserStorage((value) => ({ ...value, endpoint: event.target.value }))} />
                                        <Input value={userStorage.region} placeholder={t("Region，R2 通常为 auto")} onChange={(event) => setUserStorage((value) => ({ ...value, region: event.target.value }))} />
                                        <Input value={userStorage.bucket} placeholder={t("Bucket 名称")} onChange={(event) => setUserStorage((value) => ({ ...value, bucket: event.target.value }))} />
                                        <Input value={userStorage.accessKeyId} placeholder="Access Key ID" onChange={(event) => setUserStorage((value) => ({ ...value, accessKeyId: event.target.value }))} />
                                        <Input.Password value={userStorage.secretAccessKey} placeholder="Secret Access Key" onChange={(event) => setUserStorage((value) => ({ ...value, secretAccessKey: event.target.value }))} />
                                        <Input value={userStorage.publicBaseUrl} placeholder={t("公开访问地址，例如 https://pub-xxx.r2.dev")} onChange={(event) => setUserStorage((value) => ({ ...value, publicBaseUrl: event.target.value }))} />
                                        <Input value={userStorage.pathPrefix} placeholder={t("保存路径前缀，例如 images")} onChange={(event) => setUserStorage((value) => ({ ...value, pathPrefix: event.target.value }))} />
                                    </div>
                                ) : null}
                            </section>
                            <section className="mb-5 mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium">{t("WebDAV 存储")}</div>
                                        <div className="mt-1 text-xs text-stone-500">
                                            
                                            {t("开启后，新生成图片和媒体文件会优先保存到你的 WebDAV。")}
                                            {webDAVStorageUsageText ? <>{t("当前容量：")}{webDAVStorageUsageText}</> : null}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                        <Button size="small" loading={measuringStorageType === "webdav"} onClick={() => void measureStorage(userWebDAVStorage)}>
                                            
                                            {t("统计容量")}
                                        </Button>
                                        <span className="text-xs text-stone-500">{t("自动同步")}</span>
                                        <Switch size="small" checked={config.syncWebDAVStorageConfig} onChange={(checked) => updateConfig("syncWebDAVStorageConfig", checked)} />
                                        <Switch checked={userWebDAVStorage.enabled} disabled={userStorage.enabled} onChange={(enabled) => setUserWebDAVStorage((value) => ({ ...value, enabled }))} />
                                    </div>
                                </div>
                                {userWebDAVStorage.enabled ? (
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <Input value={userWebDAVStorage.name} placeholder={t("配置名称")} onChange={(event) => setUserWebDAVStorage((value) => ({ ...value, name: event.target.value }))} />
                                        <Input value={userWebDAVStorage.endpoint} placeholder={t("WebDAV 地址")} onChange={(event) => setUserWebDAVStorage((value) => ({ ...value, endpoint: event.target.value }))} />
                                        <Input value={userWebDAVStorage.pathPrefix} placeholder={t("远程目录")} onChange={(event) => setUserWebDAVStorage((value) => ({ ...value, pathPrefix: event.target.value }))} />
                                        <Input value={userWebDAVStorage.username} placeholder={t("用户名")} onChange={(event) => setUserWebDAVStorage((value) => ({ ...value, username: event.target.value }))} />
                                        <Input.Password value={userWebDAVStorage.password} placeholder={t("密码 / 应用密码")} onChange={(event) => setUserWebDAVStorage((value) => ({ ...value, password: event.target.value }))} />
                                    </div>
                                ) : null}
                            </section>
                        </>
                    ) : null}
                    {(!isMimoTtsModel(config.audioModel) || isMimoPresetTtsModel(config.audioModel) || isMimoVoiceCloneModel(config.audioModel)) && !glmTts && !grokTts ? (
                        <Form.Item label={t("默认音频指令")} className="mb-4">
                            <Input.TextArea rows={2} value={config.audioInstructions} placeholder={t("例如：自然、温暖、适合旁白。")} onChange={(event) => updateConfig("audioInstructions", event.target.value)} />
                        </Form.Item>
                    ) : null}
                    {effectiveMode === "local" ? (
                        <Form.Item label={t("系统提示词")} className="mb-0">
                            <Input.TextArea rows={3} value={config.systemPrompt} placeholder={t("例如：你是一位擅长电影感写实摄影的视觉导演。")} onChange={(event) => updateConfig("systemPrompt", event.target.value)} />
                        </Form.Item>
                    ) : null}
                </Form>
            </div>
            </Modal>
            {modelSelectChannel && isWorkflowProtocol(modelSelectChannel.protocol) ? (
                <Modal title={`${modelSelectChannel.name || t("工作流渠道")} · ${modelSelectChannel.protocol === "runninghub" ? "RunningHub" : "ComfyUI"} 工作流`} open width="75vw" centered onCancel={finishWorkflowChannel} footer={<Button type="primary" onClick={finishWorkflowChannel}>{t("完成")}</Button>} styles={{ body: { maxHeight: "76vh", overflowY: "auto" } }}>
                    <WorkflowChannelPane key={`${user?.id || "guest"}:${modelSelectChannel.protocol}:${modelSelectChannel.id}`} channel={modelSelectChannel as WorkflowChannelSettings} workflows={workflowEntries} token={token || ""} onChannelChange={(patch) => patchLocalChannel(modelSelectChannel.id, patch)} onBridgeDeleted={(bridgeId) => {
                        const current = useConfigStore.getState().config;
                        updateLocalChannels(normalizeLocalChannels(current).map((channel) => channel.protocol === "comfyui" && channel.bridgeId === bridgeId ? { ...channel, bridgeId: "" } : channel));
                    }} onWorkflowsChange={changePersonalWorkflows} onBeforeTest={syncPersonalWorkflows} />
                </Modal>
            ) : modelSelectChannel ? (
                <ChannelModelSelectorModal
                    key={`${user?.id || "guest"}:${modelSelectChannel.id}`}
                    channel={modelSelectChannel}
                    parameterTranslation={parameterTranslation}
                    models={modelSelectChannel.models}
                    onCancel={closeLocalModelSelector}
                    onConfirm={confirmLocalModelSelector}
                    onFetchModels={fetchLocalModelList}
                />
            ) : null}
            {setupGuideOpen ? <SetupGuide key={setupGuideKey} steps={setupSteps} onStepChange={focusGuideStep} onClose={() => setSetupGuideOpen(false)} /> : null}
        </>
    );
}

function FeatureSwitch({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <div className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-800">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{title}</div>
                <Switch checked={checked} onChange={onChange} />
            </div>
            <div className="mt-1 text-xs leading-5 text-stone-500">{description}</div>
        </div>
    );
}

function configForLocalChannel(config: AiConfig, channel: LocalModelChannel): AiConfig {
    return {
        ...config,
        channelMode: "local",
        baseUrl: channel.baseUrl,
        apiKey: channel.apiKey,
        localChannels: [{ ...channel }],
        imageChannelId: channel.id,
        videoChannelId: channel.id,
        textChannelId: channel.id,
        audioChannelId: channel.id,
        model: channel.models[0] || config.model,
    };
}

function channelIdForLocalModel(channels: LocalModelChannel[], model: string, currentId: string, capability: ModelCapability) {
    const matching = channels.filter((channel) => !model || filterChannelModelsByCapability([channel], capability).includes(model));
    return matching.find((channel) => channel.id === currentId)?.id || matching[0]?.id || "";
}

function normalizeImageCount(value: string) {
    return String(Math.max(1, Math.min(15, Math.floor(Math.abs(Number(value)) || 3))));
}


function uniqueModels(models: string[]) {
    return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
