"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Loader2, Eye, Edit, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { triggerDocumentsRefresh } from "@/hooks/use-documents";
import { onDocumentUpdated } from "@/lib/search";
import type { Document } from "@/db/schema";

// 延迟加载重型组件
const MarkdownRenderer = lazy(() => import("@/components/markdown-renderer").then(mod => ({ default: mod.MarkdownRenderer })));
const AIBeautifyDialog = lazy(() => import("@/components/ai-beautify-dialog").then(mod => ({ default: mod.AIBeautifyDialog })));

export default function EditDocumentPage() {
	const router = useRouter();
	const params = useParams();
	const id = params.id as string;

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [parentId, setParentId] = useState<string>("");
	const [documents, setDocuments] = useState<Document[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(true);
	const [showAIBeautify, setShowAIBeautify] = useState(false);

	const fetchDocument = useCallback(async () => {
		try {
			const res = await fetch(`/api/documents/${id}`);
			if (!res.ok) throw new Error("Not found");
			const { document } = (await res.json()) as { document: Document };
			setTitle(document.title);
			setContent(document.content || "");
			setParentId(document.parentId || "");
		} catch {
			toast.error("文档不存在");
			router.push("/");
		} finally {
			setIsFetching(false);
		}
	}, [id, router]);

	const fetchDocuments = useCallback(async () => {
		try {
			const res = await fetch("/api/documents");
			const data = (await res.json()) as { documents?: Document[] };
			// 过滤掉当前文档和其子文档
			const filtered = (data.documents || []).filter(
				(doc: Document) => doc.id !== id
			);
			setDocuments(filtered);
		} catch (error) {
			console.error(error);
		}
	}, [id]);

	useEffect(() => {
		fetchDocument();
		fetchDocuments();
	}, [fetchDocument, fetchDocuments]);

	const handleSubmit = async () => {
		if (!title.trim()) {
			toast.error("请输入文档标题");
			return;
		}

		setIsLoading(true);

		try {
			const res = await fetch(`/api/documents/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title,
					content,
					parentId: parentId || null,
				}),
			});

			if (!res.ok) {
				throw new Error("更新失败");
			}

			const { document } = (await res.json()) as { document: Document };
			toast.success("文档已保存");
			triggerDocumentsRefresh();
			// 更新搜索索引
			onDocumentUpdated({
				id: document.id,
				title: document.title,
				content: document.content || "",
				parentId: document.parentId,
				createdAt: String(document.createdAt),
				updatedAt: String(document.updatedAt),
			});
			router.push(`/documents/${id}`);
		} catch {
			toast.error("保存失败，请重试");
		} finally {
			setIsLoading(false);
		}
	};

	if (isFetching) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<header className="flex h-14 items-center gap-4 border-b px-6 shrink-0">
				<SidebarTrigger />
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<h1 className="font-semibold">编辑文档</h1>
				<div className="ml-auto flex gap-2">
					<Button type="button" onClick={handleSubmit} disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								保存中...
							</>
						) : (
							<>
								<Save className="mr-2 h-4 w-4" />
								保存更改
							</>
						)}
					</Button>
				</div>
			</header>
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="p-4 border-b shrink-0">
					<div className="flex gap-4 items-end">
						<div className="flex-1 space-y-1">
							<Label htmlFor="title">文档标题</Label>
							<Input
								id="title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="请输入文档标题"
								disabled={isLoading}
							/>
						</div>
						<div className="w-48 space-y-1">
							<Label htmlFor="parent">父文档</Label>
							<Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
								<SelectTrigger>
									<SelectValue placeholder="选择父文档" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">无（根级文档）</SelectItem>
									{documents.map((doc) => (
										<SelectItem key={doc.id} value={doc.id}>
											{doc.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<div className="flex-1 min-h-0 flex overflow-hidden">
					{/* 编辑区域 */}
					<div className="flex-1 flex flex-col border-r min-w-0">
						<div className="px-4 py-2 border-b bg-muted/30 shrink-0">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Edit className="h-4 w-4" />
									<span>编辑</span>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowAIBeautify(true)}
									disabled={isLoading || !content.trim()}
									className="h-7 text-xs"
								>
									<Sparkles className="mr-1 h-3 w-3" />
									AI 美化
								</Button>
							</div>
						</div>
						<div className="flex-1 min-h-0 p-4 overflow-hidden">
							<textarea
								value={content}
								onChange={(e) => setContent(e.target.value)}
								placeholder="使用 Markdown 格式编写文档内容..."
								className="h-full w-full font-mono resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-auto"
								disabled={isLoading}
							/>
						</div>
					</div>

					{/* 预览区域 */}
					<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
						<div className="px-4 py-2 border-b bg-muted/30 shrink-0">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Eye className="h-4 w-4" />
								<span>预览</span>
							</div>
						</div>
						<ScrollArea className="flex-1 min-h-0">
							<div className="p-4">
								{content ? (
									<Suspense fallback={<div className="text-muted-foreground text-center py-8">加载中...</div>}>
										<MarkdownRenderer content={content} />
									</Suspense>
								) : (
									<p className="text-muted-foreground text-center py-8">
										在左侧输入内容后，这里将实时显示预览
									</p>
								)}
							</div>
						</ScrollArea>
					</div>
				</div>
			</div>

			{showAIBeautify && (
				<Suspense fallback={null}>
					<AIBeautifyDialog
						open={showAIBeautify}
						onOpenChange={setShowAIBeautify}
						content={content}
						onReplace={setContent}
					/>
				</Suspense>
			)}
		</div>
	);
}
