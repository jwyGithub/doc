'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from './markdown-renderer';
import { XStream } from '@janone/xstream';

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

    const handleBeautify = useCallback(async () => {
        if (!content.trim()) {
            toast.error('文档内容为空，无法美化');
            return;
        }

        setIsLoading(true);
        setBeautifiedContent('');

        try {
            const response = await fetch('/api/ai/beautify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                const error = (await response.json()) as { error?: string };
                throw new Error(error.error || '美化请求失败');
            }

            let accumulated = '';
            const stream = XStream<string>({
                readableStream: response.body!,
                transformStream: new TransformStream({
                    transform(chunk, controller) {
                        controller.enqueue(chunk);
                    }
                })
            });

            for await (const item of stream) {
                accumulated += item;
            }

            if (!accumulated) {
                toast.error('未收到美化结果');
            } else {
                setBeautifiedContent(accumulated);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '美化失败';
            toast.error(message);
        } finally {
            setIsLoading(false);
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
                                <MarkdownRenderer content={beautifiedContent} />
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

