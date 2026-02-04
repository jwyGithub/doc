'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2 } from 'lucide-react';
import { useForm } from '@/hooks/use-form';
import { useAsync } from '@/hooks/use-async';
import { validatePassword, validatePasswordMatch } from '@/lib/password';
import { settingsService } from '@/services';
import { SubmitButton } from '@/components/common/submit-button';
import { LoadingState } from '@/components/common/loading-state';

export default function RegisterPage() {
	const router = useRouter();
	const form = useForm({ name: '', email: '', password: '', confirmPassword: '' });
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const { data: settings, loading: checkingAllowed } = useAsync(() => settingsService.getRegistration(), { immediate: true });

	const isAllowed = settings?.allowRegistration ?? false;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		const passwordValidation = validatePasswordMatch(form.values.password, form.values.confirmPassword);
		if (!passwordValidation.valid) {
			setError(passwordValidation.message!);
			return;
		}

		const lengthValidation = validatePassword(form.values.password);
		if (!lengthValidation.valid) {
			setError(lengthValidation.message!);
			return;
		}

		setIsLoading(true);

		try {
			const result = await signUp.email({
				email: form.values.email,
				password: form.values.password,
				name: form.values.name,
			});

			if (result.error) {
				setError(result.error.message || '注册失败，请稍后重试');
			} else {
				router.push('/');
				router.refresh();
			}
		} catch {
			setError('注册失败，请稍后重试');
		} finally {
			setIsLoading(false);
		}
	};

	if (checkingAllowed) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!isAllowed) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
				<Card className="w-full max-w-md shadow-lg">
					<CardHeader className="space-y-1 text-center">
						<div className="flex justify-center mb-4">
							<div className="p-3 rounded-full bg-destructive/10">
								<FileText className="w-8 h-8 text-destructive" />
							</div>
						</div>
						<CardTitle className="text-2xl font-bold">注册已关闭</CardTitle>
						<CardDescription>管理员已关闭新用户注册功能</CardDescription>
					</CardHeader>
					<CardFooter className="flex justify-center">
						<Link href="/login">
							<Button variant="outline">返回登录</Button>
						</Link>
					</CardFooter>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
			<Card className="w-full max-w-md shadow-lg animate-in fade-in-50 slide-in-from-bottom-10 duration-500">
				<CardHeader className="space-y-1 text-center">
					<div className="flex justify-center mb-4">
						<div className="p-3 rounded-full bg-primary/10">
							<FileText className="w-8 h-8 text-primary" />
						</div>
					</div>
					<CardTitle className="text-2xl font-bold">创建账户</CardTitle>
					<CardDescription>注册一个新的文档管理账户</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md animate-in fade-in-50">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="name">用户名</Label>
							<Input
								id="name"
								type="text"
								placeholder="请输入用户名"
								value={form.values.name}
								onChange={(e) => form.setValue('name', e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">邮箱</Label>
							<Input
								id="email"
								type="email"
								placeholder="请输入邮箱"
								value={form.values.email}
								onChange={(e) => form.setValue('email', e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">密码</Label>
							<Input
								id="password"
								type="password"
								placeholder="请输入密码（至少8位）"
								value={form.values.password}
								onChange={(e) => form.setValue('password', e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">确认密码</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="请再次输入密码"
								value={form.values.confirmPassword}
								onChange={(e) => form.setValue('confirmPassword', e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4 pt-6">
						<SubmitButton type="submit" className="w-full" loading={isLoading} loadingText="注册中...">
							注册
						</SubmitButton>
						<p className="text-sm text-center text-muted-foreground">
							已有账户？{' '}
							<Link href="/login" className="text-primary hover:underline font-medium">
								立即登录
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
