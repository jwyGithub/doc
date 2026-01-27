"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { FileText, Search, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	initSearchEngine,
	search,
	refreshIndex,
	getIndexStatus,
	onSearchIndexUpdate,
	type SearchResultItem,
} from "@/lib/search";

// 防抖 hook
function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return debouncedValue;
}

export function SearchCommand() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResultItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [indexReady, setIndexReady] = useState(false);
	const [documentCount, setDocumentCount] = useState(0);
	const initRef = useRef(false);

	// 防抖搜索词，150ms（本地搜索可以更快）
	const debouncedQuery = useDebounce(query, 150);

	// 初始化搜索引擎（首次打开时）
	useEffect(() => {
		if (open && !initRef.current) {
			initRef.current = true;
			setLoading(true);
			initSearchEngine()
				.then(() => {
					const status = getIndexStatus();
					setIndexReady(status.initialized);
					setDocumentCount(status.documentCount);
				})
				.catch(console.error)
				.finally(() => setLoading(false));
		}
	}, [open]);

	// 监听索引更新事件，更新文档数量
	useEffect(() => {
		const unsubscribe = onSearchIndexUpdate(() => {
			const status = getIndexStatus();
			setDocumentCount(status.documentCount);
		});
		return unsubscribe;
	}, []);

	// 关闭时重置搜索词和结果
	useEffect(() => {
		if (!open) {
			setQuery("");
			setResults([]);
		}
	}, [open]);

	// 监听快捷键 Cmd/Ctrl+K 或 F3
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "F3") {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	// 执行搜索
	useEffect(() => {
		if (!debouncedQuery.trim()) {
			setResults([]);
			return;
		}

		if (!indexReady) {
			return;
		}

		search(debouncedQuery).then((searchResults) => {
			setResults(searchResults);
		});
	}, [debouncedQuery, indexReady]);

	// 刷新索引
	const handleRefresh = useCallback(async () => {
		setLoading(true);
		try {
			await refreshIndex();
			const status = getIndexStatus();
			setDocumentCount(status.documentCount);
			// 如果有搜索词，重新搜索
			if (query.trim()) {
				const searchResults = await search(query);
				setResults(searchResults);
			}
		} catch (error) {
			console.error("Failed to refresh index:", error);
		} finally {
			setLoading(false);
		}
	}, [query]);

	// 选择文档
	const handleSelect = useCallback(
		(docId: string) => {
			setOpen(false);
			setQuery("");
			router.push(`/documents/${docId}`);
		},
		[router]
	);

	// 高亮匹配的文本
	const highlightMatch = (text: string, searchQuery: string) => {
		if (!searchQuery.trim()) return text;

		const lowerText = text.toLowerCase();
		const lowerQuery = searchQuery.toLowerCase();
		const index = lowerText.indexOf(lowerQuery);

		if (index === -1) return text;

		const before = text.slice(0, index);
		const match = text.slice(index, index + searchQuery.length);
		const after = text.slice(index + searchQuery.length);

		return (
			<>
				{before}
				<span className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
					{match}
				</span>
				{after}
			</>
		);
	};

	// 获取内容预览（显示匹配位置附近的文本）
	const getContentPreview = (content: string, searchQuery: string) => {
		if (!searchQuery.trim() || !content) return null;

		const lowerContent = content.toLowerCase();
		const lowerQuery = searchQuery.toLowerCase();
		const index = lowerContent.indexOf(lowerQuery);

		if (index === -1) return null;

		const start = Math.max(0, index - 40);
		const end = Math.min(content.length, index + searchQuery.length + 60);
		let preview = content.slice(start, end);

		if (start > 0) preview = "..." + preview;
		if (end < content.length) preview = preview + "...";

		return preview;
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="overflow-hidden p-0 top-[15%] translate-y-0 max-w-3xl [&>button]:hidden">
				<VisuallyHidden>
					<DialogTitle>搜索文档</DialogTitle>
				</VisuallyHidden>
				<Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
					<div className="flex items-center border-b px-4">
						<Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
						<Command.Input
							placeholder="搜索文档标题或内容..."
							value={query}
							onValueChange={setQuery}
							className="flex h-14 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
						/>
						<button
							type="button"
							onClick={handleRefresh}
							disabled={loading}
							className="ml-2 p-2 hover:bg-accent rounded-md transition-colors disabled:opacity-50 shrink-0"
							title="刷新索引"
						>
							<RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
						</button>
					</div>
					<Command.List className="max-h-[500px] overflow-y-auto p-2">
						{loading && (
							<div className="flex flex-col items-center justify-center py-10">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								<p className="text-sm text-muted-foreground mt-2">
									正在初始化搜索引擎...
								</p>
							</div>
						)}

						{!loading && !query && indexReady && (
							<div className="py-10 text-center text-sm text-muted-foreground">
								<Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
								<p className="text-base">输入关键词搜索文档</p>
								<p className="text-xs mt-1">
									已索引 {documentCount} 个文档，支持模糊搜索
								</p>
							</div>
						)}

						{!loading && query && results.length === 0 && indexReady && (
							<div className="py-10 text-center">
								<p className="text-base">未找到相关文档</p>
								<p className="text-xs text-muted-foreground mt-1">
									尝试使用其他关键词，或点击刷新按钮更新索引
								</p>
							</div>
						)}

						{!loading && results.length > 0 && (
							<Command.Group
								heading={`找到 ${results.length} 个结果`}
								className="[&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs"
							>
								{results.map((result) => {
									const contentPreview = getContentPreview(
										result.content,
										query
									);

									return (
										<Command.Item
											key={result.id}
											value={result.id}
											onSelect={() => handleSelect(result.id)}
											className={cn(
												"relative flex flex-col items-start gap-1 rounded-md px-3 py-3 cursor-pointer",
												"hover:bg-accent hover:text-accent-foreground",
												"data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
											)}
										>
											<div className="flex items-center gap-2 w-full">
												<FileText className="h-4 w-4 shrink-0" />
												<span className="font-medium flex-1 truncate">
													{result.titleMatch
														? highlightMatch(result.title, query)
														: result.title}
												</span>
												<span className="text-xs text-muted-foreground shrink-0">
													{result.score.toFixed(1)}
												</span>
											</div>
											{contentPreview && (
												<p className="text-xs text-muted-foreground pl-6 line-clamp-2">
													{highlightMatch(contentPreview, query)}
												</p>
											)}
										</Command.Item>
									);
								})}
							</Command.Group>
						)}
					</Command.List>
				</Command>
			</DialogContent>
		</Dialog>
	);
}
