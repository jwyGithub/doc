'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useForm } from '@/hooks/use-form';
import { encodeCredentials, decodeCredentials, loadFromStorage, saveToStorage, removeFromStorage } from '@/lib/storage';
import { STORAGE_KEYS } from '@/constants';
import { SubmitButton } from '@/components/common/submit-button';

export default function LoginPage() {
	const router = useRouter();
	const form = useForm({ email: '', password: '', rememberMe: false });
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const saved = loadFromStorage(STORAGE_KEYS.REMEMBER_CREDENTIALS, '');
		if (saved) {
			const credentials = decodeCredentials(saved);
			if (credentials) {
				form.setValues({
					email: credentials.email,
					password: credentials.password,
					rememberMe: true,
				});
			}
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			const result = await signIn.email({
				email: form.values.email,
				password: form.values.password,
			});

			if (result.error) {
				setError(result.error.message || '登录失败，请检查邮箱和密码');
			} else {
				if (form.values.rememberMe) {
					saveToStorage(STORAGE_KEYS.REMEMBER_CREDENTIALS, encodeCredentials(form.values.email, form.values.password));
				} else {
					removeFromStorage(STORAGE_KEYS.REMEMBER_CREDENTIALS);
				}
				router.push('/');
				router.refresh();
			}
		} catch {
			setError('登录失败，请稍后重试');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
			<Card className="w-full max-w-md shadow-lg animate-in fade-in-50 slide-in-from-bottom-10 duration-500">
				<CardHeader className="space-y-1 text-center">
					<div className="flex justify-center mb-4">
						<div className="p-3 rounded-full bg-primary/10">
							<FileText className="w-8 h-8 text-primary" />
						</div>
					</div>
					<CardTitle className="text-2xl font-bold">欢迎回来</CardTitle>
					<CardDescription>登录您的文档管理账户</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md animate-in fade-in-50">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="email">用户名/邮箱</Label>
							<Input
								id="email"
								type="text"
								placeholder="请输入用户名或邮箱"
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
								placeholder="请输入密码"
								value={form.values.password}
								onChange={(e) => form.setValue('password', e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="remember"
								checked={form.values.rememberMe as boolean}
								onCheckedChange={(checked) => form.setValue('rememberMe', checked === true)}
								disabled={isLoading}
							/>
							<Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
								记住账号密码
							</Label>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4 pt-6">
						<SubmitButton type="submit" className="w-full" loading={isLoading} loadingText="登录中...">
							登录
						</SubmitButton>
						<p className="text-sm text-center text-muted-foreground">
							还没有账户？{' '}
							<Link href="/register" className="text-primary hover:underline font-medium">
								立即注册
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
