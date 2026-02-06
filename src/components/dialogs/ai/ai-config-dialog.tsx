'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AIModelData } from '@/types';

interface AIConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface AIConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    systemPrompt: string;
}

const DEFAULT_SYSTEM_PROMPT = `你是一个专业的 Markdown 文档格式化助手。

任务：优化并美化用户提供的 Markdown 文档格式。

严格规则：
1. 直接输出优化后的 Markdown 文本，绝对不要用代码块（\`\`\`）包裹整个输出
2. 不要在输出前后添加任何说明、解释或注释
3. 只调整格式相关内容（标题层级、列表缩进、空行、代码块格式等）
4. 保持原有内容的核心信息完全不变
5. 确保输出是干净、一致、易读的 Markdown 格式

输出要求：
- 第一个字符就是文档内容的开始
- 最后一个字符就是文档内容的结束
- 中间不包含任何非文档内容的文字`;

const DEFAULT_CONFIG: AIConfig = {
    apiKey: '',
    baseUrl: '',
    model: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT
};

export function AIConfigDialog({ open, onOpenChange }: AIConfigDialogProps) {
    const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
    const [showApiKey, setShowApiKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingConfig, setIsLoadingConfig] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [models, setModels] = useState<AIModelData[]>([]);
    const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

    // 从服务器加载配置
    const loadConfig = async () => {
        setIsLoadingConfig(true);
        try {
            const res = await fetch('/api/ai/config');
            const data = (await res.json()) as {
                apiKey: string;
                apiKeyConfigured: boolean;
                baseUrl: string;
                model: string;
                systemPrompt: string;
            };

            setConfig({
                apiKey: data.apiKey || '',
                baseUrl: data.baseUrl || DEFAULT_CONFIG.baseUrl,
                model: data.model || DEFAULT_CONFIG.model,
                systemPrompt: data.systemPrompt || DEFAULT_CONFIG.systemPrompt
            });
            setApiKeyConfigured(data.apiKeyConfigured);

            loadModels();
        } catch (error) {
            console.error('Failed to load config:', error);
        } finally {
            setIsLoadingConfig(false);
        }
    };

    // 加载模型列表
    const loadModels = async (newApiKey?: string) => {
        setIsLoadingModels(true);
        try {
            const res = await fetch('/api/ai/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: newApiKey })
            });

            const data = (await res.json()) as { models?: AIModelData[]; error?: string };

            if (res.ok && data.models) {
                setModels(data.models);
            } else {
                toast.error(data.error || '获取模型列表失败');
                setModels([]);
            }
        } catch (error) {
            toast.error('获取模型列表失败：' + (error instanceof Error ? error.message : '未知错误'));
            setModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    };

    // 打开弹窗时加载配置
    useEffect(() => {
        if (open) {
            loadConfig();
        } else {
            // 关闭时重置状态
            setModels([]);
            setShowApiKey(false);
        }
    }, [open]);

    const handleApiKeyChange = (value: string) => {
        setConfig(prev => ({ ...prev, apiKey: value }));
        // 如果用户清空了 API Key 或输入了新的，清空模型列表
        if (!value || !value.includes('...')) {
            setModels([]);
            setApiKeyConfigured(false);
        }
    };

    const handleModelChange = (value: string) => {
        setConfig(prev => ({ ...prev, model: value }));
    };

    const handleSave = async () => {
        if (!config.apiKey && !apiKeyConfigured) {
            toast.error('请填写 API Key');
            return;
        }
        if (!config.model) {
            toast.error('请选择模型');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/ai/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const data = (await res.json()) as { success?: boolean; error?: string };

            if (res.ok && data.success) {
                toast.success('AI 配置已保存');
                onOpenChange(false);
            } else {
                toast.error(data.error || '保存失败');
            }
        } catch (error) {
            toast.error('保存失败：' + (error instanceof Error ? error.message : '未知错误'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        if (!config.model) {
            toast.error('请先选择模型');
            return;
        }

        // 需要有 API Key（新输入的或已保存的）
        if (!config.apiKey && !apiKeyConfigured) {
            toast.error('请先填写 API Key');
            return;
        }

        setIsTesting(true);
        try {
            const res = await fetch('/api/ai/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: config.apiKey.includes('...') ? undefined : config.apiKey,
                    baseUrl: config.baseUrl,
                    model: config.model
                })
            });

            const data = (await res.json()) as { success?: boolean; error?: string };

            if (res.ok && data.success) {
                toast.success('连接测试成功！');
            } else {
                toast.error(data.error || '连接测试失败');
            }
        } catch (error) {
            toast.error('连接测试失败：' + (error instanceof Error ? error.message : '未知错误'));
        } finally {
            setIsTesting(false);
        }
    };

    const handleReset = () => {
        setConfig(DEFAULT_CONFIG);
        setModels([]);
        setApiKeyConfigured(false);
    };

    if (isLoadingConfig) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className='!w-[600px] !max-w-[90vw] max-h-[80vh] flex items-center justify-center'>
                    <DialogHeader className='sr-only'>
                        <DialogTitle>AI 配置</DialogTitle>
                    </DialogHeader>
                    <div className='flex flex-col items-center gap-4'>
                        <Loader2 className='h-8 w-8 animate-spin' />
                        <p className='text-muted-foreground'>加载配置中...</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='!w-[60vw] !max-w-[90vw] max-h-[80vh] !min-h-[60vh] flex flex-col'>
                <DialogHeader>
                    <DialogTitle>AI 配置</DialogTitle>
                    <DialogDescription>配置 AI 服务参数</DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto space-y-6 py-4 pr-2'>
                    <div className='space-y-2'>
                        <Label htmlFor='apiKey'>API Key</Label>
                        <div className='relative'>
                            <Input
                                id='apiKey'
                                type={showApiKey ? 'text' : 'password'}
                                placeholder={apiKeyConfigured ? '已配置，输入新值可更新' : '输入您的 API Key'}
                                value={config.apiKey}
                                onChange={e => handleApiKeyChange(e.target.value)}
                                className='pr-10'
                            />
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='absolute right-0 top-0 h-full px-3'
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                            </Button>
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='baseUrl'>Base URL</Label>
                        <Input
                            id='baseUrl'
                            type='text'
                            placeholder='输入 AI 服务的 Base URL'
                            value={config.baseUrl}
                            onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                        />
                    </div>

                    <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                            <Label htmlFor='model'>默认模型</Label>
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => loadModels()}
                                disabled={isLoadingModels}
                                className='h-7 px-2'
                            >
                                {isLoadingModels ? <Loader2 className='h-3 w-3 animate-spin' /> : <RefreshCw className='h-3 w-3' />}
                                <span className='ml-1 text-xs'>刷新列表</span>
                            </Button>
                        </div>
                        <Select value={config.model} onValueChange={handleModelChange} disabled={isLoadingModels}>
                            <SelectTrigger className='w-full'>
                                <SelectValue
                                    placeholder={isLoadingModels ? '加载中...' : models.length === 0 ? '请先刷新模型列表' : '选择模型'}
                                >
                                    {config.model || undefined}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent position='popper' className='max-h-[240px]'>
                                {/* 如果当前模型不在列表中，添加到列表顶部 */}
                                {config.model && !models.some(m => m.id === config.model) && (
                                    <SelectItem key={config.model} value={config.model}>
                                        {config.model}
                                    </SelectItem>
                                )}
                                {models.map(model => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.id}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='systemPrompt'>系统提示词</Label>
                        <Textarea
                            id='systemPrompt'
                            placeholder='你是一个专业的文档助手...'
                            value={config.systemPrompt}
                            onChange={e => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                            rows={10}
                            className='resize-none font-mono text-sm'
                        />
                        <p className='text-xs text-muted-foreground'>用于指导 AI 如何美化文档内容</p>
                    </div>
                </div>

                <DialogFooter className='flex-col sm:flex-row gap-2 pt-4 border-t'>
                    <div className='flex gap-2 w-full sm:w-auto'>
                        <Button type='button' variant='outline' onClick={handleReset} className='flex-1 sm:flex-none'>
                            重置默认
                        </Button>
                        <Button type='button' variant='outline' onClick={handleTest} disabled={isTesting} className='flex-1 sm:flex-none'>
                            {isTesting ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    测试中...
                                </>
                            ) : (
                                '测试连接'
                            )}
                        </Button>
                    </div>
                    <Button type='button' onClick={handleSave} disabled={isSaving} className='w-full sm:w-auto'>
                        {isSaving ? (
                            <>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                保存中...
                            </>
                        ) : (
                            '保存配置'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

