'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { XStream } from '@janone/xstream';

import { MarkdownRenderer } from '@/components/lazy';

interface AIChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
}

interface ModelOption {
    id: string;
    name: string;
}

const DEFAULT_SYSTEM_PROMPT = `你是一个专业的AI助手，能够帮助用户解答各种问题。

请遵循以下原则：
1. 提供准确、有用的信息
2. 保持友好和专业的态度
3. 如果不确定答案，请诚实地说明
4. 根据上下文提供相关建议`;

export function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
    const [selectedModel, setSelectedModel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [config, setConfig] = useState<AIConfig | null>(null);
    const [models, setModels] = useState<ModelOption[]>([]);
    const [isComposing, setIsComposing] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 加载配置
    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/ai/config');
            const data = (await res.json()) as {
                apiKey: string;
                apiKeyConfigured: boolean;
                baseUrl: string;
                model: string;
            };

            if (res.ok && data.apiKeyConfigured) {
                setConfig({
                    apiKey: data.apiKey,
                    baseUrl: data.baseUrl,
                    model: data.model
                });
                setSelectedModel(data.model);
                // 自动加载模型列表
                loadModels();
            } else {
                toast.error('请先配置 AI 服务');
            }
        } catch (error) {
            console.error('Failed to load config:', error);
            toast.error('加载配置失败');
        } finally {
            setIsLoading(false);
        }
    };

    // 加载模型列表
    const loadModels = async () => {
        setIsLoadingModels(true);
        try {
            const res = await fetch('/api/ai/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            const data = (await res.json()) as { models?: ModelOption[]; error?: string };

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
            setMessages([]);
            setInput('');
            setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        }
    }, [open]);

    // 滚动到最新消息
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 发送消息
    const handleSend = async () => {
        if (!input.trim()) return;

        if (!config) {
            toast.error('请先配置 AI 服务');
            return;
        }

        if (!selectedModel) {
            toast.error('请选择模型');
            return;
        }

        const userMessage: Message = {
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsSending(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    systemPrompt,
                    model: selectedModel
                })
            });

            if (!res.ok) {
                const error = (await res.json()) as { error?: string };
                throw new Error(error.error || '发送失败');
            }

            let accumulated = '';
            const stream = XStream<string>(
                {
                    readableStream: res.body!,
                    transformStream: new TransformStream({
                        transform(chunk, controller) {
                            controller.enqueue(chunk);
                        }
                    })
                },
                new AbortController().signal
            );

            // 添加空的助手消息
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            // 使用 requestAnimationFrame 批量更新
            let pendingUpdate = false;
            for await (const item of stream) {
                accumulated += item;
                if (!pendingUpdate) {
                    pendingUpdate = true;
                    requestAnimationFrame(() => {
                        setMessages(prev => {
                            const newMessages = [...prev];
                            newMessages[newMessages.length - 1] = {
                                role: 'assistant',
                                content: accumulated
                            };
                            return newMessages;
                        });
                        pendingUpdate = false;
                    });
                }
            }

            // 确保最后的内容被渲染
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: accumulated
                };
                return newMessages;
            });

            if (!accumulated) {
                toast.error('未收到回复');
                // 移除空的助手消息
                setMessages(prev => prev.slice(0, -1));
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error(error instanceof Error ? error.message : '发送失败');
            // 移除空的助手消息
            setMessages(prev => prev.filter(m => m.content !== ''));
        } finally {
            setIsSending(false);
        }
    };

    // 清空对话
    const handleClear = () => {
        setMessages([]);
    };

    // 重置提示词
    const handleResetPrompt = () => {
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    };

    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className='!w-[60vw] !max-w-[90vw] max-h-[80vh] flex items-center justify-center'>
                    <DialogHeader className='sr-only'>
                        <DialogTitle>AI 对话</DialogTitle>
                    </DialogHeader>
                    <div className='flex flex-col items-center gap-4'>
                        <Loader2 className='h-8 w-8 animate-spin' />
                        <p className='text-muted-foreground'>加载配置中...</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!config) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className='!w-[60vw] !max-w-[90vw]'>
                    <DialogHeader>
                        <DialogTitle>AI 对话</DialogTitle>
                        <DialogDescription>请先配置 AI 服务</DialogDescription>
                    </DialogHeader>
                    <div className='py-6 text-center text-muted-foreground'>请先在 AI 配置中设置 API Key 和模型</div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='!w-[80vw] !max-w-[90vw] max-h-[80vh] !min-h-[80vh] flex flex-col'>
                <DialogHeader>
                    <DialogTitle>AI 对话</DialogTitle>
                    <DialogDescription>与 AI 进行实时对话</DialogDescription>
                </DialogHeader>

                <div className='flex-1 flex gap-4 overflow-hidden min-h-0'>
                    {/* 左侧对话区域 */}
                    <div className='flex-1 flex flex-col gap-4 min-h-0 overflow-hidden'>
                        {/* 消息列表 */}
                        <ScrollArea className='flex-1 min-h-0' ref={scrollAreaRef}>
                            <div className='space-y-4 min-h-full'>
                                {messages.length === 0 ? (
                                    <div className='flex items-center justify-center min-h-[400px] text-muted-foreground'>开始与 AI 对话吧</div>
                                ) : (
                                    messages.map((message, index) => (
                                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                                }`}
                                            >
                                                {message.role === 'user' ? (
                                                    <div className='text-sm whitespace-pre-wrap break-words'>{message.content}</div>
                                                ) : (
                                                    <div className='text-sm prose prose-sm dark:prose-invert max-w-none'>
                                                        <Suspense
                                                            fallback={
                                                                <div className='text-muted-foreground'>
                                                                    <Loader2 className='h-4 w-4 animate-spin inline-block' />
                                                                </div>
                                                            }
                                                        >
                                                            <MarkdownRenderer content={message.content} />
                                                        </Suspense>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* 输入区域 */}
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                if (!isComposing) {
                                    handleSend();
                                }
                            }}
                            className='flex gap-2'
                        >
                            <Input
                                placeholder='输入消息...'
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onCompositionStart={() => setIsComposing(true)}
                                onCompositionEnd={() => setIsComposing(false)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                disabled={isSending}
                            />
                            <Button type='submit' disabled={isSending || !input.trim()} size='icon'>
                                {isSending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
                            </Button>
                            <Button type='button' onClick={handleClear} variant='outline' size='icon' disabled={messages.length === 0}>
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </form>
                    </div>

                    {/* 右侧设置区域 */}
                    <div className='w-[300px] flex flex-col gap-4 border-l pl-4 min-h-0 overflow-hidden'>
                        <div className='space-y-2'>
                            <div className='flex items-center justify-between'>
                                <Label htmlFor='model'>模型</Label>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={loadModels}
                                    disabled={isLoadingModels}
                                    className='h-7 px-2'
                                >
                                    {isLoadingModels ? <Loader2 className='h-3 w-3 animate-spin' /> : <RefreshCw className='h-3 w-3' />}
                                    <span className='ml-1 text-xs'>刷新</span>
                                </Button>
                            </div>
                            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoadingModels}>
                                <SelectTrigger className='w-full'>
                                    <SelectValue placeholder={isLoadingModels ? '加载中...' : '选择模型'}>
                                        {selectedModel || undefined}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent position='popper' className='max-h-[240px]'>
                                    {selectedModel && !models.some(m => m.id === selectedModel) && (
                                        <SelectItem key={selectedModel} value={selectedModel}>
                                            {selectedModel}
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

                        <div className='space-y-2 flex-1 flex flex-col min-h-0'>
                            <div className='flex items-center justify-between'>
                                <Label htmlFor='systemPrompt'>系统提示词</Label>
                                <Button type='button' variant='ghost' size='sm' onClick={handleResetPrompt} className='h-7 px-2'>
                                    <span className='text-xs'>重置</span>
                                </Button>
                            </div>
                            <Textarea
                                id='systemPrompt'
                                placeholder='设置系统提示词...'
                                value={systemPrompt}
                                onChange={e => setSystemPrompt(e.target.value)}
                                className='resize-none font-mono text-sm flex-1 min-h-0'
                            />
                        </div>

                        <div className='text-xs text-muted-foreground space-y-1'>
                            <p>Base URL: {config.baseUrl}</p>
                            <p>API Key: {config.apiKey}</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

