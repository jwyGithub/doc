"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";

const STORAGE_KEY = "doc_remember_credentials";

// 简单的编码/解码函数（注意：这不是加密，只是混淆）
function encodeCredentials(email: string, password: string): string {
	return btoa(JSON.stringify({ email, password }));
}

function decodeCredentials(encoded: string): { email: string; password: string } | null {
	try {
		return JSON.parse(atob(encoded)) as { email: string; password: string };
	} catch {
		return null;
	}
}

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [rememberMe, setRememberMe] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// 页面加载时读取保存的凭据
	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const credentials = decodeCredentials(saved);
			if (credentials) {
				setEmail(credentials.email);
				setPassword(credentials.password);
				setRememberMe(true);
			}
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const result = await signIn.email({
				email,
				password,
			});

			if (result.error) {
				setError(result.error.message || "登录失败，请检查邮箱和密码");
			} else {
				// 登录成功，处理记住密码
				if (rememberMe) {
					localStorage.setItem(STORAGE_KEY, encodeCredentials(email, password));
				} else {
					localStorage.removeItem(STORAGE_KEY);
				}
				router.push("/");
				router.refresh();
			}
		} catch {
			setError("登录失败，请稍后重试");
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
						{error && (
							<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md animate-in fade-in-50">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="email">用户名/邮箱</Label>
							<Input
								id="email"
								type="text"
								placeholder="请输入用户名或邮箱"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
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
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="remember"
								checked={rememberMe}
								onCheckedChange={(checked) => setRememberMe(checked === true)}
								disabled={isLoading}
							/>
							<Label
								htmlFor="remember"
								className="text-sm font-normal cursor-pointer"
							>
								记住账号密码
							</Label>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4 pt-6">
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									登录中...
								</>
							) : (
								"登录"
							)}
						</Button>
						<p className="text-sm text-center text-muted-foreground">
							还没有账户？{" "}
							<Link
								href="/register"
								className="text-primary hover:underline font-medium"
							>
								立即注册
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
