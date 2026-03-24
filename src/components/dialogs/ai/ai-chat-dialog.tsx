'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, generateId } from 'ai';
import type { UIMessage } from 'ai';
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

import { ChatMessage, TypingIndicator, getMessageText } from './chat-message';
import { ImageUpload, extractImagesFromClipboard } from './image-upload';
import type { ModelOption, ImageGenerateResponse } from '@/types/ai';

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

function isImageModel(modelId: string): boolean {
    return modelId.toLowerCase().includes('image');
}

export function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
    const [attachedImages, setAttachedImages] = useState<string[]>([]);
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
    const [selectedModel, setSelectedModel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [config, setConfig] = useState<AIConfig | null>(null);
    const [models, setModels] = useState<ModelOption[]>([]);
    const [isComposing, setIsComposing] = useState(false);
    const [thinkingEnabled, setThinkingEnabled] = useState(false);
    const [input, setInput] = useState('');

    const [imageSize, setImageSize] = useState('1024x1024');
    const [imageQuality, setImageQuality] = useState<'standard' | 'hd' | 'medium'>('standard');
    const [isImageGenLoading, setIsImageGenLoading] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageGenAbortRef = useRef<AbortController | null>(null);

    const isImageMode = isImageModel(selectedModel);

    const transport = useMemo(() => new DefaultChatTransport({ api: '/api/ai/chat' }), []);

    const { messages, setMessages, sendMessage, regenerate, stop, status } = useChat({
        transport,
        onError: err => toast.error(err.message)
    });

    const isSending = status === 'streaming' || status === 'submitted' || isImageGenLoading;

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

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

    useEffect(() => {
        if (open) {
            loadConfig();
        } else {
            stop();
            imageGenAbortRef.current?.abort();
            setMessages([]);
            setInput('');
            setAttachedImages([]);
            setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
            setThinkingEnabled(false);
        }
    }, [open]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleStop = useCallback(() => {
        stop();
        imageGenAbortRef.current?.abort();
        setIsImageGenLoading(false);
    }, [stop]);

    const chatBodyParams = useCallback(
        () => ({
            model: selectedModel,
            systemPrompt,
            thinking: thinkingEnabled
        }),
        [selectedModel, systemPrompt, thinkingEnabled]
    );

    const handleSendChat = useCallback(
        async (text: string, images: string[]) => {
            const fileParts = images.map(dataUri => ({
                type: 'file' as const,
                mediaType: dataUri.match(/data:([^;]+)/)?.[1] || 'image/png',
                url: dataUri
            }));

            const messagePayload = fileParts.length > 0 ? (text ? { text, files: fileParts } : { files: fileParts }) : { text };

            await sendMessage(messagePayload, { body: chatBodyParams() });
        },
        [sendMessage, chatBodyParams]
    );

    const handleSendImageGen = useCallback(
        async (prompt: string) => {
            const userMsg: UIMessage = {
                id: generateId(),
                role: 'user',
                parts: [{ type: 'text', text: prompt }]
            };
            const assistantId = generateId();
            const assistantMsg: UIMessage = {
                id: assistantId,
                role: 'assistant',
                parts: []
            };

            setMessages(prev => [...prev, userMsg, assistantMsg]);
            setIsImageGenLoading(true);

            const abortController = new AbortController();
            imageGenAbortRef.current = abortController;

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
                    signal: abortController.signal
                });

                if (!res.ok) {
                    const error = (await res.json()) as { error?: string };
                    throw new Error(error.error || '图片生成失败');
                }

                const data = (await res.json()) as ImageGenerateResponse;

                if (data.images && data.images.length > 0) {
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            id: assistantId,
                            role: 'assistant',
                            parts: data.images!.map(url => ({
                                type: 'file' as const,
                                mediaType: 'image/png',
                                url
                            }))
                        };
                        return updated;
                    });
                } else {
                    toast.error('未生成图片');
                    setMessages(prev => prev.slice(0, -2));
                }
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                console.error('Image generation failed:', error);
                toast.error(error instanceof Error ? error.message : '图片生成失败');
                setMessages(prev => prev.slice(0, -2));
            } finally {
                setIsImageGenLoading(false);
                imageGenAbortRef.current = null;
            }
        },
        [selectedModel, imageSize, imageQuality, setMessages]
    );

    const handleSend = useCallback(async () => {
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

        const currentImages = [...attachedImages];
        setInput('');
        setAttachedImages([]);

        if (isImageMode) {
            await handleSendImageGen(trimmedInput);
        } else {
            await handleSendChat(trimmedInput, currentImages);
        }
    }, [input, attachedImages, config, selectedModel, isImageMode, handleSendChat, handleSendImageGen]);

    const handleRegenerate = useCallback(async () => {
        if (isSending) return;

        if (isImageMode) {
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
            if (!lastUserMsg) return;
            const lastUserText = getMessageText(lastUserMsg);
            setMessages(prev => {
                const lastAssistantIdx = prev.length - 1;
                if (lastAssistantIdx >= 0 && prev[lastAssistantIdx].role === 'assistant') {
                    return prev.slice(0, lastAssistantIdx);
                }
                return prev;
            });
            await handleSendImageGen(lastUserText);
        } else {
            await regenerate({ body: chatBodyParams() });
        }
    }, [isSending, isImageMode, messages, setMessages, handleSendImageGen, regenerate, chatBodyParams]);

    const handleCopy = useCallback((content: string) => {
        navigator.clipboard.writeText(content);
        toast.success('已复制到剪切板');
    }, []);

    const handleDeleteMessage = useCallback(
        (index: number) => {
            setMessages(prev => prev.slice(0, index));
        },
        [setMessages]
    );

    const handleClear = useCallback(() => {
        setMessages([]);
    }, [setMessages]);

    const handleResetPrompt = () => {
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    };

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageFiles = extractImagesFromClipboard(e);
        if (imageFiles.length > 0) {
            e.preventDefault();
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
                    return combined.slice(0, 5);
                });
            });
        }
    }, []);

    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className='w-[60vw]! max-w-[90vw]! max-h-[80vh] flex items-center justify-center'>
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
                <DialogContent className='w-[60vw]! max-w-[90vw]!'>
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
            <DialogContent className='w-[80vw]! max-w-[90vw]! max-h-[80vh] min-h-[80vh]! flex flex-col'>
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
                                        <span className='text-lg'>{isImageMode ? '描述你想生成的图片' : '开始与 AI 对话吧'}</span>
                                        <span className='text-xs'>
                                            {isImageMode
                                                ? '选择尺寸和质量后，输入图片描述即可生成'
                                                : '支持 Thinking 推理、图片识别、图片生成'}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((message, index) => (
                                            <ChatMessage
                                                key={message.id}
                                                message={message}
                                                index={index}
                                                isLast={index === messages.length - 1}
                                                isStreaming={isSending}
                                                onCopy={handleCopy}
                                                onRegenerate={handleRegenerate}
                                                onDelete={handleDeleteMessage}
                                            />
                                        ))}
                                        {status === 'submitted' && <TypingIndicator />}
                                    </>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* 图片附件预览 + 上传 */}
                        {!isImageMode && <ImageUpload images={attachedImages} onImagesChange={setAttachedImages} disabled={isSending} />}

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
                                    {isLoadingModels ? <Loader2 className='h-3 w-3 animate-spin' /> : <RefreshCw className='h-3 w-3' />}
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

                        {/* Thinking 开关 */}
                        {!isImageMode && (
                            <div className='flex items-center justify-between'>
                                <Label htmlFor='thinking' className='text-sm'>
                                    Thinking 推理
                                </Label>
                                <Switch id='thinking' checked={thinkingEnabled} onCheckedChange={setThinkingEnabled} disabled={isSending} />
                            </div>
                        )}

                        {/* 图片生成参数 */}
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

                        {/* 系统提示词 */}
                        {!isImageMode && (
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

