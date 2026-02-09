'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingBlockProps {
    content: string;
    isStreaming?: boolean;
}

export function ThinkingBlock({ content, isStreaming = false }: ThinkingBlockProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!content) return null;

    return (
        <div className='mb-2 rounded-lg border border-border/60 bg-muted/30 overflow-hidden'>
            <button
                type='button'
                onClick={() => setIsExpanded(prev => !prev)}
                className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-xs font-medium',
                    'text-muted-foreground hover:text-foreground transition-colors',
                    'hover:bg-muted/50'
                )}
            >
                <Brain className='h-3.5 w-3.5 text-violet-500 dark:text-violet-400' />
                <span className='text-violet-600 dark:text-violet-400'>
                    {isStreaming ? '思考中...' : '思考过程'}
                </span>
                {isStreaming && (
                    <span className='flex gap-0.5 ml-1'>
                        <span className='w-1 h-1 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]' />
                        <span className='w-1 h-1 rounded-full bg-violet-500 animate-bounce [animation-delay:150ms]' />
                        <span className='w-1 h-1 rounded-full bg-violet-500 animate-bounce [animation-delay:300ms]' />
                    </span>
                )}
                <span className='ml-auto'>
                    {isExpanded ? <ChevronDown className='h-3.5 w-3.5' /> : <ChevronRight className='h-3.5 w-3.5' />}
                </span>
            </button>
            {isExpanded && (
                <div className='px-3 pb-3 pt-1'>
                    <div
                        className={cn(
                            'text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words',
                            'max-h-[300px] overflow-y-auto',
                            'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'
                        )}
                    >
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
}
