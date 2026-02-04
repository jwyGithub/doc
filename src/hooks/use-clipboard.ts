import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseClipboardOptions {
    timeout?: number;
    successMessage?: string;
    errorMessage?: string;
}

export function useClipboard(options: UseClipboardOptions = {}) {
    const { timeout = 2000, successMessage = '已复制到剪贴板', errorMessage = '复制失败' } = options;

    const [copied, setCopied] = useState(false);

    const copy = useCallback(
        async (text: string) => {
            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                if (successMessage) {
                    toast.success(successMessage);
                }
                setTimeout(() => setCopied(false), timeout);
                return true;
            } catch (error) {
                if (errorMessage) {
                    toast.error(errorMessage);
                }
                return false;
            }
        },
        [timeout, successMessage, errorMessage]
    );

    return { copied, copy };
}

