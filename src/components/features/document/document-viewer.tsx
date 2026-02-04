'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Edit, Trash2, Loader2, Download, Share2, Menu } from 'lucide-react';
import { ShareDialog } from "../../dialogs/share/share-dialog";
import { TableOfContents } from "./table-of-contents";
import { toast } from 'sonner';
import { triggerDocumentsRefresh } from '@/hooks/use-documents';
import { onDocumentDeleted } from '@/lib/search';
import { extractHeadings } from '@/lib/toc';
import { documentService } from '@/services';
import { ConfirmDialog } from '../../common/confirm-dialog';
import type { Document } from '@/db/schema';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { MarkdownRenderer } from '@/components/lazy';

interface DocumentViewerProps {
	document: Document;
	highlight?: string;
}

export function DocumentViewer({ document: doc, highlight }: DocumentViewerProps) {
	const router = useRouter();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showShareDialog, setShowShareDialog] = useState(false);
	const [showToc, setShowToc] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	
	// 提取文档目录
	const tocItems = doc.content ? extractHeadings(doc.content) : [];

	// 高亮并滚动到关键词位置
	const highlightAndScroll = useCallback(() => {
		if (!highlight || !contentRef.current) return;

		const searchText = highlight.toLowerCase();
		const container = contentRef.current;

		// 清除之前的高亮
		const existingMarks = container.querySelectorAll("mark[data-search-highlight]");
		existingMarks.forEach((mark) => {
			const parent = mark.parentNode;
			if (parent) {
				parent.replaceChild(globalThis.document.createTextNode(mark.textContent || ""), mark);
				parent.normalize();
			}
		});

		// 查找所有文本节点
		const walker = globalThis.document.createTreeWalker(
			container,
			NodeFilter.SHOW_TEXT,
			null
		);

		const textNodes: Text[] = [];
		let node: Node | null;
		while ((node = walker.nextNode())) {
			if (node.textContent && node.textContent.toLowerCase().includes(searchText)) {
				textNodes.push(node as Text);
			}
		}

		if (textNodes.length === 0) return;

		let firstMark: HTMLElement | null = null;

		// 高亮所有匹配的文本
		textNodes.forEach((textNode) => {
			const text = textNode.textContent || "";
			const lowerText = text.toLowerCase();
			let lastIndex = 0;
			const fragments: (string | HTMLElement)[] = [];
			let index: number;

			while ((index = lowerText.indexOf(searchText, lastIndex)) !== -1) {
				// 添加匹配前的文本
				if (index > lastIndex) {
					fragments.push(text.slice(lastIndex, index));
				}
				// 创建高亮标记
				const mark = globalThis.document.createElement("mark");
				mark.setAttribute("data-search-highlight", "true");
				mark.className = "bg-yellow-300 dark:bg-yellow-600 rounded px-0.5 transition-all";
				mark.textContent = text.slice(index, index + searchText.length);
				fragments.push(mark);

				if (!firstMark) {
					firstMark = mark;
				}

				lastIndex = index + searchText.length;
			}

			// 添加剩余文本
			if (lastIndex < text.length) {
				fragments.push(text.slice(lastIndex));
			}

			// 替换原文本节点
			if (fragments.length > 0) {
				const parent = textNode.parentNode;
				if (parent) {
					const wrapper = globalThis.document.createDocumentFragment();
					fragments.forEach((frag) => {
						if (typeof frag === "string") {
							wrapper.appendChild(globalThis.document.createTextNode(frag));
						} else {
							wrapper.appendChild(frag);
						}
					});
					parent.replaceChild(wrapper, textNode);
				}
			}
		});

		// 滚动到第一个匹配位置
		if (firstMark) {
			setTimeout(() => {
				firstMark?.scrollIntoView({ behavior: "smooth", block: "center" });
				// 添加闪烁效果
				firstMark?.classList.add("animate-pulse");
				setTimeout(() => {
					firstMark?.classList.remove("animate-pulse");
				}, 2000);
			}, 100);
		}
	}, [highlight]);

	// 在内容渲染后执行高亮
	useEffect(() => {
		if (highlight && doc.content) {
			// 等待 Markdown 渲染完成
			const timer = setTimeout(highlightAndScroll, 200);
			return () => clearTimeout(timer);
		}
	}, [highlight, doc.content, highlightAndScroll]);

	const handleExport = useCallback(() => {
		if (!doc.content) {
			toast.error("文档内容为空，无法导出");
			return;
		}

		// 创建 Blob 对象
		const blob = new Blob([doc.content], { type: "text/markdown;charset=utf-8" });
		
		// 创建下载链接
		const url = URL.createObjectURL(blob);
		const link = globalThis.document.createElement("a");
		link.href = url;
		// 使用文档标题作为文件名，替换不合法的文件名字符
		const fileName = doc.title.replace(/[/\\?%*:|"<>]/g, "-") + ".md";
		link.download = fileName;
		
		// 触发下载
		globalThis.document.body.appendChild(link);
		link.click();
		
		// 清理
		globalThis.document.body.removeChild(link);
		URL.revokeObjectURL(url);
		
		toast.success("文档已导出");
	}, [doc.content, doc.title]);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await documentService.delete(doc.id);

			toast.success("文档已删除");
			triggerDocumentsRefresh();
			// 更新搜索索引
			onDocumentDeleted(doc.id);
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
					<h1 className="font-semibold truncate">{doc.title}</h1>
				</div>
				<div className="flex items-center gap-2">
					{tocItems.length > 0 && (
						<Sheet open={showToc} onOpenChange={setShowToc}>
							<SheetTrigger asChild>
								<Button variant="outline" size="sm">
									<Menu className="h-4 w-4 mr-2" />
									目录
								</Button>
							</SheetTrigger>
							<SheetContent side="right" className="w-[300px] sm:w-[400px]">
								<SheetHeader>
									<SheetTitle>文档目录</SheetTitle>
								</SheetHeader>
								<div className="mt-6">
									<TableOfContents items={tocItems} />
								</div>
							</SheetContent>
						</Sheet>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push(`/documents/${doc.id}/edit`)}
					>
						<Edit className="h-4 w-4 mr-2" />
						编辑
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						disabled={!doc.content}
					>
						<Download className="h-4 w-4 mr-2" />
						导出
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowShareDialog(true)}
					>
						<Share2 className="h-4 w-4 mr-2" />
						分享
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
					{doc.content ? (
						<div ref={contentRef}>
							<Suspense fallback={<div className="text-muted-foreground text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}>
								<MarkdownRenderer content={doc.content} />
							</Suspense>
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<p>此文档暂无内容</p>
							<Button
								variant="link"
								className="mt-2"
								onClick={() => router.push(`/documents/${doc.id}/edit`)}
							>
								点击编辑添加内容
							</Button>
						</div>
					)}
				</main>
			</div>

			<ConfirmDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				title="确认删除文档？"
				description={`此操作将永久删除文档 "${doc.title}" 及其所有子文档。此操作无法撤销。`}
				confirmText="确认删除"
				onConfirm={handleDelete}
				variant="destructive"
				loading={isDeleting}
			/>

			<ShareDialog
				open={showShareDialog}
				onOpenChange={setShowShareDialog}
				documentId={doc.id}
				documentTitle={doc.title}
			/>
		</div>
	);
}
