import { useMemo, useState } from "react";
import { Button, Collapse, Empty, Input, InputNumber, Select, Switch, Tag, Tooltip } from "antd";
import { ListFilter, ListPlus, Power, PowerOff } from "lucide-react";

import type { WorkflowFieldMapping } from "@/lib/workflow-channel";
import { workflowFieldChoiceValues, workflowFieldConfigurationError, workflowFieldNumberBounds, workflowFieldPresetOptions, workflowOptionText, workflowOptionValue } from "@/lib/workflow-field-options";

import { t } from "@/i18n";
const sourceOptions = [
    { get label() { return t("保留工作流默认值"); }, value: "" },
    { get label() { return t("任务提示词"); }, value: "prompt" },
    { get label() { return t("系统提示词"); }, value: "systemPrompt" },
    { get label() { return t("参考图片"); }, value: "referenceImage" },
    { get label() { return t("参考视频"); }, value: "referenceVideo" },
    { get label() { return t("参考音频"); }, value: "referenceAudio" },
    { get label() { return t("蒙版"); }, value: "mask" },
    { get label() { return t("画面尺寸"); }, value: "size" },
    { get label() { return t("画面宽高比"); }, value: "aspectRatio" },
    { get label() { return t("画面宽度"); }, value: "width" },
    { get label() { return t("画面高度"); }, value: "height" },
    { get label() { return t("生成数量"); }, value: "count" },
    { get label() { return t("生成质量"); }, value: "quality" },
    { get label() { return t("透明背景"); }, value: "transparentBackground" },
    { get label() { return t("视频时长"); }, value: "videoSeconds" },
    { get label() { return t("视频质量"); }, value: "vquality" },
    { get label() { return t("视频生成音频"); }, value: "videoGenerateAudio" },
    { get label() { return t("视频水印"); }, value: "videoWatermark" },
    { get label() { return t("音色"); }, value: "audioVoice" },
    { get label() { return t("音频格式"); }, value: "audioFormat" },
    { get label() { return t("音频语速"); }, value: "audioSpeed" },
    { get label() { return t("音频指令"); }, value: "audioInstructions" },
] as const;

const fieldTypeOptions = [
    { get label() { return t("文本"); }, value: "TEXT" },
    { get label() { return t("数字"); }, value: "NUMBER" },
    { get label() { return t("滑块"); }, value: "SLIDER" },
    { get label() { return t("开关"); }, value: "BOOLEAN" },
    { get label() { return t("下拉"); }, value: "SELECT" },
    { get label() { return t("图片"); }, value: "IMAGE" },
    { get label() { return t("视频"); }, value: "VIDEO" },
    { get label() { return t("音频"); }, value: "AUDIO" },
] as const;

type WorkflowFieldMappingEditorProps = {
    fields: WorkflowFieldMapping[];
    onChange: (fields: WorkflowFieldMapping[]) => void;
    disabled?: boolean;
};

