'use client';

import { Copy, RefreshCw, Trash2, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getMessageText, getMessageReasoning } from './chat-message';
import type { UIMessage } from 'ai';

interface MessageActionsProps {
    message: UIMessage;
    isUser: boolean;
    isLast: boolean;
    onCopy: (content: string) => void;
    onRegenerate: () => void;
    onDelete: () => void;
}

export function MessageActions({ message, isUser, isLast, onCopy, onRegenerate, onDelete }: MessageActionsProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        const text = getMessageText(message) || getMessageReasoning(message);
        onCopy(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [message, onCopy]);

    const hasContent = message.parts.length > 0;
    if (!hasContent) return null;

    return (
        <div
            className={cn(
                'flex items-center gap-0.5 h-6',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                isUser ? 'justify-end' : 'justify-start'
            )}
        >
            <button
                type='button'
                onClick={handleCopy}
                className='p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                title={copied ? '已复制' : '复制'}
            >
                {copied ? <Check className='h-3 w-3' /> : <Copy className='h-3 w-3' />}
            </button>

            {!isUser && isLast && (
                <button
                    type='button'
                    onClick={onRegenerate}
                    className='p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                    title='重新生成'
                >
                    <RefreshCw className='h-3 w-3' />
                </button>
            )}

            <button
                type='button'
                onClick={onDelete}
                className='p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
                title='删除消息'
            >
                <Trash2 className='h-3 w-3' />
            </button>
        </div>
    );
}
