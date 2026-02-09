'use client';

import { Copy, RefreshCw, Trash2, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { AIMessage } from '@/types/ai';

interface MessageActionsProps {
    message: AIMessage;
    isUser: boolean;
    isLast: boolean;
    onCopy: (content: string) => void;
    onRegenerate: () => void;
    onDelete: () => void;
}

export function MessageActions({ message, isUser, isLast, onCopy, onRegenerate, onDelete }: MessageActionsProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        const text = message.content || message.reasoning || '';
        onCopy(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [message, onCopy]);

    // 对用户消息和 AI 消息都不显示（如果没有内容）
    const hasContent = message.content || message.reasoning || (message.generatedImages && message.generatedImages.length > 0);
    if (!hasContent) return null;

    return (
        <div
            className={cn(
                'flex items-center gap-0.5 mt-1',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                isUser ? 'justify-end' : 'justify-start'
            )}
        >
            {/* 复制 */}
            <button
                type='button'
                onClick={handleCopy}
                className={cn(
                    'p-1 rounded hover:bg-foreground/10 transition-colors',
                    isUser ? 'text-primary-foreground/60 hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                title={copied ? '已复制' : '复制'}
            >
                {copied ? <Check className='h-3 w-3' /> : <Copy className='h-3 w-3' />}
            </button>

            {/* 重新生成（仅 AI 消息，且是最后一条） */}
            {!isUser && isLast && (
                <button
                    type='button'
                    onClick={onRegenerate}
                    className='p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors'
                    title='重新生成'
                >
                    <RefreshCw className='h-3 w-3' />
                </button>
            )}

            {/* 删除 */}
            <button
                type='button'
                onClick={onDelete}
                className={cn(
                    'p-1 rounded hover:bg-destructive/10 transition-colors',
                    isUser
                        ? 'text-primary-foreground/60 hover:text-destructive'
                        : 'text-muted-foreground hover:text-destructive'
                )}
                title='删除消息'
            >
                <Trash2 className='h-3 w-3' />
            </button>
        </div>
    );
}
