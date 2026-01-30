'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TocItem, scrollToHeading } from '@/lib/toc';
import { List } from 'lucide-react';

interface TableOfContentsProps {
    items: TocItem[];
    className?: string;
}

export function TableOfContents({ items, className }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>('');
    const clickedRef = useRef(false);

    useEffect(() => {
        // 查找滚动容器
        let scrollRoot: HTMLElement | null = null;
        const firstElement = items[0] && document.getElementById(items[0].id);
        
        if (firstElement) {
            let parent = firstElement.parentElement;
            while (parent && parent !== document.body) {
                const style = window.getComputedStyle(parent);
                const overflowY = style.overflowY;
                if (overflowY === 'auto' || overflowY === 'scroll') {
                    scrollRoot = parent;
                    break;
                }
                parent = parent.parentElement;
            }
        }

        // 监听滚动，高亮当前可见的标题
        const observer = new IntersectionObserver(
            entries => {
                // 如果是点击触发的滚动，忽略 observer 更新一段时间
                if (clickedRef.current) {
                    return;
                }
                
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                root: scrollRoot, // 指定滚动容器
                rootMargin: '-80px 0px -80% 0px',
                threshold: 1.0
            }
        );

        // 观察所有标题元素
        items.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => observer.disconnect();
    }, [items]);

    const handleClick = (e: React.MouseEvent, headingId: string) => {
        e.preventDefault();
        
        // 立即设置 active 状态
        setActiveId(headingId);
        
        // 标记为点击触发，暂时禁用 observer 更新
        clickedRef.current = true;
        
        // 滚动到目标位置
        scrollToHeading(headingId);
        
        // 更新 URL hash
        window.history.pushState(null, '', `#${headingId}`);
        
        // 1 秒后恢复 observer 更新（等待滚动完成）
        setTimeout(() => {
            clickedRef.current = false;
        }, 1000);
    };

    if (items.length === 0) {
        return null;
    }

    return (
        <nav className={cn('space-y-2', className)}>
            <div className='flex items-center gap-2 px-2 text-sm font-semibold text-muted-foreground mb-4'>
                <List className='h-4 w-4' />
                <span>目录</span>
            </div>
            <ul className='space-y-1'>
                {items.map((item, index) => (
                    <li
                        key={`${item.id}-${index}`}
                        style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                        className='text-sm'
                    >
                        <a
                            href={`#${item.id}`}
                            onClick={e => handleClick(e, item.id)}
                            className={cn(
                                'block py-1.5 px-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground',
                                'border-l-2 border-transparent',
                                activeId === item.id
                                    ? 'border-primary bg-accent text-accent-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {item.text}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
