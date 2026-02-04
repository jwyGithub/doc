import { useState, useCallback } from 'react';
import { settingsService } from '@/services';
import { useToastError, useToastSuccess } from './use-toast-error';

export function useSettings() {
	const [allowRegistration, setAllowRegistration] = useState(true);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const showError = useToastError();
	const showSuccess = useToastSuccess();

	const loadSettings = useCallback(async () => {
		setLoading(true);
		try {
			const data = await settingsService.getRegistration();
			setAllowRegistration(data.allowRegistration);
			return data;
		} catch (error) {
			showError(error, '获取设置失败');
		} finally {
			setLoading(false);
		}
	}, [showError]);

	const updateRegistration = useCallback(
		async (allowed: boolean) => {
			setSaving(true);
			try {
				await settingsService.updateRegistration({ allowRegistration: allowed });
				setAllowRegistration(allowed);
				showSuccess(allowed ? '已开启用户注册' : '已关闭用户注册');
			} catch (error) {
				showError(error, '保存失败');
				throw error;
			} finally {
				setSaving(false);
			}
		},
		[showError, showSuccess]
	);

	return {
		allowRegistration,
		loading,
		saving,
		loadSettings,
		updateRegistration,
	};
}
