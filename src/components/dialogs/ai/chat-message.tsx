'use client';

import { Suspense, useState } from 'react';
import { Loader2, Download, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/lazy';
import { ThinkingBlock } from './thinking-block';
import { MessageActions } from './message-actions';
import type { AIMessage } from '@/types/ai';

interface ChatMessageProps {
    message: AIMessage;
    index: number;
    isLast: boolean;
    isStreaming: boolean;
    onCopy: (content: string) => void;
    onRegenerate: () => void;
    onDelete: (index: number) => void;
}

/** 图片预览弹窗 */
function ImagePreview({ src, onClose }: { src: string; onClose: () => void }) {
    return (
        <div className='fixed inset-0 z-[200] flex items-center justify-center bg-black/80' onClick={onClose}>
            <button
                type='button'
                onClick={onClose}
                className='absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors'
            >
                <X className='h-5 w-5' />
            </button>
            <img
                src={src}
                alt='预览'
                className='max-w-[90vw] max-h-[90vh] object-contain rounded-lg'
                onClick={e => e.stopPropagation()}
            />
        </div>
    );
}

/** 生成的图片卡片 */
function GeneratedImageCard({ src }: { src: string }) {
    const [preview, setPreview] = useState(false);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = src;
        link.download = `ai-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className='relative group rounded-lg overflow-hidden border border-border inline-block'>
                <img src={src} alt='AI 生成图片' className='max-w-[400px] max-h-[400px] object-contain' />
                <div
                    className={cn(
                        'absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors',
                        'flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100'
                    )}
                >
                    <button
                        type='button'
                        onClick={() => setPreview(true)}
                        className='p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors'
                        title='放大查看'
                    >
                        <Maximize2 className='h-4 w-4' />
                    </button>
                    <button
                        type='button'
                        onClick={handleDownload}
                        className='p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors'
                        title='下载图片'
                    >
                        <Download className='h-4 w-4' />
                    </button>
                </div>
            </div>
            {preview && <ImagePreview src={src} onClose={() => setPreview(false)} />}
        </>
    );
}

export function ChatMessage({ message, index, isLast, isStreaming, onCopy, onRegenerate, onDelete }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isCurrentlyStreaming = isLast && isStreaming && !isUser;

    return (
        <div className={cn('group flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'relative max-w-[80%] rounded-lg px-4 py-2',
                    isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
            >
                {/* 用户消息中的附带图片 */}
                {isUser && message.parts && message.parts.some(p => p.type === 'image') && (
                    <div className='flex gap-2 flex-wrap mb-2'>
                        {message.parts
                            .filter(p => p.type === 'image')
                            .map((p, i) => (
                                <img
                                    key={i}
                                    src={p.type === 'image' ? p.image : ''}
                                    alt={`附件 ${i + 1}`}
                                    className='h-20 w-20 object-cover rounded-md border border-primary-foreground/20'
                                />
                            ))}
                    </div>
                )}

                {/* 用户文本消息 */}
                {isUser && <div className='text-sm whitespace-pre-wrap break-words'>{message.content}</div>}

                {/* AI 消息 */}
                {!isUser && (
                    <>
                        {/* Thinking 推理过程 */}
                        {message.reasoning && (
                            <ThinkingBlock content={message.reasoning} isStreaming={isCurrentlyStreaming && !message.content} />
                        )}

                        {/* AI 文本回复 */}
                        {message.content && (
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

                        {/* 生成的图片 */}
                        {message.generatedImages && message.generatedImages.length > 0 && (
                            <div className='flex flex-col gap-2 mt-2'>
                                {message.generatedImages.map((img, i) => (
                                    <GeneratedImageCard key={i} src={img} />
                                ))}
                            </div>
                        )}

                        {/* 流式加载中显示光标 */}
                        {isCurrentlyStreaming && !message.content && !message.reasoning && (
                            <div className='flex items-center gap-1 text-muted-foreground py-1'>
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                <span className='text-xs'>正在回复...</span>
                            </div>
                        )}
                    </>
                )}

                {/* 消息操作按钮 */}
                {!isCurrentlyStreaming && (
                    <MessageActions
                        message={message}
                        isUser={isUser}
                        isLast={isLast}
                        onCopy={onCopy}
                        onRegenerate={onRegenerate}
                        onDelete={() => onDelete(index)}
                    />
                )}
            </div>
        </div>
    );
}
