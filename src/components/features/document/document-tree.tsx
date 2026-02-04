'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { useDocuments } from '@/hooks/use-documents';
import type { Document } from '@/db/schema';
import type { TreeNode } from '@/types';

interface DocumentTreeProps {
	currentPath: string;
}

export function DocumentTree({ currentPath }: DocumentTreeProps) {
	const { documents: rawDocuments, loading } = useDocuments();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const documents = useMemo(() => {
		const buildTree = (docs: Document[]): TreeNode[] => {
			const map = new Map<string, TreeNode>();
			const roots: TreeNode[] = [];

			// 创建节点映射
			docs.forEach((doc) => {
				map.set(doc.id, { ...doc, children: [] });
			});

			// 构建树结构
			docs.forEach((doc) => {
				const node = map.get(doc.id)!;
				if (doc.parentId && map.has(doc.parentId)) {
					map.get(doc.parentId)!.children.push(node);
				} else {
					roots.push(node);
				}
			});

			// 按order排序
			const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
				return nodes
					.sort((a, b) => a.order - b.order)
					.map((node) => ({
						...node,
						children: sortNodes(node.children),
					}));
			};

			return sortNodes(roots);
		};

		return buildTree(rawDocuments);
	}, [rawDocuments]);

	const toggleExpanded = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const renderNode = (node: TreeNode, level: number = 0) => {
		const isActive = currentPath === `/documents/${node.id}`;
		const hasChildren = node.children.length > 0;
		const isExpanded = expandedIds.has(node.id);

		return (
			<div key={node.id}>
				<SidebarMenuItem>
					<SidebarMenuButton
						asChild
						isActive={isActive}
						className={cn("group", level > 0 && "ml-4")}
					>
						<Link href={`/documents/${node.id}`} className="flex items-center gap-2">
							{hasChildren ? (
								<button
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										toggleExpanded(node.id);
									}}
									className="p-0.5 hover:bg-accent rounded"
								>
									{isExpanded ? (
										<ChevronDown className="h-3 w-3" />
									) : (
										<ChevronRight className="h-3 w-3" />
									)}
								</button>
							) : (
								<span className="w-4" />
							)}
							<FileText className="h-4 w-4 shrink-0" />
							<span className="truncate">{node.title}</span>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
				{hasChildren && isExpanded && (
					<div className="ml-2">
						{node.children.map((child) => renderNode(child, level + 1))}
					</div>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="space-y-2 px-2">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-8 w-full" />
				))}
			</div>
		);
	}

	if (documents.length === 0) {
		return (
			<div className="px-4 py-8 text-center text-muted-foreground text-sm">
				<FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
				<p>暂无文档</p>
				<p className="text-xs mt-1">点击右上角 + 创建新文档</p>
			</div>
		);
	}

	return (
		<SidebarMenu>
			{documents.map((doc) => renderNode(doc))}
		</SidebarMenu>
	);
}
