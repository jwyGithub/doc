"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

	useEffect(() => {
		// 检查是否允许注册
		const checkRegistration = async () => {
			try {
				const res = await fetch("/api/settings/registration");
				const data = (await res.json()) as { allowed: boolean };
				setIsAllowed(data.allowed);
			} catch {
				setIsAllowed(false);
			}
		};
		checkRegistration();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("两次输入的密码不一致");
			return;
		}

		if (password.length < 8) {
			setError("密码长度至少为8位");
			return;
		}

		setIsLoading(true);

		try {
			const result = await signUp.email({
				email,
				password,
				name,
			});

			if (result.error) {
				setError(result.error.message || "注册失败，请稍后重试");
			} else {
				router.push("/");
				router.refresh();
			}
		} catch {
			setError("注册失败，请稍后重试");
		} finally {
			setIsLoading(false);
		}
	};

	if (isAllowed === null) {
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
						<CardDescription>
							管理员已关闭新用户注册功能
						</CardDescription>
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
						{error && (
							<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md animate-in fade-in-50">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">用户名</Label>
							<Input
								id="name"
								type="text"
								placeholder="请输入用户名"
								value={name}
								onChange={(e) => setName(e.target.value)}
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
								placeholder="请输入密码（至少8位）"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
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
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4 pt-6">
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									注册中...
								</>
							) : (
								"注册"
							)}
						</Button>
						<p className="text-sm text-center text-muted-foreground">
							已有账户？{" "}
							<Link
								href="/login"
								className="text-primary hover:underline font-medium"
							>
								立即登录
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
