'use client';

import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Loader2, UserPlus } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { APP_INFO } from '@/constants';
import { BaseDialog } from '../../common/base-dialog';
import type { DialogProps } from '@/types';

export function SettingsDialog({ open, onOpenChange }: DialogProps) {
	const { allowRegistration, loading, saving, loadSettings, updateRegistration } = useSettings();

	useEffect(() => {
		if (open) {
			loadSettings();
		}
	}, [open, loadSettings]);

	const handleToggle = async (checked: boolean) => {
		try {
			await updateRegistration(checked);
		} catch {
			// Error already handled
		}
	};

	return (
		<BaseDialog open={open} onOpenChange={onOpenChange} title="系统设置" description="管理系统配置和参数" icon={Settings} size="lg" loading={loading}>
			<ScrollArea className="max-h-[60vh]">
				<div className="space-y-4 pr-4">
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<UserPlus className="h-4 w-4" />
								用户注册设置
							</CardTitle>
							<CardDescription>控制是否允许新用户注册账户</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label htmlFor="allow-registration">允许用户注册</Label>
									<p className="text-sm text-muted-foreground">
										{allowRegistration ? '当前允许新用户注册' : '当前禁止新用户注册'}
									</p>
								</div>
								<div className="flex items-center gap-2">
									{saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
									<Switch id="allow-registration" checked={allowRegistration} onCheckedChange={handleToggle} disabled={saving} />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">关于系统</CardTitle>
							<CardDescription>文档管理系统信息</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">版本</span>
								<span>{APP_INFO.VERSION}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">技术栈</span>
								<span>{APP_INFO.TECH_STACK}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">超级管理员账号</span>
								<span>{APP_INFO.SUPER_ADMIN_EMAIL}</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</ScrollArea>
		</BaseDialog>
	);
}
