'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Trash2, Users } from 'lucide-react';
import { useUsers } from '@/hooks/use-users';
import { useForm } from '@/hooks/use-form';
import { formatDate } from '@/lib/format';
import { DataTable } from '../../common/data-table';
import { RoleBadge } from '../../common/role-badge';
import { BaseDialog } from '../../common/base-dialog';
import { ConfirmDialog } from '../../common/confirm-dialog';
import { SubmitButton } from '../../common/submit-button';
import type { DialogProps, UserWithRole } from '@/types';
import type { ColumnDef } from '@/hooks/use-table';

export function UsersDialog({ open, onOpenChange }: DialogProps) {
	const { users, loading, loadUsers, updateUser, deleteUser } = useUsers();
	const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
	const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const editForm = useForm({ name: '', role: '' });

	useEffect(() => {
		if (open) {
			loadUsers();
		}
	}, [open, loadUsers]);

	const handleEdit = (user: UserWithRole) => {
		setEditingUser(user);
		editForm.setValues({ name: user.name, role: user.role });
	};

	const handleSaveEdit = async () => {
		if (!editingUser) return;

		setIsSubmitting(true);
		try {
			await updateUser(editingUser.id, editForm.values);
			setEditingUser(null);
		} catch {
			// Error already handled in useUsers
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (deletingUser) {
			await deleteUser(deletingUser.id);
			setDeletingUser(null);
		}
	};

	const columns: ColumnDef<UserWithRole>[] = [
		{
			id: 'name',
			header: '用户名',
			accessor: 'name',
			cell: (user) => <span className="font-medium">{user.name}</span>,
			sortable: true,
		},
		{
			id: 'email',
			header: '邮箱',
			accessor: 'email',
			sortable: true,
		},
		{
			id: 'role',
			header: '角色',
			accessor: 'role',
			cell: (user) => <RoleBadge role={user.role} />,
			sortable: true,
		},
		{
			id: 'createdAt',
			header: '注册时间',
			accessor: 'createdAt',
			cell: (user) => formatDate(user.createdAt),
			sortable: true,
		},
		{
			id: 'actions',
			header: '操作',
			className: 'text-right',
			cell: (user) => (
				<div className="flex justify-end gap-2">
					<Button variant="ghost" size="icon" onClick={() => handleEdit(user)} disabled={user.role === 'superadmin'}>
						<Edit className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-destructive hover:text-destructive"
						onClick={() => setDeletingUser(user)}
						disabled={user.role === 'superadmin'}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	];

	return (
		<>
			<BaseDialog open={open} onOpenChange={onOpenChange} title="用户管理" description="管理系统用户账户和权限" icon={Users} size="lg">
				<ScrollArea className="flex-1 -mx-6 px-6">
					<DataTable
						data={users}
						columns={columns}
						loading={loading}
						emptyIcon={Users}
						emptyTitle="暂无用户"
						initialSortBy="createdAt"
						initialSortOrder="desc"
					/>
				</ScrollArea>
			</BaseDialog>

			<Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>编辑用户</DialogTitle>
						<DialogDescription>修改用户 {editingUser?.email} 的信息</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="edit-name">用户名</Label>
							<Input
								id="edit-name"
								value={editForm.values.name}
								onChange={(e) => editForm.setValue('name', e.target.value)}
								disabled={isSubmitting}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-role">角色</Label>
							<Select value={editForm.values.role} onValueChange={(value) => editForm.setValue('role', value)} disabled={isSubmitting}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="user">普通用户</SelectItem>
									<SelectItem value="admin">管理员</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingUser(null)} disabled={isSubmitting}>
							取消
						</Button>
						<SubmitButton onClick={handleSaveEdit} loading={isSubmitting} loadingText="保存中...">
							保存
						</SubmitButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ConfirmDialog
				open={!!deletingUser}
				onOpenChange={() => setDeletingUser(null)}
				title="确认删除用户？"
				description={`此操作将永久删除用户 "${deletingUser?.name}" 及其创建的所有文档。此操作无法撤销。`}
				confirmText="确认删除"
				onConfirm={handleDelete}
				variant="destructive"
			/>
		</>
	);
}
