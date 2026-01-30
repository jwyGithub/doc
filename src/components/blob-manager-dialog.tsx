'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trash2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface BlobManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface BlobFile {
    url: string;
    pathname: string;
    size: number;
    uploadedAt: Date;
}

interface BlobsResponse {
    success?: boolean;
    blobs?: BlobFile[];
    cursor?: string;
    hasMore?: boolean;
    error?: string;
}

interface DeleteResponse {
    success?: boolean;
    deleted?: number;
    error?: string;
}

export function BlobManagerDialog({ open, onOpenChange }: BlobManagerDialogProps) {
    const [blobs, setBlobs] = useState<BlobFile[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // 加载 blob 列表
    const loadBlobs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/blobs');
            const data = (await res.json()) as BlobsResponse;

            if (res.ok && data.success && data.blobs) {
                setBlobs(data.blobs);
            } else {
                toast.error(data.error || '加载失败');
            }
        } catch (error) {
            console.error('Failed to load blobs:', error);
            toast.error('加载失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 打开弹窗时加载列表
    useEffect(() => {
        if (open) {
            loadBlobs();
            setSelectedUrls(new Set());
        }
    }, [open, loadBlobs]);

    // 切换选择
    const toggleSelect = (url: string) => {
        const newSelected = new Set(selectedUrls);
        if (newSelected.has(url)) {
            newSelected.delete(url);
        } else {
            newSelected.add(url);
        }
        setSelectedUrls(newSelected);
    };

    // 全选/取消全选
    const toggleSelectAll = () => {
        if (selectedUrls.size === blobs.length) {
            setSelectedUrls(new Set());
        } else {
            setSelectedUrls(new Set(blobs.map(b => b.url)));
        }
    };

    // 删除选中的文件
    const handleDelete = async () => {
        if (selectedUrls.size === 0) {
            toast.error('请选择要删除的文件');
            return;
        }

        if (!confirm(`确定要删除 ${selectedUrls.size} 个文件吗？此操作不可恢复。`)) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch('/api/blobs', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: Array.from(selectedUrls) })
            });

            const data = (await res.json()) as DeleteResponse;

            if (res.ok && data.success) {
                toast.success(`成功删除 ${data.deleted} 个文件`);
                setSelectedUrls(new Set());
                loadBlobs();
            } else {
                toast.error(data.error || '删除失败');
            }
        } catch (error) {
            console.error('Failed to delete blobs:', error);
            toast.error('删除失败');
        } finally {
            setIsDeleting(false);
        }
    };

    // 格式化文件大小
    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    // 格式化日期
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='!w-[60vw] !max-w-[90vw] max-h-[80vh] !min-h-[60vh] flex flex-col'>
                <DialogHeader>
                    <DialogTitle>Blob 管理</DialogTitle>
                    <DialogDescription>管理已上传的图片文件</DialogDescription>
                </DialogHeader>

                <div className='flex-1 flex flex-col gap-4 overflow-hidden'>
                    {/* 操作栏 */}
                    <div className='flex items-center justify-between gap-2 pb-2 border-b'>
                        <div className='flex items-center gap-2'>
                            <Checkbox
                                checked={blobs.length > 0 && selectedUrls.size === blobs.length}
                                onCheckedChange={toggleSelectAll}
                                disabled={isLoading || blobs.length === 0}
                            />
                            <span className='text-sm text-muted-foreground'>
                                {selectedUrls.size > 0 ? `已选择 ${selectedUrls.size} 项` : `共 ${blobs.length} 项`}
                            </span>
                        </div>
                        <div className='flex gap-2'>
                            <Button variant='outline' size='sm' onClick={loadBlobs} disabled={isLoading}>
                                {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : <RefreshCw className='h-4 w-4' />}
                                <span className='ml-2'>刷新</span>
                            </Button>
                            <Button
                                variant='destructive'
                                size='sm'
                                onClick={handleDelete}
                                disabled={selectedUrls.size === 0 || isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        删除中...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className='mr-2 h-4 w-4' />
                                        删除 ({selectedUrls.size})
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* 文件列表 */}
                    <ScrollArea className='flex-1 min-h-0'>
                        {isLoading ? (
                            <div className='flex items-center justify-center py-12'>
                                <Loader2 className='h-8 w-8 animate-spin text-primary' />
                            </div>
                        ) : blobs.length === 0 ? (
                            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                                <ImageIcon className='h-12 w-12 mb-4 opacity-50' />
                                <p>暂无上传的文件</p>
                            </div>
                        ) : (
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2'>
                                {blobs.map(blob => (
                                    <div
                                        key={blob.url}
                                        className={`relative border rounded-lg overflow-hidden transition-all cursor-pointer hover:border-primary ${
                                            selectedUrls.has(blob.url) ? 'border-primary ring-2 ring-primary' : ''
                                        }`}
                                        onClick={() => toggleSelect(blob.url)}
                                    >
                                        <div className='absolute top-2 left-2 z-10'>
                                            <Checkbox
                                                checked={selectedUrls.has(blob.url)}
                                                onCheckedChange={() => toggleSelect(blob.url)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className='aspect-video bg-muted flex items-center justify-center overflow-hidden'>
                                            <img
                                                src={blob.url}
                                                alt={blob.pathname}
                                                className='w-full h-full object-cover'
                                                loading='lazy'
                                                onError={e => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                                                        '<div class="flex items-center justify-center w-full h-full"><svg class="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                                                }}
                                            />
                                        </div>
                                        <div className='p-3 space-y-1'>
                                            <p className='text-sm font-medium truncate' title={blob.pathname}>
                                                {blob.pathname.split('/').pop()}
                                            </p>
                                            <div className='flex items-center justify-between text-xs text-muted-foreground'>
                                                <span>{formatSize(blob.size)}</span>
                                                <span>{formatDate(blob.uploadedAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant='outline' onClick={() => onOpenChange(false)}>
                        关闭
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
