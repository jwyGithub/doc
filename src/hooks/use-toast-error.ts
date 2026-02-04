import { useCallback } from 'react';
import { toast } from 'sonner';

export function useToastError() {
	return useCallback((error: unknown, defaultMessage = '操作失败') => {
		const message = error instanceof Error ? error.message : defaultMessage;
		toast.error(message);
	}, []);
}

export function useToastSuccess() {
	return useCallback((message: string) => {
		toast.success(message);
	}, []);
}
