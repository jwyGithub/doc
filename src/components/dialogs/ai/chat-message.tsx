'use client';

import { Suspense, useState } from 'react';
import { Loader2, Download, Maximize2, X, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/lazy';
import { ThinkingBlock } from './thinking-block';
import { MessageActions } from './message-actions';
import type { UIMessage } from 'ai';

interface ChatMessageProps {
    message: UIMessage;
    index: number;
    isLast: boolean;
    isStreaming: boolean;
    onCopy: (content: string) => void;
    onRegenerate: () => void;
    onDelete: (index: number) => void;
}

function ImagePreview({ src, onClose }: { src: string; onClose: () => void }) {
    return (
        <div className='fixed inset-0 z-200 flex items-center justify-center bg-black/80' onClick={onClose}>
            <button
                type='button'
                onClick={onClose}
                className='absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors'
            >
                <X className='h-5 w-5' />
            </button>
            <img src={src} alt='预览' className='max-w-[90vw] max-h-[90vh] object-contain rounded-lg' onClick={e => e.stopPropagation()} />
        </div>
    );
}

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

export function getMessageText(message: UIMessage): string {
    return message.parts
        .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
        .map(p => p.text)
        .join('');
}

export function getMessageReasoning(message: UIMessage): string {
    return message.parts
        .filter((p): p is Extract<typeof p, { type: 'reasoning' }> => p.type === 'reasoning')
        .map(p => p.text)
        .join('');
}

export function TypingIndicator() {
    return (
        <div className='flex items-start gap-3'>
            <div className='shrink-0 mt-0.5 h-7 w-7 rounded-full bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center'>
                <Bot className='h-4 w-4 text-white' />
            </div>
            <div className='rounded-2xl rounded-tl-sm bg-muted px-4 py-3'>
                <div className='flex items-center gap-1.5'>
                    <span className='h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]' />
                    <span className='h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]' />
                    <span className='h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]' />
                </div>
            </div>
        </div>
    );
}

export function ChatMessage({ message, index, isLast, isStreaming, onCopy, onRegenerate, onDelete }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isCurrentlyStreaming = isLast && isStreaming && !isUser;

    const textContent = getMessageText(message);
    const reasoningContent = getMessageReasoning(message);
    const fileParts = message.parts.filter((p): p is Extract<typeof p, { type: 'file' }> => p.type === 'file');
    const userImages = isUser ? fileParts.filter(f => f.mediaType.startsWith('image/')) : [];
    const assistantImages = !isUser ? fileParts.filter(f => f.mediaType.startsWith('image/')) : [];

    const isReasoningStreaming = isCurrentlyStreaming && message.parts.some(p => p.type === 'reasoning' && p.state === 'streaming');

    if (isUser) {
        return (
            <div className='group flex items-start justify-end gap-3'>
                <div className='flex flex-col items-end gap-1 max-w-[75%]'>
                    {/* 用户消息中的附带图片 */}
                    {userImages.length > 0 && (
                        <div className='flex gap-2 flex-wrap justify-end'>
                            {userImages.map((file, i) => (
                                <img
                                    key={i}
                                    src={file.url}
                                    alt={`附件 ${i + 1}`}
                                    className='h-20 w-20 object-cover rounded-lg border border-primary-foreground/20'
                                />
                            ))}
                        </div>
                    )}
                    <div className='rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5'>
                        <div className='text-sm whitespace-pre-wrap wrap-break-word leading-relaxed'>{textContent}</div>
                    </div>
                    <MessageActions
                        message={message}
                        isUser
                        isLast={isLast}
                        onCopy={onCopy}
                        onRegenerate={onRegenerate}
                        onDelete={() => onDelete(index)}
                    />
                </div>
                <div className='shrink-0 mt-0.5 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center'>
                    <User className='h-4 w-4 text-primary' />
                </div>
            </div>
        );
    }

    return (
        <div className='group flex items-start gap-3'>
            <div className='shrink-0 mt-0.5 h-7 w-7 rounded-full bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center'>
                <Bot className='h-4 w-4 text-white' />
            </div>
            <div className='flex flex-col gap-1 max-w-[75%] min-w-0'>
                <div className='rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5'>
                    {/* Thinking 推理过程 */}
                    {reasoningContent && <ThinkingBlock content={reasoningContent} isStreaming={isReasoningStreaming} />}

                    {/* AI 文本回复 */}
                    {textContent && (
                        <div className='text-sm prose dark:prose-invert max-w-none leading-relaxed'>
                            <Suspense
                                fallback={
                                    <div className='text-muted-foreground'>
                                        <Loader2 className='h-4 w-4 animate-spin inline-block' />
                                    </div>
                                }
                            >
                                <MarkdownRenderer content={textContent} />
                            </Suspense>
                        </div>
                    )}

                    {/* 生成的图片 */}
                    {assistantImages.length > 0 && (
                        <div className='flex flex-col gap-2 mt-2'>
                            {assistantImages.map((file, i) => (
                                <GeneratedImageCard key={i} src={file.url} />
                            ))}
                        </div>
                    )}

                    {/* 流式加载中显示光标 */}
                    {isCurrentlyStreaming && !textContent && !reasoningContent && (
                        <div className='flex items-center gap-1.5'>
                            <span className='h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]' />
                            <span className='h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]' />
                            <span className='h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]' />
                        </div>
                    )}
                </div>

                {/* 消息操作按钮 */}
                {!isCurrentlyStreaming && (
                    <MessageActions
                        message={message}
                        isUser={false}
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

