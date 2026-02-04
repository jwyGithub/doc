import { useCallback, useState } from 'react';
import { shareService } from '@/services';
import { useToastError, useToastSuccess } from './use-toast-error';
import type { ShareInfo, CreateShareRequest, ShareItem } from '@/types';

export function useShare(documentId?: string) {
	const [share, setShare] = useState<ShareInfo | null>(null);
	const [loading, setLoading] = useState(false);
	const showError = useToastError();
	const showSuccess = useToastSuccess();

	const loadShare = useCallback(async () => {
		if (!documentId) return;
		setLoading(true);
		try {
			const data = await shareService.getByDocumentId(documentId);
			setShare(data.share || null);
			return data.share;
		} catch (error) {
			showError(error, '加载分享信息失败');
		} finally {
			setLoading(false);
		}
	}, [documentId, showError]);

	const createShare = useCallback(
		async (params: CreateShareRequest) => {
			setLoading(true);
			try {
				const data = await shareService.create(params);
				setShare(data.share);
				showSuccess(data.updated ? '分享设置已更新' : '分享链接已创建');
				return data.share;
			} catch (error) {
				showError(error, '创建分享失败');
				throw error;
			} finally {
				setLoading(false);
			}
		},
		[showError, showSuccess]
	);

	return {
		share,
		loading,
		loadShare,
		createShare,
		setShare,
	};
}

export function useShares() {
	const [shares, setShares] = useState<ShareItem[]>([]);
	const [loading, setLoading] = useState(false);
	const showError = useToastError();
	const showSuccess = useToastSuccess();

	const loadShares = useCallback(async () => {
		setLoading(true);
		try {
			const data = await shareService.getAll();
			setShares(data.shares || []);
			return data.shares;
		} catch (error) {
			showError(error, '加载分享列表失败');
		} finally {
			setLoading(false);
		}
	}, [showError]);

	const deleteShare = useCallback(
		async (id: string) => {
			try {
				await shareService.delete(id);
				setShares((prev) => prev.filter((s) => s.id !== id));
				showSuccess('分享已删除');
			} catch (error) {
				showError(error, '删除失败');
				throw error;
			}
		},
		[showError, showSuccess]
	);

	return {
		shares,
		loading,
		loadShares,
		deleteShare,
		setShares,
	};
}
