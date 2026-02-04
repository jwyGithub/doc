'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from '@/hooks/use-form';
import { useAsync } from '@/hooks/use-async';
import { validatePassword, validatePasswordMatch } from '@/lib/password';
import { setupService } from '@/services';
import { SubmitButton } from '@/components/common/submit-button';

export default function SetupPage() {
	const router = useRouter();
	const form = useForm({ name: '', email: '', password: '', confirmPassword: '' });
	const [isLoading, setIsLoading] = useState(false);

	const { data: status, loading: isChecking } = useAsync(() => setupService.getStatus(), { immediate: true });

	const isInitialized = status?.initialized ?? false;

	useEffect(() => {
		if (isInitialized) {
			setTimeout(() => {
				router.push('/login');
			}, 3000);
		}
	}, [isInitialized, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!form.values.email || !form.values.password || !form.values.name) {
			toast.error('请填写完整信息');
			return;
		}

		const matchValidation = validatePasswordMatch(form.values.password, form.values.confirmPassword);
		if (!matchValidation.valid) {
			toast.error(matchValidation.message!);
			return;
		}

		const lengthValidation = validatePassword(form.values.password);
		if (!lengthValidation.valid) {
			toast.error(lengthValidation.message!);
			return;
		}

		setIsLoading(true);

		try {
			await setupService.init({
				email: form.values.email,
				password: form.values.password,
				name: form.values.name,
			});

			toast.success('系统初始化成功！正在跳转到登录页...');
			setTimeout(() => {
				router.push('/login');
			}, 1500);
		} catch (error) {
			const message = error instanceof Error ? error.message : '初始化失败';
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	};

	if (isChecking) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-muted-foreground">正在检查系统状态...</p>
				</div>
			</div>
		);
	}

	if (isInitialized) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
							<CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
						</div>
						<CardTitle>系统已初始化</CardTitle>
						<CardDescription>超级管理员账号已存在，正在跳转到登录页面...</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
						<Shield className="h-6 w-6 text-primary" />
					</div>
					<CardTitle className="text-2xl">系统初始化</CardTitle>
					<CardDescription>首次使用请创建超级管理员账号</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">管理员名称</Label>
							<Input
								id="name"
								type="text"
								placeholder="请输入名称"
								value={form.values.name}
								onChange={(e) => form.setValue('name', e.target.value)}
								disabled={isLoading}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">邮箱地址</Label>
							<Input
								id="email"
								type="email"
								placeholder="admin@example.com"
								value={form.values.email}
								onChange={(e) => form.setValue('email', e.target.value)}
								disabled={isLoading}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">密码</Label>
							<Input
								id="password"
								type="password"
								placeholder="至少8位字符"
								value={form.values.password}
								onChange={(e) => form.setValue('password', e.target.value)}
								disabled={isLoading}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">确认密码</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="再次输入密码"
								value={form.values.confirmPassword}
								onChange={(e) => form.setValue('confirmPassword', e.target.value)}
								disabled={isLoading}
								required
							/>
						</div>
						<SubmitButton type="submit" className="w-full" loading={isLoading} loadingText="初始化中...">
							创建超级管理员
						</SubmitButton>
					</form>
					<p className="mt-4 text-center text-xs text-muted-foreground">创建后可在系统设置中管理用户注册权限</p>
				</CardContent>
			</Card>
		</div>
	);
}
