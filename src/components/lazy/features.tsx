import { lazy } from 'react';

// Markdown 渲染器
export const MarkdownRenderer = lazy(() =>
	import('../features/document/markdown-renderer').then((mod) => ({ default: mod.MarkdownRenderer }))
);

// 文档树
export const DocumentTree = lazy(() =>
	import('../features/document/document-tree').then((mod) => ({ default: mod.DocumentTree }))
);

// 文档查看器
export const DocumentViewer = lazy(() =>
	import('../features/document/document-viewer').then((mod) => ({ default: mod.DocumentViewer }))
);

// 目录
export const TableOfContents = lazy(() =>
	import('../features/document/table-of-contents').then((mod) => ({ default: mod.TableOfContents }))
);

// 搜索命令
export const SearchCommand = lazy(() =>
	import('../features/search/search-command').then((mod) => ({ default: mod.SearchCommand }))
);
