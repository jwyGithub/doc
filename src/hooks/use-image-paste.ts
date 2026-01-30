import { useCallback, ClipboardEvent } from 'react';
import { toast } from 'sonner';

interface UseImagePasteOptions {
    onImageInsert: (imageUrl: string) => void;
    disabled?: boolean;
}

interface UploadResponse {
    success?: boolean;
    url?: string;
    error?: string;
}

export function useImagePaste({ onImageInsert, disabled }: UseImagePasteOptions) {
    const handlePaste = useCallback(
        async (event: ClipboardEvent<HTMLTextAreaElement>) => {
            if (disabled) return;

            const items = event.clipboardData?.items;
            if (!items) return;

            // 查找图片项
            let imageFile: File | null = null;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                    imageFile = item.getAsFile();
                    break;
                }
            }

            // 如果没有找到图片，让默认粘贴行为继续
            if (!imageFile) return;

            // 阻止默认粘贴行为（因为我们要插入图片链接）
            event.preventDefault();

            // 显示上传提示
            const uploadingToast = toast.loading('正在上传图片...');

            try {
                // 创建 FormData
                const formData = new FormData();
                formData.append('file', imageFile);

                // 上传图片
                const response = await fetch('/api/upload/image', {
                    method: 'POST',
                    body: formData
                });

                const data = (await response.json()) as UploadResponse;

                if (!response.ok || !data.success || !data.url) {
                    throw new Error(data.error || '上传失败');
                }

                // 插入图片 Markdown 语法
                const imageMarkdown = `![image](${data.url})`;
                onImageInsert(imageMarkdown);

                toast.success('图片上传成功', { id: uploadingToast });
            } catch (error) {
                console.error('Image upload failed:', error);
                const message = error instanceof Error ? error.message : '图片上传失败';
                toast.error(message, { id: uploadingToast });
            }
        },
        [onImageInsert, disabled]
    );

    return { handlePaste };
}
