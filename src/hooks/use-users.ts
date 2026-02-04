import { useCallback, useState } from 'react';
import { userService } from '@/services';
import { useToastError, useToastSuccess } from './use-toast-error';
import type { UserWithRole, UpdateUserRequest } from '@/types';

export function useUsers() {
	const [users, setUsers] = useState<UserWithRole[]>([]);
	const [loading, setLoading] = useState(false);
	const showError = useToastError();
	const showSuccess = useToastSuccess();

	const loadUsers = useCallback(async () => {
		setLoading(true);
		try {
			const data = await userService.getAll();
			setUsers(data.users as UserWithRole[]);
			return data.users;
		} catch (error) {
			showError(error, '获取用户列表失败');
		} finally {
			setLoading(false);
		}
	}, [showError]);

	const updateUser = useCallback(
		async (id: string, data: UpdateUserRequest) => {
			try {
				await userService.update(id, data);
				showSuccess('用户信息已更新');
				await loadUsers();
			} catch (error) {
				showError(error, '更新失败');
				throw error;
			}
		},
		[loadUsers, showError, showSuccess]
	);

	const deleteUser = useCallback(
		async (id: string) => {
			try {
				await userService.delete(id);
				showSuccess('用户已删除');
				setUsers((prev) => prev.filter((u) => u.id !== id));
			} catch (error) {
				showError(error, '删除失败');
				throw error;
			}
		},
		[showError, showSuccess]
	);

	return {
		users,
		loading,
		loadUsers,
		updateUser,
		deleteUser,
		setUsers,
	};
}
