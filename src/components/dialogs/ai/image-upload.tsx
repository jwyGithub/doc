'use client';

import { useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploadProps {
    images: string[];
    onImagesChange: (images: string[]) => void;
    disabled?: boolean;
    maxImages?: number;
    maxSizeMB?: number;
}

/** 将文件转换为 base64 data URI */
async function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

export function ImageUpload({ images, onImagesChange, disabled = false, maxImages = 5, maxSizeMB = 10 }: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFiles = useCallback(
        async (files: FileList | File[]) => {
            const fileArray = Array.from(files);
            const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

            if (imageFiles.length === 0) {
                toast.error('请选择图片文件');
                return;
            }

            const maxSize = maxSizeMB * 1024 * 1024;
            const validFiles = imageFiles.filter(f => {
                if (f.size > maxSize) {
                    toast.error(`图片 ${f.name} 超过 ${maxSizeMB}MB 限制`);
                    return false;
                }
                return true;
            });

            const remaining = maxImages - images.length;
            if (remaining <= 0) {
                toast.error(`最多上传 ${maxImages} 张图片`);
                return;
            }

            const toProcess = validFiles.slice(0, remaining);

            try {
                const dataUris = await Promise.all(toProcess.map(f => fileToDataUri(f)));
                onImagesChange([...images, ...dataUris]);
            } catch {
                toast.error('图片处理失败');
            }
        },
        [images, onImagesChange, maxImages, maxSizeMB]
    );

    const handleFileSelect = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) {
                processFiles(e.target.files);
                // 重置 input 以便重复选择同一文件
                e.target.value = '';
            }
        },
        [processFiles]
    );

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (disabled) return;
            if (e.dataTransfer.files.length > 0) {
                processFiles(e.dataTransfer.files);
            }
        },
        [disabled, processFiles]
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleRemoveImage = useCallback(
        (index: number) => {
            onImagesChange(images.filter((_, i) => i !== index));
        },
        [images, onImagesChange]
    );

    /** 处理粘贴事件（从外部调用） */
    const handlePasteFiles = useCallback(
        (files: File[]) => {
            processFiles(files);
        },
        [processFiles]
    );

    return (
        <div onDrop={handleDrop} onDragOver={handleDragOver}>
            {/* 已上传的图片预览 */}
            {images.length > 0 && (
                <div className='flex gap-2 flex-wrap mb-2 p-2 rounded-lg bg-muted/30 border border-border/50'>
                    {images.map((img, index) => (
                        <div key={index} className='relative group'>
                            <img
                                src={img}
                                alt={`附件 ${index + 1}`}
                                className='h-16 w-16 object-cover rounded-md border border-border'
                            />
                            <button
                                type='button'
                                onClick={() => handleRemoveImage(index)}
                                className={cn(
                                    'absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full',
                                    'bg-destructive text-destructive-foreground',
                                    'flex items-center justify-center',
                                    'opacity-0 group-hover:opacity-100 transition-opacity',
                                    'hover:scale-110'
                                )}
                                disabled={disabled}
                            >
                                <X className='h-2.5 w-2.5' />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 上传按钮 */}
            <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                multiple
                className='hidden'
                onChange={handleFileSelect}
                disabled={disabled}
            />
            <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || images.length >= maxImages}
                title='上传图片'
            >
                <ImagePlus className='h-4 w-4' />
            </Button>
        </div>
    );
}

/** 从剪切板事件中提取图片文件 */
export function extractImagesFromClipboard(e: React.ClipboardEvent): File[] {
    const items = e.clipboardData?.items;
    if (!items) return [];

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) files.push(file);
        }
    }
    return files;
}
