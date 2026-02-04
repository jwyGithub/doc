import { useState, useCallback } from 'react';
import { blobService } from '@/services';
import { useToastError, useToastSuccess } from './use-toast-error';
import type { BlobItem } from '@/types';

export function useBlobs() {
	const [blobs, setBlobs] = useState<BlobItem[]>([]);
	const [loading, setLoading] = useState(false);
	const showError = useToastError();
	const showSuccess = useToastSuccess();

	const loadBlobs = useCallback(async () => {
		setLoading(true);
		try {
			const data = await blobService.getAll();
			if (data.blobs) {
				setBlobs(data.blobs);
			}
			return data.blobs;
		} catch (error) {
			showError(error, '加载失败');
		} finally {
			setLoading(false);
		}
	}, [showError]);

	const deleteBlob = useCallback(
		async (url: string) => {
			try {
				await blobService.delete(url);
				setBlobs((prev) => prev.filter((b) => b.url !== url));
			} catch (error) {
				showError(error, '删除失败');
				throw error;
			}
		},
		[showError]
	);

	const deleteMultiple = useCallback(
		async (urls: string[]) => {
			try {
				for (const url of urls) {
					await blobService.delete(url);
				}
				showSuccess(`成功删除 ${urls.length} 个文件`);
				setBlobs((prev) => prev.filter((b) => !urls.includes(b.url)));
			} catch (error) {
				showError(error, '删除失败');
				throw error;
			}
		},
		[showError, showSuccess]
	);

	return {
		blobs,
		loading,
		loadBlobs,
		deleteBlob,
		deleteMultiple,
		setBlobs,
	};
}
