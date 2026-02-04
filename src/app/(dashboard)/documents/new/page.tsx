'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Save, Edit, Eye, Sparkles, Columns2, PanelLeft, PanelRight } from 'lucide-react';
import { toast } from 'sonner';
import { triggerDocumentsRefresh } from '@/hooks/use-documents';
import { useImagePaste } from '@/hooks/use-image-paste';
import { onDocumentCreated } from '@/lib/search';
import { documentService } from '@/services';
import { SubmitButton } from '@/components/common/submit-button';
import type { Document } from '@/db/schema';
import type { ViewMode } from '@/types';

import { MarkdownRenderer, AIBeautifyDialog } from '@/components/lazy';

export default function NewDocumentPage() {
	const router = useRouter();
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [parentId, setParentId] = useState<string>('');
	const [documents, setDocuments] = useState<Document[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showAIBeautify, setShowAIBeautify] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>('split');
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		const fetchDocuments = async () => {
			try {
				const data = await documentService.getAll();
				setDocuments(data.documents || []);
			} catch (error) {
				console.error(error);
			}
		};
		fetchDocuments();
	}, []);

	const insertImageAtCursor = useCallback(
		(imageMarkdown: string) => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const newContent = content.substring(0, start) + imageMarkdown + content.substring(end);

			setContent(newContent);

			setTimeout(() => {
				textarea.focus();
				const newPosition = start + imageMarkdown.length;
				textarea.setSelectionRange(newPosition, newPosition);
			}, 0);
		},
		[content]
	);

	const { handlePaste } = useImagePaste({
		onImageInsert: insertImageAtCursor,
		disabled: isLoading,
	});

	const handleSubmit = async () => {
		if (!title.trim()) {
			toast.error('请输入文档标题');
			return;
		}

		setIsLoading(true);

		try {
			const data = await documentService.create({
				title,
				content,
				parentId: parentId || undefined,
			});

			toast.success('文档创建成功');
			triggerDocumentsRefresh();
			onDocumentCreated({
				id: data.document.id,
				title: data.document.title,
				content: data.document.content || '',
				parentId: data.document.parentId,
				createdAt: String(data.document.createdAt),
				updatedAt: String(data.document.updatedAt),
			});
			router.push(`/documents/${data.document.id}`);
		} catch {
			toast.error('创建文档失败，请重试');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col h-full">
			<header className="flex h-14 items-center gap-4 border-b px-6 shrink-0">
				<SidebarTrigger />
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<h1 className="font-semibold">新建文档</h1>
				<div className="ml-auto flex gap-2">
					<SubmitButton onClick={handleSubmit} loading={isLoading} loadingText="创建中...">
						<Save className="mr-2 h-4 w-4" />
						创建文档
					</SubmitButton>
				</div>
			</header>
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="p-4 border-b shrink-0">
					<div className="flex gap-4 items-end">
						<div className="flex-1 space-y-1">
							<Label htmlFor="title">文档标题</Label>
							<Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入文档标题" disabled={isLoading} />
						</div>
						<div className="w-48 space-y-1">
							<Label htmlFor="parent">父文档</Label>
							<Select value={parentId || 'none'} onValueChange={(v) => setParentId(v === 'none' ? '' : v)}>
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
					{(viewMode === 'split' || viewMode === 'edit') && (
						<div className={`flex flex-col min-w-0 ${viewMode === 'split' ? 'flex-1 border-r' : 'flex-1'}`}>
							<div className="h-11 px-4 border-b bg-muted/30 shrink-0 flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Edit className="h-4 w-4" />
									<span>编辑</span>
								</div>
								<div className="flex items-center gap-2">
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
									<ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm">
										<ToggleGroupItem value="edit" aria-label="仅编辑" title="仅编辑">
											<PanelLeft className="h-4 w-4" />
										</ToggleGroupItem>
										<ToggleGroupItem value="split" aria-label="双栏" title="双栏">
											<Columns2 className="h-4 w-4" />
										</ToggleGroupItem>
										<ToggleGroupItem value="preview" aria-label="仅预览" title="仅预览">
											<PanelRight className="h-4 w-4" />
										</ToggleGroupItem>
									</ToggleGroup>
								</div>
							</div>
							<div className="flex-1 min-h-0 p-4 overflow-hidden">
								<textarea
									ref={textareaRef}
									value={content}
									onChange={(e) => setContent(e.target.value)}
									onPaste={handlePaste}
									placeholder="使用 Markdown 格式编写文档内容..."
									className="h-full w-full font-mono resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-auto"
									disabled={isLoading}
								/>
							</div>
						</div>
					)}

					{(viewMode === 'split' || viewMode === 'preview') && (
						<div className={`flex flex-col min-w-0 overflow-hidden ${viewMode === 'split' ? 'flex-1' : 'flex-1'}`}>
							<div className="h-11 px-4 border-b bg-muted/30 shrink-0 flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Eye className="h-4 w-4" />
									<span>预览</span>
								</div>
								{viewMode === 'preview' && (
									<ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm">
										<ToggleGroupItem value="edit" aria-label="仅编辑" title="仅编辑">
											<PanelLeft className="h-4 w-4" />
										</ToggleGroupItem>
										<ToggleGroupItem value="split" aria-label="双栏" title="双栏">
											<Columns2 className="h-4 w-4" />
										</ToggleGroupItem>
										<ToggleGroupItem value="preview" aria-label="仅预览" title="仅预览">
											<PanelRight className="h-4 w-4" />
										</ToggleGroupItem>
									</ToggleGroup>
								)}
							</div>
							<ScrollArea className="flex-1 min-h-0">
								<div className="p-4">
									{content ? (
										<Suspense fallback={<div className="text-muted-foreground text-center py-8">加载中...</div>}>
											<MarkdownRenderer content={content} />
										</Suspense>
									) : (
										<p className="text-muted-foreground text-center py-8">
											{viewMode === 'preview' ? '暂无内容，请切换到编辑模式输入内容' : '在左侧输入内容后，这里将实时显示预览'}
										</p>
									)}
								</div>
							</ScrollArea>
						</div>
					)}
				</div>
			</div>

			{showAIBeautify && (
				<Suspense fallback={null}>
					<AIBeautifyDialog open={showAIBeautify} onOpenChange={setShowAIBeautify} content={content} onReplace={setContent} />
				</Suspense>
			)}
		</div>
	);
}
