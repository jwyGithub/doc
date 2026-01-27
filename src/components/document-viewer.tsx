"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MarkdownRenderer } from "./markdown-renderer";
import { triggerDocumentsRefresh } from "@/hooks/use-documents";
import { onDocumentDeleted } from "@/lib/search";
import type { Document } from "@/db/schema";

interface DocumentViewerProps {
	document: Document;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
	const router = useRouter();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const res = await fetch(`/api/documents/${document.id}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				throw new Error("删除失败");
			}

			toast.success("文档已删除");
			triggerDocumentsRefresh();
			// 更新搜索索引
			onDocumentDeleted(document.id);
			router.push("/");
		} catch {
			toast.error("删除文档失败，请重试");
		} finally {
			setIsDeleting(false);
			setShowDeleteDialog(false);
		}
	};

	return (
		<div className="flex flex-col h-full">
			<header className="flex h-14 items-center justify-between gap-4 border-b px-6 shrink-0">
				<div className="flex items-center gap-4">
					<SidebarTrigger />
					<h1 className="font-semibold truncate">{document.title}</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push(`/documents/${document.id}/edit`)}
					>
						<Edit className="h-4 w-4 mr-2" />
						编辑
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="text-destructive hover:text-destructive"
						onClick={() => setShowDeleteDialog(true)}
					>
						<Trash2 className="h-4 w-4 mr-2" />
						删除
					</Button>
				</div>
			</header>

			<div className="flex-1 min-h-0 overflow-auto">
				<main className="p-6 md:px-10 lg:px-16 animate-in fade-in-50 duration-300">
					{document.content ? (
						<MarkdownRenderer content={document.content} />
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<p>此文档暂无内容</p>
							<Button
								variant="link"
								className="mt-2"
								onClick={() => router.push(`/documents/${document.id}/edit`)}
							>
								点击编辑添加内容
							</Button>
						</div>
					)}
				</main>
			</div>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认删除文档？</AlertDialogTitle>
						<AlertDialogDescription>
							此操作将永久删除文档 &ldquo;{document.title}&rdquo;
							及其所有子文档。此操作无法撤销。
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
		</div>
	);
}
