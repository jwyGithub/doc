'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trash2, RefreshCw, Database } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import { useBlobs } from '@/hooks/use-blobs';
import { formatFileSize, formatDateTime } from '@/lib/format';
import { LoadingState } from '../../common/loading-state';
import { EmptyState } from '../../common/empty-state';
import { BaseDialog } from '../../common/base-dialog';
import { ConfirmDialog } from '../../common/confirm-dialog';
import type { DialogProps } from '@/types';

export function BlobManagerDialog({ open, onOpenChange }: DialogProps) {
	const { blobs, loading, loadBlobs, deleteMultiple } = useBlobs();
	const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (open) {
			loadBlobs();
			setSelectedUrls(new Set());
		}
	}, [open, loadBlobs]);

	const toggleSelect = (url: string) => {
		const newSelected = new Set(selectedUrls);
		if (newSelected.has(url)) {
			newSelected.delete(url);
		} else {
			newSelected.add(url);
		}
		setSelectedUrls(newSelected);
	};

	const toggleSelectAll = () => {
		if (selectedUrls.size === blobs.length) {
			setSelectedUrls(new Set());
		} else {
			setSelectedUrls(new Set(blobs.map((b) => b.url)));
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteMultiple(Array.from(selectedUrls));
			setSelectedUrls(new Set());
		} finally {
			setIsDeleting(false);
		}
	};

	const handleDeleteClick = () => {
		if (selectedUrls.size === 0) return;
		setShowDeleteConfirm(true);
	};

	return (
		<>
			<BaseDialog open={open} onOpenChange={onOpenChange} title="Blob 管理" description="管理已上传的图片文件" icon={Database} size="lg" loading={loading}>
				<div className="flex-1 flex flex-col gap-4 overflow-hidden">
					<div className="flex items-center justify-between gap-2 pb-2 border-b">
						<div className="flex items-center gap-2">
							<Checkbox checked={blobs.length > 0 && selectedUrls.size === blobs.length} onCheckedChange={toggleSelectAll} disabled={loading || blobs.length === 0} />
							<span className="text-sm text-muted-foreground">{selectedUrls.size > 0 ? `已选择 ${selectedUrls.size} 项` : `共 ${blobs.length} 项`}</span>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={loadBlobs} disabled={loading}>
								{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
								<span className="ml-2">刷新</span>
							</Button>
							<Button variant="destructive" size="sm" onClick={handleDeleteClick} disabled={selectedUrls.size === 0 || isDeleting}>
								{isDeleting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										删除中...
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										删除 ({selectedUrls.size})
									</>
								)}
							</Button>
						</div>
					</div>

					<ScrollArea className="flex-1 min-h-0">
						{blobs.length === 0 ? (
							<EmptyState icon={ImageIcon} title="暂无上传的文件" />
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
								{blobs.map((blob) => (
									<div
										key={blob.url}
										className={`relative border rounded-lg overflow-hidden transition-all cursor-pointer hover:border-primary ${
											selectedUrls.has(blob.url) ? 'border-primary ring-2 ring-primary' : ''
										}`}
										onClick={() => toggleSelect(blob.url)}
									>
										<div className="absolute top-2 left-2 z-10">
											<Checkbox checked={selectedUrls.has(blob.url)} onCheckedChange={() => toggleSelect(blob.url)} onClick={(e) => e.stopPropagation()} />
										</div>
										<div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
											<img
												src={blob.url}
												alt={blob.pathname}
												className="w-full h-full object-cover"
												loading="lazy"
												onError={(e) => {
													(e.target as HTMLImageElement).style.display = 'none';
													(e.target as HTMLImageElement).parentElement!.innerHTML =
														'<div class="flex items-center justify-center w-full h-full"><svg class="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
												}}
											/>
										</div>
										<div className="p-3 space-y-1">
											<p className="text-sm font-medium truncate" title={blob.pathname}>
												{blob.pathname.split('/').pop()}
											</p>
											<div className="flex items-center justify-between text-xs text-muted-foreground">
												<span>{formatFileSize(blob.size)}</span>
												<span>{formatDateTime(blob.uploadedAt)}</span>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</ScrollArea>
				</div>
			</BaseDialog>

			<ConfirmDialog
				open={showDeleteConfirm}
				onOpenChange={setShowDeleteConfirm}
				title="确认删除文件？"
				description={`确定要删除 ${selectedUrls.size} 个文件吗？此操作不可恢复。`}
				confirmText="确认删除"
				onConfirm={handleDelete}
				variant="destructive"
				loading={isDeleting}
			/>
		</>
	);
}
