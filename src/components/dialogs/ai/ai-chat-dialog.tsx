'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Trash2, RefreshCw, Square, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { ChatMessage } from './chat-message';
import { ImageUpload, extractImagesFromClipboard } from './image-upload';
import type { AIMessage, SSEEvent, ModelOption, ImageGenerateResponse } from '@/types/ai';

interface AIChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface AIConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
}

const DEFAULT_SYSTEM_PROMPT = `你是一个专业的AI助手，能够帮助用户解答各种问题。

请遵循以下原则：
1. 提供准确、有用的信息
2. 保持友好和专业的态度
3. 如果不确定答案，请诚实地说明
4. 根据上下文提供相关建议`;

/** 判断模型是否为图片生成模型 */
function isImageModel(modelId: string): boolean {
    return modelId.toLowerCase().includes('image');
}

/** 解析 SSE 流 */
async function* parseSSEStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal
): AsyncGenerator<SSEEvent> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // 按行分割，处理 SSE 格式
            const lines = buffer.split('\n');
            // 最后一个可能不完整，保留到下次
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const jsonStr = trimmed.slice(6); // 去掉 "data: "
                try {
                    const event = JSON.parse(jsonStr) as SSEEvent;
                    yield event;
                } catch {
                    // 忽略无法解析的行
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

export function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [input, setInput] = useState('');
    const [attachedImages, setAttachedImages] = useState<string[]>([]);
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
    const [selectedModel, setSelectedModel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [config, setConfig] = useState<AIConfig | null>(null);
    const [models, setModels] = useState<ModelOption[]>([]);
    const [isComposing, setIsComposing] = useState(false);
    const [thinkingEnabled, setThinkingEnabled] = useState(false);

    // 图片生成参数
    const [imageSize, setImageSize] = useState('1024x1024');
    const [imageQuality, setImageQuality] = useState<'standard' | 'hd' | 'medium'>('standard');

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isImageMode = isImageModel(selectedModel);

    // 滚动到底部
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

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
            setMessages([]);
            setInput('');
            setAttachedImages([]);
            setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
            setThinkingEnabled(false);
            // 取消进行中的请求
            abortControllerRef.current?.abort();
        }
    }, [open]);

    // 滚动到最新消息
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // 停止生成
    const handleStop = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsSending(false);
    }, []);

    // 发送普通聊天消息
    const handleSendChat = async (messagesToSend: AIMessage[], userMessage: AIMessage) => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesToSend,
                    systemPrompt,
                    model: selectedModel,
                    thinking: thinkingEnabled
                }),
                signal: abortController.signal
            });

            if (!res.ok) {
                const error = (await res.json()) as { error?: string };
                throw new Error(error.error || '发送失败');
            }

            if (!res.body) {
                throw new Error('没有收到响应流');
            }

            // 添加空的助手消息
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            const reader = res.body.getReader();
            let accumulatedText = '';
            let accumulatedReasoning = '';
            const accumulatedImages: string[] = [];
            let pendingUpdate = false;

            for await (const event of parseSSEStream(reader, abortController.signal)) {
                switch (event.type) {
                    case 'reasoning':
                        accumulatedReasoning += event.content || '';
                        break;
                    case 'text':
                        accumulatedText += event.content || '';
                        break;
                    case 'image':
                        if (event.content) {
                            accumulatedImages.push(event.content);
                        }
                        break;
                    case 'error':
                        toast.error(event.content || '流处理错误');
                        break;
                    case 'done':
                        break;
                }

                // 批量更新 UI
                if (!pendingUpdate) {
                    pendingUpdate = true;
                    requestAnimationFrame(() => {
                        setMessages(prev => {
                            const newMessages = [...prev];
                            newMessages[newMessages.length - 1] = {
                                role: 'assistant',
                                content: accumulatedText,
                                reasoning: accumulatedReasoning || undefined,
                                generatedImages: accumulatedImages.length > 0 ? [...accumulatedImages] : undefined
                            };
                            return newMessages;
                        });
                        pendingUpdate = false;
                    });
                }
            }

            // 确保最终内容被渲染
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: accumulatedText,
                    reasoning: accumulatedReasoning || undefined,
                    generatedImages: accumulatedImages.length > 0 ? [...accumulatedImages] : undefined
                };
                return newMessages;
            });

            if (!accumulatedText && !accumulatedReasoning && accumulatedImages.length === 0) {
                toast.error('未收到回复');
                setMessages(prev => prev.slice(0, -1));
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                // 用户主动取消，保留已接收的内容
                return;
            }
            console.error('Failed to send message:', error);
            toast.error(error instanceof Error ? error.message : '发送失败');
            // 移除空的助手消息
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && !last.content && !last.reasoning) {
                    return prev.slice(0, -1);
                }
                return prev;
            });
        }
    };

    // 发送图片生成请求
    const handleSendImageGen = async (prompt: string) => {
        // 添加空的助手消息
        setMessages(prev => [...prev, { role: 'assistant', content: '', generatedImages: [] }]);

        try {
            const res = await fetch('/api/ai/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: selectedModel,
                    size: imageSize,
                    quality: imageQuality,
                    n: 1
                }),
                signal: abortControllerRef.current?.signal
            });

            if (!res.ok) {
                const error = (await res.json()) as { error?: string };
                throw new Error(error.error || '图片生成失败');
            }

            const data = (await res.json()) as ImageGenerateResponse;

            if (data.images && data.images.length > 0) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: '',
                        generatedImages: data.images
                    };
                    return newMessages;
                });
            } else {
                toast.error('未生成图片');
                setMessages(prev => prev.slice(0, -1));
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('Image generation failed:', error);
            toast.error(error instanceof Error ? error.message : '图片生成失败');
            setMessages(prev => prev.slice(0, -1));
        }
    };

    // 发送消息（统一入口）
    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput && attachedImages.length === 0) return;

        if (!config) {
            toast.error('请先配置 AI 服务');
            return;
        }

        if (!selectedModel) {
            toast.error('请选择模型');
            return;
        }

        // 构建用户消息
        const userMessage: AIMessage = {
            role: 'user',
            content: trimmedInput
        };

        // 如果有附带图片，构建多模态消息
        if (attachedImages.length > 0) {
            userMessage.parts = [
                ...(trimmedInput ? [{ type: 'text' as const, text: trimmedInput }] : []),
                ...attachedImages.map(img => ({ type: 'image' as const, image: img }))
            ];
        }

        const allMessages = [...messages, userMessage];
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setAttachedImages([]);
        setIsSending(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            if (isImageMode) {
                await handleSendImageGen(trimmedInput);
            } else {
                await handleSendChat(allMessages, userMessage);
            }
        } finally {
            setIsSending(false);
            abortControllerRef.current = null;
        }
    };

    // 重新生成最后一条回复
    const handleRegenerate = useCallback(async () => {
        if (isSending) return;

        // 找到最后一条用户消息
        const lastAssistantIndex = messages.length - 1;
        if (lastAssistantIndex < 0 || messages[lastAssistantIndex].role !== 'assistant') return;

        // 移除最后一条 AI 回复
        const messagesWithoutLast = messages.slice(0, lastAssistantIndex);
        setMessages(messagesWithoutLast);
        setIsSending(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const lastUserMsg = messagesWithoutLast[messagesWithoutLast.length - 1];
            if (isImageMode && lastUserMsg) {
                await handleSendImageGen(lastUserMsg.content);
            } else {
                await handleSendChat(messagesWithoutLast, lastUserMsg);
            }
        } finally {
            setIsSending(false);
            abortControllerRef.current = null;
        }
    }, [messages, isSending, isImageMode, selectedModel, systemPrompt, thinkingEnabled, imageSize, imageQuality]);

    // 复制消息内容
    const handleCopy = useCallback((content: string) => {
        navigator.clipboard.writeText(content);
        toast.success('已复制到剪切板');
    }, []);

    // 删除消息（及其后的所有消息）
    const handleDeleteMessage = useCallback((index: number) => {
        setMessages(prev => prev.slice(0, index));
    }, []);

    // 清空对话
    const handleClear = () => {
        setMessages([]);
    };

    // 重置提示词
    const handleResetPrompt = () => {
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    };

    // 处理粘贴事件（支持图片粘贴）
    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const imageFiles = extractImagesFromClipboard(e);
            if (imageFiles.length > 0) {
                e.preventDefault();
                // 将文件转为 data URI
                Promise.all(
                    imageFiles.map(
                        file =>
                            new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result as string);
                                reader.onerror = () => reject(new Error('读取失败'));
                                reader.readAsDataURL(file);
                            })
                    )
                ).then(dataUris => {
                    setAttachedImages(prev => {
                        const combined = [...prev, ...dataUris];
                        return combined.slice(0, 5); // 最多 5 张
                    });
                });
            }
        },
        []
    );

    // Loading 状态
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

    // 未配置状态
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
                    <DialogTitle className='flex items-center gap-2'>
                        AI 对话
                        {isImageMode && (
                            <span className='inline-flex items-center gap-1 text-xs font-normal bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full'>
                                <ImageIcon className='h-3 w-3' />
                                图片生成模式
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>与 AI 进行实时对话</DialogDescription>
                </DialogHeader>

                <div className='flex-1 flex gap-4 overflow-hidden min-h-0'>
                    {/* 左侧对话区域 */}
                    <div className='flex-1 flex flex-col gap-3 min-h-0 overflow-hidden'>
                        {/* 消息列表 */}
                        <ScrollArea className='flex-1 min-h-0' ref={scrollAreaRef}>
                            <div className='space-y-4 min-h-full p-1'>
                                {messages.length === 0 ? (
                                    <div className='flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-2'>
                                        <span className='text-lg'>
                                            {isImageMode ? '描述你想生成的图片' : '开始与 AI 对话吧'}
                                        </span>
                                        <span className='text-xs'>
                                            {isImageMode
                                                ? '选择尺寸和质量后，输入图片描述即可生成'
                                                : '支持 Thinking 推理、图片识别、图片生成'}
                                        </span>
                                    </div>
                                ) : (
                                    messages.map((message, index) => (
                                        <ChatMessage
                                            key={index}
                                            message={message}
                                            index={index}
                                            isLast={index === messages.length - 1}
                                            isStreaming={isSending}
                                            onCopy={handleCopy}
                                            onRegenerate={handleRegenerate}
                                            onDelete={handleDeleteMessage}
                                        />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* 图片附件预览 + 上传 */}
                        {!isImageMode && (
                            <ImageUpload
                                images={attachedImages}
                                onImagesChange={setAttachedImages}
                                disabled={isSending}
                            />
                        )}

                        {/* 输入区域 */}
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                if (!isComposing) {
                                    handleSend();
                                }
                            }}
                            className='flex gap-2 items-end'
                        >
                            <Textarea
                                ref={textareaRef}
                                placeholder={isImageMode ? '描述你想生成的图片...' : '输入消息... (Shift+Enter 换行)'}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onCompositionStart={() => setIsComposing(true)}
                                onCompositionEnd={() => setIsComposing(false)}
                                onPaste={handlePaste}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                disabled={isSending}
                                className='resize-none min-h-[40px] max-h-[120px]'
                                rows={1}
                            />
                            {isSending ? (
                                <Button type='button' onClick={handleStop} variant='destructive' size='icon' className='shrink-0'>
                                    <Square className='h-4 w-4' />
                                </Button>
                            ) : (
                                <Button
                                    type='submit'
                                    disabled={!input.trim() && attachedImages.length === 0}
                                    size='icon'
                                    className='shrink-0'
                                >
                                    <Send className='h-4 w-4' />
                                </Button>
                            )}
                            <Button
                                type='button'
                                onClick={handleClear}
                                variant='outline'
                                size='icon'
                                disabled={messages.length === 0 || isSending}
                                className='shrink-0'
                            >
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </form>
                    </div>

                    {/* 右侧设置区域 */}
                    <div className='w-[300px] flex flex-col gap-4 border-l pl-4 min-h-0 overflow-y-auto'>
                        {/* 模型选择 */}
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
                                    {isLoadingModels ? (
                                        <Loader2 className='h-3 w-3 animate-spin' />
                                    ) : (
                                        <RefreshCw className='h-3 w-3' />
                                    )}
                                    <span className='ml-1 text-xs'>刷新</span>
                                </Button>
                            </div>
                            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoadingModels || isSending}>
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

                        {/* Thinking 开关（非图片模式显示） */}
                        {!isImageMode && (
                            <div className='flex items-center justify-between'>
                                <Label htmlFor='thinking' className='text-sm'>
                                    Thinking 推理
                                </Label>
                                <Switch
                                    id='thinking'
                                    checked={thinkingEnabled}
                                    onCheckedChange={setThinkingEnabled}
                                    disabled={isSending}
                                />
                            </div>
                        )}

                        {/* 图片生成参数（图片模式显示） */}
                        {isImageMode && (
                            <div className='space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50'>
                                <Label className='text-xs font-medium text-muted-foreground'>图片生成参数</Label>

                                <div className='space-y-1.5'>
                                    <Label htmlFor='imageSize' className='text-xs'>
                                        尺寸 (WIDTHxHEIGHT)
                                    </Label>
                                    <Input
                                        id='imageSize'
                                        value={imageSize}
                                        onChange={e => setImageSize(e.target.value)}
                                        placeholder='1024x1024'
                                        className='h-8 text-xs'
                                        disabled={isSending}
                                    />
                                </div>

                                <div className='space-y-1.5'>
                                    <Label htmlFor='imageQuality' className='text-xs'>
                                        质量
                                    </Label>
                                    <Select
                                        value={imageQuality}
                                        onValueChange={v => setImageQuality(v as 'standard' | 'hd' | 'medium')}
                                        disabled={isSending}
                                    >
                                        <SelectTrigger className='h-8 text-xs'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='standard'>Standard (标准)</SelectItem>
                                            <SelectItem value='hd'>HD (高清 4K)</SelectItem>
                                            <SelectItem value='medium'>Medium (中等 2K)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* 系统提示词（非图片模式显示） */}
                        {!isImageMode && (
                            <div className='space-y-2 flex-1 flex flex-col min-h-0'>
                                <div className='flex items-center justify-between'>
                                    <Label htmlFor='systemPrompt'>系统提示词</Label>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        onClick={handleResetPrompt}
                                        className='h-7 px-2'
                                    >
                                        <span className='text-xs'>重置</span>
                                    </Button>
                                </div>
                                <Textarea
                                    id='systemPrompt'
                                    placeholder='设置系统提示词...'
                                    value={systemPrompt}
                                    onChange={e => setSystemPrompt(e.target.value)}
                                    className='resize-none font-mono text-sm flex-1 min-h-0'
                                    disabled={isSending}
                                />
                            </div>
                        )}

                        <div className='text-xs text-muted-foreground space-y-1 mt-auto pt-2 border-t border-border/50'>
                            <p>Base URL: {config.baseUrl}</p>
                            <p>API Key: {config.apiKey}</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
