'use client';

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { XStream } from '@janone/xstream';

// 延迟加载 Markdown 渲染器
const MarkdownRenderer = lazy(() => import('./markdown-renderer').then(mod => ({ default: mod.MarkdownRenderer })));

interface AIBeautifyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    content: string;
    onReplace: (newContent: string) => void;
}

export function AIBeautifyDialog({ open, onOpenChange, content, onReplace }: AIBeautifyDialogProps) {
    const [beautifiedContent, setBeautifiedContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastScrollTime = useRef(0);

    // 流式渲染时自动滚动到底部（节流优化）
    useEffect(() => {
        if (isLoading && beautifiedContent && scrollEndRef.current) {
            const now = Date.now();
            // 每 200ms 最多滚动一次
            if (now - lastScrollTime.current > 200) {
                lastScrollTime.current = now;
                scrollEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [beautifiedContent, isLoading]);

    const handleBeautify = useCallback(async () => {
        if (!content.trim()) {
            toast.error('文档内容为空，无法美化');
            return;
        }

        // 如果有正在进行的请求，先中断
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setBeautifiedContent('');

        try {
            const response = await fetch('/api/ai/beautify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
                signal: controller.signal
            });

            if (!response.ok) {
                const error = (await response.json()) as { error?: string };
                throw new Error(error.error || '美化请求失败');
            }

            let accumulated = '';
            const stream = XStream<string>(
                {
                    readableStream: response.body!,
                    transformStream: new TransformStream({
                        transform(chunk, controller) {
                            controller.enqueue(chunk);
                        }
                    })
                },
                controller.signal
            );

            // 使用 requestAnimationFrame 批量更新，减少渲染次数
            let pendingUpdate = false;
            for await (const item of stream) {
                accumulated += item;
                if (!pendingUpdate) {
                    pendingUpdate = true;
                    requestAnimationFrame(() => {
                        setBeautifiedContent(accumulated);
                        pendingUpdate = false;
                    });
                }
            }
            // 确保最后的内容被渲染
            setBeautifiedContent(accumulated);

            if (!accumulated) {
                toast.error('未收到美化结果');
            }
        } catch (error) {
            // 忽略用户主动中断的错误
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            const message = error instanceof Error ? error.message : '美化失败';
            toast.error(message);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [content]);

    const handleReplace = () => {
        if (beautifiedContent) {
            onReplace(beautifiedContent);
            toast.success('内容已替换');
            onOpenChange(false);
        }
    };

    const handleCopy = async () => {
        if (beautifiedContent) {
            await navigator.clipboard.writeText(beautifiedContent);
            setCopied(true);
            toast.success('已复制到剪贴板');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        // 中断正在进行的请求和流传输
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
        setBeautifiedContent('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className='!w-[80vw] !max-w-[80vw] h-[80vh] max-h-[80vh] flex flex-col overflow-hidden'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <Sparkles className='h-5 w-5' />
                        AI 文档美化
                    </DialogTitle>
                    <DialogDescription>使用 AI 优化文档结构和格式，使其更加清晰易读</DialogDescription>
                </DialogHeader>

                <div className='flex-1 min-h-0 flex flex-col gap-4'>
                    {!beautifiedContent && !isLoading && (
                        <div className='flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground'>
                            <Sparkles className='h-12 w-12 mb-4 opacity-50' />
                            <p className='text-lg mb-2'>点击下方按钮开始美化</p>
                            <p className='text-sm'>AI 将优化文档结构、格式和表达</p>
                        </div>
                    )}

                    {isLoading && !beautifiedContent && (
                        <div className='flex-1 flex flex-col items-center justify-center py-12'>
                            <Loader2 className='h-8 w-8 animate-spin text-primary mb-4' />
                            <p className='text-muted-foreground'>正在美化文档...</p>
                        </div>
                    )}

                    {beautifiedContent && (
                        <ScrollArea className='flex-1 border rounded-md overflow-auto'>
                            <div className='p-4'>
                                <Suspense fallback={<div className='text-muted-foreground text-center py-4'><Loader2 className='h-6 w-6 animate-spin mx-auto' /></div>}>
                                    <MarkdownRenderer content={beautifiedContent} />
                                </Suspense>
                                {isLoading && (
                                    <div className='flex items-center gap-2 mt-4 text-muted-foreground'>
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                        <span className='text-sm'>正在生成...</span>
                                    </div>
                                )}
                                <div ref={scrollEndRef} />
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter className='flex-shrink-0 flex-col sm:flex-row gap-2'>
                    {!beautifiedContent ? (
                        <Button onClick={handleBeautify} disabled={isLoading} className='w-full sm:w-auto'>
                            {isLoading ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    美化中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className='mr-2 h-4 w-4' />
                                    开始美化
                                </>
                            )}
                        </Button>
                    ) : (
                        <>
                            <div className='flex gap-2 w-full sm:w-auto'>
                                <Button variant='outline' onClick={handleBeautify} disabled={isLoading} className='flex-1 sm:flex-none'>
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                    重新生成
                                </Button>
                                <Button variant='outline' onClick={handleCopy} className='flex-1 sm:flex-none'>
                                    {copied ? (
                                        <>
                                            <Check className='mr-2 h-4 w-4' />
                                            已复制
                                        </>
                                    ) : (
                                        <>
                                            <Copy className='mr-2 h-4 w-4' />
                                            复制
                                        </>
                                    )}
                                </Button>
                            </div>
                            <Button onClick={handleReplace} className='w-full sm:w-auto'>
                                替换原内容
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

