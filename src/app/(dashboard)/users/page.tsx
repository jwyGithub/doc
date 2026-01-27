"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface User {
	id: string;
	email: string;
	name: string;
	role: "user" | "admin" | "superadmin";
	createdAt: string;
}

export default function UsersPage() {
	const router = useRouter();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [deletingUser, setDeletingUser] = useState<User | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editForm, setEditForm] = useState({ name: "", role: "" });

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async () => {
		try {
			const res = await fetch("/api/users");
			if (!res.ok) {
				if (res.status === 403) {
					router.push("/");
					return;
				}
				throw new Error("Failed to fetch");
			}
			const data = (await res.json()) as { users?: User[] };
			setUsers(data.users || []);
		} catch (error) {
			console.error(error);
			toast.error("获取用户列表失败");
		} finally {
			setLoading(false);
		}
	};

	const handleEdit = (user: User) => {
		setEditingUser(user);
		setEditForm({ name: user.name, role: user.role });
	};

	const handleSaveEdit = async () => {
		if (!editingUser) return;

		setIsSubmitting(true);
		try {
			const res = await fetch(`/api/users/${editingUser.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(editForm),
			});

			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error || "更新失败");
			}

			toast.success("用户信息已更新");
			setEditingUser(null);
			fetchUsers();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "更新失败");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!deletingUser) return;

		setIsSubmitting(true);
		try {
			const res = await fetch(`/api/users/${deletingUser.id}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error || "删除失败");
			}

			toast.success("用户已删除");
			setDeletingUser(null);
			fetchUsers();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "删除失败");
		} finally {
			setIsSubmitting(false);
		}
	};

	const getRoleBadge = (role: string) => {
		switch (role) {
			case "superadmin":
				return <Badge variant="destructive">超级管理员</Badge>;
			case "admin":
				return <Badge variant="default">管理员</Badge>;
			default:
				return <Badge variant="secondary">普通用户</Badge>;
		}
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	};

	return (
		<div className="flex flex-col h-full">
			<header className="flex h-14 items-center gap-4 border-b px-6">
				<SidebarTrigger />
				<Users className="h-5 w-5" />
				<h1 className="font-semibold">用户管理</h1>
			</header>

			<main className="flex-1 overflow-auto p-6">
				<div className="max-w-5xl mx-auto animate-in fade-in-50 duration-300">
					{loading ? (
						<div className="space-y-4">
							<Skeleton className="h-10 w-full" />
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-16 w-full" />
							))}
						</div>
					) : users.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>暂无用户</p>
						</div>
					) : (
						<div className="border rounded-lg">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>用户名</TableHead>
										<TableHead>邮箱</TableHead>
										<TableHead>角色</TableHead>
										<TableHead>注册时间</TableHead>
										<TableHead className="text-right">操作</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{users.map((user) => (
										<TableRow key={user.id}>
											<TableCell className="font-medium">
												{user.name}
											</TableCell>
											<TableCell>{user.email}</TableCell>
											<TableCell>{getRoleBadge(user.role)}</TableCell>
											<TableCell>{formatDate(user.createdAt)}</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(user)}
														disabled={user.role === "superadmin"}
													>
														<Edit className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-destructive hover:text-destructive"
														onClick={() => setDeletingUser(user)}
														disabled={user.role === "superadmin"}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</main>

			{/* 编辑用户对话框 */}
			<Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>编辑用户</DialogTitle>
						<DialogDescription>
							修改用户 {editingUser?.email} 的信息
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="edit-name">用户名</Label>
							<Input
								id="edit-name"
								value={editForm.name}
								onChange={(e) =>
									setEditForm((prev) => ({ ...prev, name: e.target.value }))
								}
								disabled={isSubmitting}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-role">角色</Label>
							<Select
								value={editForm.role}
								onValueChange={(value) =>
									setEditForm((prev) => ({ ...prev, role: value }))
								}
								disabled={isSubmitting}
							>
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
						<Button
							variant="outline"
							onClick={() => setEditingUser(null)}
							disabled={isSubmitting}
						>
							取消
						</Button>
						<Button onClick={handleSaveEdit} disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									保存中...
								</>
							) : (
								"保存"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 删除用户确认对话框 */}
			<AlertDialog
				open={!!deletingUser}
				onOpenChange={() => setDeletingUser(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认删除用户？</AlertDialogTitle>
						<AlertDialogDescription>
							此操作将永久删除用户 &ldquo;{deletingUser?.name}&rdquo;
							及其创建的所有文档。此操作无法撤销。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isSubmitting}>取消</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isSubmitting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									删除中...
								</>
							) : (
								"确认删除"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
