"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Copy,
	Trash2,
	Loader2,
	Link2,
	Check,
	Eye,
	Lock,
	Clock,
	FileText,
} from "lucide-react";
import { toast } from "sonner";

interface ShareItem {
	id: string;
	documentId: string;
	documentTitle: string | null;
	password: string | null;
	expiresAt: Date | null;
	viewCount: number;
	createdAt: Date;
}

interface SharesResponse {
	shares?: ShareItem[];
	error?: string;
}

interface DeleteResponse {
	success?: boolean;
	error?: string;
}

interface SharesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SharesDialog({ open, onOpenChange }: SharesDialogProps) {
	const [shares, setShares] = useState<ShareItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const loadShares = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/shares");
			const data = (await res.json()) as SharesResponse;

			if (res.ok) {
				setShares(data.shares || []);
			} else {
				toast.error(data.error || "加载分享列表失败");
			}
		} catch {
			toast.error("网络错误，请稍后重试");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (open) {
			loadShares();
		}
	}, [open, loadShares]);

	const handleCopy = async (id: string, password: string | null) => {
		let shareUrl = `${window.location.origin}/share/${id}`;
		if (password) {
			shareUrl += `?password=${encodeURIComponent(password)}`;
		}
		await navigator.clipboard.writeText(shareUrl);
		setCopiedId(id);
		toast.success("链接已复制");
		setTimeout(() => setCopiedId(null), 2000);
	};

	const handleDelete = async () => {
		if (!deleteId) return;

		setIsDeleting(true);
		try {
			const res = await fetch(`/api/shares/${deleteId}`, {
				method: "DELETE",
			});

			if (res.ok) {
				setShares((prev) => prev.filter((s) => s.id !== deleteId));
				toast.success("分享已删除");
			} else {
				const data = (await res.json()) as DeleteResponse;
				toast.error(data.error || "删除失败");
			}
		} catch {
			toast.error("网络错误，请稍后重试");
		} finally {
			setIsDeleting(false);
			setDeleteId(null);
		}
	};

	const formatDate = (date: Date | null) => {
		if (!date) return "永不过期";
		const d = new Date(date);
		return d.toLocaleDateString("zh-CN", {
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const isExpired = (expiresAt: Date | null) => {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="!w-[60vw] !max-w-[90vw] max-h-[80vh] !min-h-[60vh] flex flex-col">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Link2 className="h-5 w-5" />
							分享管理
						</DialogTitle>
						<DialogDescription>
							管理您创建的所有文档分享链接
						</DialogDescription>
					</DialogHeader>

					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : shares.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Link2 className="h-12 w-12 mb-4 opacity-50" />
							<p>暂无分享记录</p>
							<p className="text-sm">在文档页面点击分享按钮创建分享链接</p>
						</div>
					) : (
						<ScrollArea className="h-[400px]">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[180px]">文档</TableHead>
										<TableHead className="w-[90px]">密码</TableHead>
										<TableHead className="w-[70px]">访问</TableHead>
										<TableHead className="w-[120px]">创建时间</TableHead>
										<TableHead className="w-[120px]">过期时间</TableHead>
										<TableHead className="w-[90px]">状态</TableHead>
										<TableHead className="w-[100px] text-right">
											操作
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{shares.map((share) => (
										<TableRow key={share.id}>
											<TableCell>
												<div className="flex items-center gap-2">
													<FileText className="h-4 w-4 text-muted-foreground shrink-0" />
													<span className="truncate max-w-[140px]" title={share.documentTitle || "未知文档"}>
														{share.documentTitle || "未知文档"}
													</span>
												</div>
											</TableCell>
											<TableCell>
												{share.password ? (
													<code className="text-xs font-mono bg-muted px-2 py-1 rounded border">
														{share.password}
													</code>
												) : (
													<span className="text-xs text-muted-foreground">无</span>
												)}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1 text-sm text-muted-foreground">
													<Eye className="h-3.5 w-3.5" />
													<span>{share.viewCount}</span>
												</div>
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{new Date(share.createdAt).toLocaleDateString("zh-CN", {
													month: "2-digit",
													day: "2-digit",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{formatDate(share.expiresAt)}
											</TableCell>
											<TableCell>
												{isExpired(share.expiresAt) ? (
													<Badge variant="secondary" className="text-xs">
														<Clock className="h-3 w-3 mr-1" />
														已过期
													</Badge>
												) : (
													<Badge variant="default" className="text-xs">
														正常
													</Badge>
												)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														onClick={() => handleCopy(share.id, share.password)}
														disabled={isExpired(share.expiresAt)}
													>
														{copiedId === share.id ? (
															<Check className="h-4 w-4 text-green-500" />
														) : (
															<Copy className="h-4 w-4" />
														)}
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-destructive hover:text-destructive"
														onClick={() => setDeleteId(share.id)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollArea>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认删除分享？</AlertDialogTitle>
						<AlertDialogDescription>
							删除后，此分享链接将失效，其他人将无法通过此链接访问文档。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? (
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
		</>
	);
}
