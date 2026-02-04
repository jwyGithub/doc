'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, RefreshCw, Check, Link2 } from 'lucide-react';
import { useShare } from '@/hooks/use-share';
import { useClipboard } from '@/hooks/use-clipboard';
import { generatePassword } from '@/lib/password';
import { PASSWORD_CONFIG } from '@/constants';
import { LoadingState } from '../../common/loading-state';
import { SubmitButton } from '../../common/submit-button';
import type { DialogProps, ExpiresType } from '@/types';

interface ShareDialogProps extends DialogProps {
	documentId: string;
	documentTitle: string;
}

export function ShareDialog({ open, onOpenChange, documentId, documentTitle }: ShareDialogProps) {
	const { share, loading, loadShare, createShare } = useShare(documentId);
	const { copied, copy } = useClipboard();
	const [isSaving, setIsSaving] = useState(false);
	const [usePassword, setUsePassword] = useState(false);
	const [password, setPassword] = useState('');
	const [expiresType, setExpiresType] = useState<ExpiresType>('never');

	useEffect(() => {
		if (open) {
			loadShare();
		}
	}, [open, loadShare]);

	useEffect(() => {
		if (share) {
			setUsePassword(!!share.password);
			setPassword(share.password || '');

			if (share.expiresAt) {
				const expiresAt = new Date(share.expiresAt);
				const now = new Date();
				const diffHours = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

				if (diffHours <= 1) setExpiresType('1h');
				else if (diffHours <= 24) setExpiresType('1d');
				else if (diffHours <= 168) setExpiresType('7d');
				else if (diffHours <= 720) setExpiresType('30d');
				else setExpiresType('never');
			} else {
				setExpiresType('never');
			}
		}
	}, [share]);

	const handleGeneratePassword = useCallback(() => {
		setPassword(generatePassword(PASSWORD_CONFIG.DEFAULT_GENERATED_LENGTH, PASSWORD_CONFIG.CHARS));
	}, []);

	const getExpiresAt = (): string | undefined => {
		if (expiresType === 'never') return undefined;

		const now = new Date();
		switch (expiresType) {
			case '1h':
				now.setHours(now.getHours() + 1);
				break;
			case '1d':
				now.setDate(now.getDate() + 1);
				break;
			case '7d':
				now.setDate(now.getDate() + 7);
				break;
			case '30d':
				now.setDate(now.getDate() + 30);
				break;
		}
		return now.toISOString();
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await createShare({
				documentId,
				password: usePassword ? password : undefined,
				expiresAt: getExpiresAt(),
			});
		} finally {
			setIsSaving(false);
		}
	};

	const getShareUrl = () => {
		if (!share) return '';
		let url = `${window.location.origin}/share/${share.id}`;
		if (share.password) {
			url += `?password=${encodeURIComponent(share.password)}`;
		}
		return url;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" />
						分享文档
					</DialogTitle>
					<DialogDescription>分享 &ldquo;{documentTitle}&rdquo; 给其他人访问</DialogDescription>
				</DialogHeader>

				{loading ? (
					<LoadingState />
				) : (
					<div className="space-y-5 py-2">
						<div className="space-y-2">
							<Label htmlFor="expires-select" className="text-base">
								有效期
							</Label>
							<Select value={expiresType} onValueChange={(v) => setExpiresType(v as ExpiresType)}>
								<SelectTrigger id="expires-select">
									<SelectValue placeholder="选择有效期" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1h">1 小时</SelectItem>
									<SelectItem value="1d">1 天</SelectItem>
									<SelectItem value="7d">7 天</SelectItem>
									<SelectItem value="30d">30 天</SelectItem>
									<SelectItem value="never">永不过期</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label htmlFor="use-password" className="text-base">
									访问密码
								</Label>
								<Switch
									id="use-password"
									checked={usePassword}
									onCheckedChange={(checked) => {
										setUsePassword(checked);
										if (checked && !password) {
											handleGeneratePassword();
										}
									}}
								/>
							</div>

							{usePassword && (
								<div className="flex gap-2">
									<Input
										value={password}
										onChange={(e) => setPassword(e.target.value.toUpperCase().slice(0, 8))}
										placeholder="输入访问密码"
										className="flex-1 font-mono tracking-widest text-lg h-11"
									/>
									<Button variant="outline" size="icon" className="h-11 w-11" onClick={handleGeneratePassword} title="随机生成密码">
										<RefreshCw className="h-5 w-5" />
									</Button>
								</div>
							)}
						</div>

						{share && (
							<div className="space-y-2 pt-2 border-t">
								<Label className="text-base">分享链接</Label>
								<div className="flex gap-2">
									<Input value={getShareUrl()} readOnly className="flex-1 text-sm bg-muted" />
									<Button variant="outline" size="icon" className="h-10 w-10" onClick={() => copy(getShareUrl())}>
										{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
									</Button>
								</div>
							</div>
						)}
					</div>
				)}

				<DialogFooter className="gap-2 sm:gap-0">
					<Button className="mr-2" variant="outline" onClick={() => onOpenChange(false)}>
						取消
					</Button>
					<SubmitButton onClick={handleSave} loading={isSaving} loadingText={share ? '更新中...' : '创建中...'}>
						{share ? '更新分享' : '创建分享'}
					</SubmitButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