export function WorkflowFieldMappingEditor({ fields, onChange, disabled = false }: WorkflowFieldMappingEditorProps) {
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
    const enabledCount = useMemo(() => fields.filter((field) => field.enabled !== false).length, [fields]);
    const controllableFields = useMemo(() => fields.filter((field) => field.safeToOverride !== false), [fields]);
    const enabledControllableCount = useMemo(() => controllableFields.filter((field) => field.enabled !== false).length, [controllableFields]);
    const visibleFields = useMemo(() => fields.flatMap((field, index) => (showOnlyEnabled && field.enabled === false ? [] : [{ field, index }])), [fields, showOnlyEnabled]);
    const updateField = (index: number, patch: Partial<WorkflowFieldMapping>) => {
        onChange(fields.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field)));
    };
    const updateAllFields = (enabled: boolean) => {
        onChange(fields.map((field) => (field.safeToOverride === false ? field : { ...field, enabled })));
    };

    if (!fields.length) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("尚未发现可配置字段，请先拉取工作流参数")} />;
    }

    return (
        <div className="workflow-field-mapping-editor space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-foreground/60">
                    
                    {t("共")} {fields.length}  {t("个字段，已开启")} {enabledCount}  {t("个。字段调整会立即保存到当前工作流。")}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                    <Button type="text" size="small" icon={<Power className="size-3.5" />} disabled={disabled || enabledControllableCount === controllableFields.length} onClick={() => updateAllFields(true)}>
                        
                        {t("开启全部")}
                    </Button>
                    <Button type="text" size="small" danger icon={<PowerOff className="size-3.5" />} disabled={disabled || enabledControllableCount === 0} onClick={() => updateAllFields(false)}>
                        
                        {t("关闭全部")}
                    </Button>
                    <Button type={showOnlyEnabled ? "default" : "text"} size="small" icon={<ListFilter className="size-3.5" />} aria-pressed={showOnlyEnabled} onClick={() => setShowOnlyEnabled((current) => !current)}>
                        {showOnlyEnabled ? t("显示全部") : t("仅显示已开启")}
                    </Button>
                </div>
            </div>
            <Collapse
                size="small"
                items={visibleFields.map(({ field, index }) => {
                    const source = String(field.source || "");
                    const sourceLabel = sourceOptions.find((item) => item.value === source)?.label || source || t("保留工作流默认值");
                    const enabled = field.enabled !== false;
                    const fieldType = workflowEditorFieldType(field);
                    const numeric = fieldType === "NUMBER" || fieldType === "SLIDER";
                    const choices = workflowFieldChoiceValues(field);
                    const presetOptions = workflowFieldPresetOptions(field);
                    const safeToOverride = field.safeToOverride !== false;
                    const fieldDisabled = disabled || !enabled || !safeToOverride;
                    const configurationError = workflowFieldConfigurationError(field);
                    const roleLabel = field.role === "prompt" ? t("提示词") : field.role === "media" ? t("素材") : field.role === "internal" ? t("内部参数") : t("业务参数");
                    return {
                        key: field.id || `${field.nodeId}::${field.fieldName}::${index}`,
                        label: (
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-medium">{field.label || field.fieldName}</span>
                                <Tooltip title={`${field.nodeId}.${field.fieldName}`}>
                                    <span className="truncate text-xs text-foreground/50">
                                        {field.nodeId}.{field.fieldName}
                                    </span>
                                </Tooltip>
                                <Tag className="ml-auto shrink-0">{sourceLabel}</Tag>
                                <Tag color={safeToOverride ? undefined : "error"} className="shrink-0">
                                    {safeToOverride ? roleLabel : t("禁止覆盖")}
                                </Tag>
                            </div>
                        ),
                        extra: (
                            <span onClick={(event) => event.stopPropagation()}>
                                <Switch size="small" checked={enabled} disabled={disabled || !safeToOverride} aria-label={`启用字段 ${field.label || field.fieldName}`} onChange={(checked) => updateField(index, { enabled: checked })} />
                            </span>
                        ),
                        children: (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                <label className="grid gap-1 text-xs text-foreground/60">
                                    
                                    {t("显示名称")}
                                    <Input value={field.label || ""} disabled={fieldDisabled} placeholder={field.fieldName} onChange={(event) => updateField(index, { label: event.target.value })} />
                                </label>
                                <label className="grid gap-1 text-xs text-foreground/60">
                                    
                                    {t("参数类型")}
                                    <Select value={fieldType} disabled={fieldDisabled} options={fieldTypeOptions.map((item) => ({ ...item }))} onChange={(value) => updateField(index, { fieldType: value })} />
                                </label>
                                <label className="grid gap-1 text-xs text-foreground/60">
                                    
                                    {t("输入来源")}
                                    <Select showSearch value={source} disabled={fieldDisabled} options={sourceOptions.map((item) => ({ ...item }))} optionFilterProp="label" onChange={(value) => updateField(index, sourcePatch(field, value))} />
                                </label>
                                {fieldType === "SELECT" || choices.length || presetOptions.length ? (
                                    <label className="grid gap-1 text-xs text-foreground/60 md:col-span-2 lg:col-span-3">
                                        <span className="flex items-center justify-between gap-2">
                                            <span>{t("下拉选项（每行一个）")}</span>
                                            {presetOptions.length ? (
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<ListPlus className="size-3.5" />}
                                                    disabled={fieldDisabled}
                                                    onClick={() => updateField(index, { fieldType: "SELECT", options: presetOptions, optionsSource: "preset" })}
                                                >
                                                    
                                                    {t("常用模板")}
                                                </Button>
                                            ) : null}
                                        </span>
                                        <Input.TextArea
                                            autoSize={{ minRows: 2, maxRows: 6 }}
                                            value={choices.map(workflowOptionText).join("\n")}
                                            disabled={fieldDisabled}
                                            placeholder={"1:1\n16:9\n9:16"}
                                            onChange={(event) => updateField(index, { options: parseWorkflowOptions(event.target.value), optionsSource: "manual" })}
                                        />
                                    </label>
                                ) : null}
                                {numeric ? (
                                    <>
                                        <label className="grid gap-1 text-xs text-foreground/60">
                                            
                                            {t("最小值")}
                                            <InputNumber className="w-full" value={numberOrUndefined(field.min)} max={numberOrUndefined(field.max)} disabled={fieldDisabled} onChange={(value) => updateField(index, { min: value ?? undefined })} />
                                        </label>
                                        <label className="grid gap-1 text-xs text-foreground/60">
                                            
                                            {t("最大值")}
                                            <InputNumber className="w-full" value={numberOrUndefined(field.max)} min={numberOrUndefined(field.min)} disabled={fieldDisabled} onChange={(value) => updateField(index, { max: value ?? undefined })} />
                                        </label>
                                        <label className="grid gap-1 text-xs text-foreground/60">
                                            
                                            {t("步长")}
                                            <InputNumber className="w-full" min={0.000001} value={numberOrUndefined(field.step)} disabled={fieldDisabled} onChange={(value) => updateField(index, { step: value ?? undefined })} />
                                        </label>
                                        {configurationError ? <div className="text-xs text-error md:col-span-2 lg:col-span-3">{configurationError}</div> : null}
                                    </>
                                ) : null}
                                {sourceUsesIndex(source) ? (
                                    <label className="grid gap-1 text-xs text-foreground/60">
                                        {source === "referenceImage" ? t("图片槽位") : source === "referenceVideo" ? t("视频槽位") : t("音频槽位")}
                                        <InputNumber
                                            className="w-full"
                                            min={1}
                                            precision={0}
                                            value={source === "referenceImage" ? Math.max(1, Number(field.imageOrder) || 1) : Math.max(1, (Number(field.sourceIndex) || 0) + 1)}
                                            disabled={fieldDisabled}
                                            onChange={(value) => updateField(index, source === "referenceImage" ? { imageOrder: Number(value) || 1 } : { sourceIndex: Math.max(0, (Number(value) || 1) - 1) })}
                                        />
                                    </label>
                                ) : null}
                                <label className="flex items-center justify-between gap-3 text-xs text-foreground/60">
                                    
                                    {t("缺失时阻止生成")}
                                    <Switch checked={field.required === true} disabled={fieldDisabled || !source} onChange={(required) => updateField(index, { required })} />
                                </label>
                                {fieldType === "NUMBER" ? (
                                    <label className="flex items-center justify-between gap-3 text-xs text-foreground/60">
                                        
                                        {t("每次随机数字")}
                                        <Switch checked={field.randomEnabled === true} disabled={fieldDisabled || Boolean(source)} onChange={(randomEnabled) => updateField(index, { randomEnabled })} />
                                    </label>
                                ) : null}
                                {!source ? (
                                    <label className="grid gap-1 text-xs text-foreground/60 md:col-span-2 lg:col-span-3">
                                        
                                        {t("工作流默认值")}
                                        <DefaultValueInput field={field} disabled={fieldDisabled || field.randomEnabled === true} onChange={(fieldValue) => updateField(index, { fieldValue })} />
                                    </label>
                                ) : null}
                            </div>
                        ),
                    };
                })}
            />
            {showOnlyEnabled && !visibleFields.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("暂无已开启字段")} /> : null}
        </div>
    );
}

