"use client";

import { t } from "@/i18n";
import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SyncOutlined } from "@ant-design/icons";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { Button, Card, Col, Flex, Form, Image, Input, Modal, Row, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";

import { useCopyText } from "@/hooks/use-copy-text";
import type { Prompt } from "@/services/api/prompts";
import { useAdminPrompts } from "./use-admin-prompts";

export default function AdminPromptsPage() {
    const {
        categories,
        prompts,
        tags,
        keyword,
        category,
        tag,
        page,
        pageSize,
        total,
        isLoading,
        isSyncing,
        searchPrompts,
        changeCategory,
        changeTag,
        changePage,
        changePageSize,
        resetFilters,
        refreshPrompts,
        syncCategory,
        syncAllCategories,
        savePrompt: saveAdminPrompt,
        deletePrompt,
        deletePrompts,
    } = useAdminPrompts();
    const copyText = useCopyText();
    const [form] = Form.useForm<Partial<Prompt> & { tagText?: string }>();
    const [keywordText, setKeywordText] = useState(keyword);
    const [editingPrompt, setEditingPrompt] = useState<Partial<Prompt> | null>(null);
    const [detailPrompt, setDetailPrompt] = useState<Prompt | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
    const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
    const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
    const [isSyncOpen, setIsSyncOpen] = useState(false);
    const defaultCategory = categories[0]?.category || "";
    const categoryName = (category: string) => categories.find((item) => item.category === category)?.name || category;
    const categoryOptions = [{ label: t("全部分类"), value: "" }, ...categories.map((item) => ({ label: item.name, value: item.category }))];
    const tagOptions = tags.map((item) => ({ label: item, value: item }));

    useEffect(() => {
        if (editingPrompt) form.setFieldsValue({ ...editingPrompt, tagText: editingPrompt.tags?.join(", ") || "" });
    }, [editingPrompt, form]);

    useEffect(() => setKeywordText(keyword), [keyword]);

    const savePrompt = async () => {
        const value = await form.validateFields();
        await saveAdminPrompt({
            ...editingPrompt,
            ...value,
            category: value.category || defaultCategory,
            tags: (value.tagText || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
        });
        setEditingPrompt(null);
    };

    const batchDeletePrompts = async () => {
        await deletePrompts(selectedPromptIds);
        setSelectedPromptIds([]);
        setIsBatchDeleteOpen(false);
    };

    const columns: ProColumns<Prompt>[] = [
        {
            title: t("封面"),
            dataIndex: "coverUrl",
            width: 88,
            render: (_, item) => <Image src={item.coverUrl || "/logo.svg"} alt={item.title} width={56} height={42} style={{ objectFit: "cover", borderRadius: 6 }} preview={{ mask: "放大" }} fallback="/logo.svg" />,
        },
        {
            title: t("标题"),
            dataIndex: "title",
            width: 260,
            render: (_, item) => (
                <Typography.Link strong ellipsis style={{ maxWidth: 260, display: "block" }} onClick={() => setDetailPrompt(item)}>
                    {item.title}
                </Typography.Link>
            ),
        },
        {
            title: t("分类"),
            dataIndex: "category",
            width: 150,
            render: (_, item) => <Typography.Text type="secondary">{categoryName(item.category)}</Typography.Text>,
        },
        {
            title: t("标签"),
            dataIndex: "tags",
            width: 180,
            render: (_, item) => (
                <Space size={[4, 4]} wrap>
                    {(item.tags || []).slice(0, 3).map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: t("操作"),
            key: "actions",
            width: 112,
            render: (_, item) => (
                <Space size={4}>
                    <Tooltip title={t("详情")}>
                        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setDetailPrompt(item)} />
                    </Tooltip>
                    <Tooltip title={t("编辑")}>
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditingPrompt(item)} />
                    </Tooltip>
                    <Tooltip title={t("删除")}>
                        <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={() => setDeletingPrompt(item)} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <main style={{ padding: 24 }}>
            <Flex vertical gap={16}>
                <Card variant="borderless">
                    <Form layout="vertical">
                        <Row gutter={16} align="bottom">
                            <Col flex="360px">
                                <Form.Item label={t("关键词")}>
                                    <Input.Search value={keywordText} placeholder={t("搜索标题或提示词")} allowClear enterButton={<SearchOutlined />} onSearch={() => searchPrompts(keywordText)} onChange={(event) => setKeywordText(event.target.value)} />
                                </Form.Item>
                            </Col>
                            <Col flex="220px">
                                <Form.Item label={t("分组")}>
                                    <Select value={category} onChange={changeCategory} options={categoryOptions} />
                                </Form.Item>
                            </Col>
                            <Col flex="220px">
                                <Form.Item label={t("标签")}>
                                    <Select mode="multiple" allowClear maxTagCount="responsive" value={tag} onChange={changeTag} options={tagOptions} placeholder={t("全部标签")} />
                                </Form.Item>
                            </Col>
                            <Col flex="none">
                                <Form.Item>
                                    <Space>
                                        <Button
                                            onClick={() => {
                                                setKeywordText("");
                                                resetFilters();
                                            }}
                                        >
                                            
                                            {t("重置")}
                                        </Button>
                                        <Button type="primary" icon={<ReloadOutlined />} onClick={() => searchPrompts(keywordText)}>
                                            
                                            {t("查询")}
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Card>
                <ProTable<Prompt>
                    rowKey="id"
                    columns={columns}
                    dataSource={prompts}
                    loading={isLoading}
                    search={false}
                    defaultSize="middle"
                    tableLayout="fixed"
                    cardProps={{ variant: "borderless" }}
                    headerTitle={
                        <Space>
                            <Typography.Text strong>{t("提示词列表")}</Typography.Text>
                            <Tag>{total}  {t("条")}</Tag>
                        </Space>
                    }
                    options={{ density: true, setting: true, reload: () => void refreshPrompts() }}
                    rowSelection={{ selectedRowKeys: selectedPromptIds, onChange: (keys) => setSelectedPromptIds(keys.map(String)) }}
                    toolBarRender={() => [
                        <Button key="batch-delete" danger icon={<DeleteOutlined />} disabled={!selectedPromptIds.length} onClick={() => setIsBatchDeleteOpen(true)}>
                            
                            {t("批量删除")}{selectedPromptIds.length ? ` ${selectedPromptIds.length}` : ""}
                        </Button>,
                        <Button key="sync" icon={<SyncOutlined />} onClick={() => setIsSyncOpen(true)}>
                            
                            {t("同步")}
                        </Button>,
                        <Button key="sync-all" icon={<SyncOutlined />} loading={isSyncing} onClick={() => void syncAllCategories()}>
                            
                            {t("全部同步")}
                        </Button>,
                        <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setEditingPrompt({ category: defaultCategory, tags: [] })}>
                            
                            {t("新增")}
                        </Button>,
                    ]}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        showSizeChanger: true,
                        pageSizeOptions: [10, 20, 50, 100],
                        showTotal: (value) => `共 ${value} 条`,
                        onChange: (nextPage, nextPageSize) => (nextPageSize !== pageSize ? changePageSize(nextPageSize) : changePage(nextPage)),
                    }}
                />
            </Flex>

            <Modal title={editingPrompt?.id ? t("编辑提示词") : t("新增提示词")} open={Boolean(editingPrompt)} width={720} onCancel={() => setEditingPrompt(null)} onOk={() => void savePrompt()} okText={t("保存")} cancelText={t("取消")} destroyOnHidden>
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="title" label={t("标题")} rules={[{ required: true, message: t("请输入标题") }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="category" label={t("分类")}>
                        <Select options={categories.map((item) => ({ label: item.name, value: item.category }))} />
                    </Form.Item>
                    <Form.Item name="coverUrl" label={t("封面 URL")}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="tagText" label={t("标签，用逗号分隔")}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="prompt" label={t("提示词")} rules={[{ required: true, message: t("请输入提示词") }]}>
                        <Input.TextArea rows={6} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title={t("提示词详情")} open={Boolean(detailPrompt)} width={760} onCancel={() => setDetailPrompt(null)} footer={<Button onClick={() => setDetailPrompt(null)}>{t("关闭")}</Button>}>
                {detailPrompt ? (
                    <Flex vertical gap={14}>
                        <Flex gap={14} align="start">
                            <Image src={detailPrompt.coverUrl || "/logo.svg"} alt={detailPrompt.title} width={116} height={84} style={{ objectFit: "cover", borderRadius: 8 }} preview={{ mask: "放大" }} fallback="/logo.svg" />
                            <Flex vertical gap={8} style={{ minWidth: 0 }}>
                                <Typography.Title level={5} style={{ margin: 0 }}>
                                    {detailPrompt.title}
                                </Typography.Title>
                                <Space wrap>
                                    <Tag>{categoryName(detailPrompt.category)}</Tag>
                                    {(detailPrompt.tags || []).map((tag) => (
                                        <Tag key={tag}>{tag}</Tag>
                                    ))}
                                </Space>
                            </Flex>
                        </Flex>
                        {detailPrompt.preview ? (
                            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                                {detailPrompt.preview}
                            </Typography.Paragraph>
                        ) : null}
                        <Input.TextArea value={detailPrompt.prompt} rows={8} readOnly />
                        <Space>
                            <Button icon={<CopyOutlined />} onClick={() => copyText(detailPrompt.prompt)}>
                                
                                {t("复制提示词")}
                            </Button>
                        </Space>
                    </Flex>
                ) : null}
            </Modal>

            <Modal
                title={t("同步远程提示词源")}
                open={isSyncOpen}
                width={640}
                onCancel={() => !isSyncing && setIsSyncOpen(false)}
                mask={{ closable: !isSyncing }}
                footer={
                    <Button disabled={isSyncing} onClick={() => setIsSyncOpen(false)}>
                        
                        {t("取消")}
                    </Button>
                }
            >
                <Table
                    rowKey="category"
                    dataSource={categories.filter((item) => item.remote)}
                    pagination={false}
                    columns={[
                        {
                            title: t("远程源"),
                            dataIndex: "name",
                            render: (_, item) => item.name,
                        },
                        {
                            title: "",
                            key: "sync",
                            width: 96,
                            render: (_, item) => (
                                <Button
                                    type="primary"
                                    loading={isSyncing}
                                    onClick={async () => {
                                        try {
                                            await syncCategory(item.category);
                                            setIsSyncOpen(false);
                                        } catch {}
                                    }}
                                >
                                    
                                    {t("同步")}
                                </Button>
                            ),
                        },
                    ]}
                />
            </Modal>

            <Modal
                title={t("删除提示词")}
                open={Boolean(deletingPrompt)}
                onCancel={() => setDeletingPrompt(null)}
                onOk={async () => {
                    if (!deletingPrompt) return;
                    await deletePrompt(deletingPrompt.id);
                    setDeletingPrompt(null);
                }}
                okText={t("删除")}
                okButtonProps={{ danger: true }}
                cancelText={t("取消")}
            >
                
                {t("确定删除「")}{deletingPrompt?.title}{t("」吗？删除后会从当前分类中删除。")}
            </Modal>

            <Modal title={t("批量删除提示词")} open={isBatchDeleteOpen} onCancel={() => setIsBatchDeleteOpen(false)} onOk={() => void batchDeletePrompts()} okText={t("删除")} okButtonProps={{ danger: true }} cancelText={t("取消")}>
                
                {t("确定删除已选中的")} {selectedPromptIds.length}  {t("条提示词吗？删除后会从当前分类中删除。")}
            </Modal>
        </main>
    );
}
