'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Trash2, Link2, Check, Eye, Clock, FileText } from 'lucide-react';
import { formatShortDateTime, isExpired } from '@/lib/format';
import { useClipboard } from '@/hooks/use-clipboard';
import { useShares } from '@/hooks/use-share';
import { DataTable } from '../../common/data-table';
import { BaseDialog } from '../../common/base-dialog';
import { ConfirmDialog } from '../../common/confirm-dialog';
import type { DialogProps, ShareItem } from '@/types';
import type { ColumnDef } from '@/hooks/use-table';

export function SharesDialog({ open, onOpenChange }: DialogProps) {
	const { shares, loading, loadShares, deleteShare } = useShares();
	const { copied: copiedId, copy } = useClipboard();
	const [deleteId, setDeleteId] = useState<string | null>(null);

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
		await copy(shareUrl);
	};

	const handleDelete = async () => {
		if (deleteId) {
			await deleteShare(deleteId);
			setDeleteId(null);
		}
	};

	const formatExpiryDate = (date: Date | null) => {
		if (!date) return '永不过期';
		return formatShortDateTime(date);
	};

	const columns: ColumnDef<ShareItem>[] = [
		{
			id: 'document',
			header: '文档',
			width: '180px',
			cell: (share) => (
				<div className="flex items-center gap-2">
					<FileText className="h-4 w-4 text-muted-foreground shrink-0" />
					<span className="truncate max-w-[140px]" title={share.documentTitle || '未知文档'}>
						{share.documentTitle || '未知文档'}
					</span>
				</div>
			),
			sortable: true,
			accessor: 'documentTitle',
		},
		{
			id: 'password',
			header: '密码',
			width: '90px',
			cell: (share) =>
				share.password ? (
					<code className="text-xs font-mono bg-muted px-2 py-1 rounded border">{share.password}</code>
				) : (
					<span className="text-xs text-muted-foreground">无</span>
				),
		},
		{
			id: 'viewCount',
			header: '访问',
			width: '70px',
			cell: (share) => (
				<div className="flex items-center gap-1 text-sm text-muted-foreground">
					<Eye className="h-3.5 w-3.5" />
					<span>{share.viewCount}</span>
				</div>
			),
			accessor: 'viewCount',
			sortable: true,
		},
		{
			id: 'createdAt',
			header: '创建时间',
			width: '120px',
			cell: (share) => <span className="text-xs text-muted-foreground">{formatShortDateTime(share.createdAt)}</span>,
			accessor: 'createdAt',
			sortable: true,
		},
		{
			id: 'expiresAt',
			header: '过期时间',
			width: '120px',
			cell: (share) => <span className="text-xs text-muted-foreground">{formatExpiryDate(share.expiresAt)}</span>,
			accessor: (share) => share.expiresAt?.getTime() ?? Infinity,
			sortable: true,
		},
		{
			id: 'status',
			header: '状态',
			width: '90px',
			cell: (share) =>
				isExpired(share.expiresAt) ? (
					<Badge variant="secondary" className="text-xs">
						<Clock className="h-3 w-3 mr-1" />
						已过期
					</Badge>
				) : (
					<Badge variant="default" className="text-xs">
						正常
					</Badge>
				),
		},
		{
			id: 'actions',
			header: '操作',
			width: '100px',
			className: 'text-right',
			cell: (share) => (
				<div className="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => handleCopy(share.id, share.password)}
						disabled={isExpired(share.expiresAt)}
					>
						{copiedId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
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
			),
		},
	];

	return (
		<>
			<BaseDialog open={open} onOpenChange={onOpenChange} title="分享管理" description="管理您创建的所有文档分享链接" icon={Link2} size="lg" loading={loading}>
				<ScrollArea className="h-[400px]">
					<DataTable
						data={shares}
						columns={columns}
						loading={loading}
						emptyIcon={Link2}
						emptyTitle="暂无分享记录"
						emptyDescription="在文档页面点击分享按钮创建分享链接"
						initialSortBy="createdAt"
						initialSortOrder="desc"
						bordered={false}
					/>
				</ScrollArea>
			</BaseDialog>

			<ConfirmDialog
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
				title="确认删除分享？"
				description="删除后，此分享链接将失效，其他人将无法通过此链接访问文档。"
				confirmText="确认删除"
				onConfirm={handleDelete}
				variant="destructive"
			/>
		</>
	);
}