function DefaultValueInput({ field, disabled, onChange }: { field: WorkflowFieldMapping; disabled: boolean; onChange: (value: unknown) => void }) {
    const fieldType = String(field.fieldType || "").toUpperCase();
    const value = field.fieldValue ?? field.value ?? field.default;
    const bounds = workflowFieldNumberBounds(field);
    const choices = workflowFieldChoiceValues(field);
    if (fieldType === "BOOLEAN" || typeof value === "boolean") {
        return (
            <Select
                value={Boolean(value)}
                disabled={disabled}
                options={[
                    { label: "true", value: true },
                    { label: "false", value: false },
                ]}
                onChange={onChange}
            />
        );
    }
    if (choices.length) {
        return <Select showSearch value={value} disabled={disabled} options={choices.map((option) => ({ label: workflowOptionText(option), value: workflowOptionValue(option) }))} onChange={onChange} />;
    }
    if (fieldType === "NUMBER" || typeof value === "number" || bounds.min !== undefined || bounds.max !== undefined || bounds.step !== undefined) {
        return <InputNumber className="w-full" value={numberOrUndefined(value)} disabled={disabled} min={bounds.min} max={bounds.max} step={bounds.step} onChange={onChange} />;
    }
    return <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} value={displayValue(value)} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
}

function sourcePatch(field: WorkflowFieldMapping, source: string): Partial<WorkflowFieldMapping> {
    if (source === "referenceImage") return { source, bindPrompt: false, sourceAutomatic: false, imageOrder: Math.max(1, Number(field.imageOrder) || 1), sourceIndex: undefined };
    if (source === "referenceVideo" || source === "referenceAudio") return { source, bindPrompt: false, sourceAutomatic: false, sourceIndex: Math.max(0, Number(field.sourceIndex) || 0), imageOrder: undefined };
    return { source, bindPrompt: false, sourceAutomatic: false, sourceIndex: undefined, imageOrder: undefined, required: source ? field.required : false };
}

function sourceUsesIndex(source: string) {
    return source === "referenceImage" || source === "referenceVideo" || source === "referenceAudio";
}

function workflowEditorFieldType(field: WorkflowFieldMapping) {
    const configured = String(field.fieldType || "")
        .trim()
        .toUpperCase();
    if (["FLOAT", "INT", "INTEGER"].includes(configured)) return "NUMBER";
    if (fieldTypeOptions.some((item) => item.value === configured)) return configured;
    const value = field.fieldValue ?? field.value ?? field.default;
    if (typeof value === "boolean") return "BOOLEAN";
    if (typeof value === "number") return "NUMBER";
    return "TEXT";
}

function parseWorkflowOptions(value: string) {
    return value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function numberOrUndefined(value: unknown) {
    if (value === undefined || value === null || String(value).trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function displayValue(value: unknown) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}
