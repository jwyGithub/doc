"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SetupPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isChecking, setIsChecking] = useState(true);
	const [isInitialized, setIsInitialized] = useState(false);

	// 检查系统是否已初始化
	useEffect(() => {
		const checkStatus = async () => {
			try {
				const res = await fetch("/api/setup/status");
				const data = (await res.json()) as { initialized: boolean };
				if (data.initialized) {
					setIsInitialized(true);
					// 已初始化，3秒后跳转到登录页
					setTimeout(() => {
						router.push("/login");
					}, 3000);
				}
			} catch (error) {
				console.error("Failed to check setup status:", error);
			} finally {
				setIsChecking(false);
			}
		};

		checkStatus();
	}, [router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email || !password || !name) {
			toast.error("请填写完整信息");
			return;
		}

		if (password !== confirmPassword) {
			toast.error("两次输入的密码不一致");
			return;
		}

		if (password.length < 8) {
			toast.error("密码长度至少为8位");
			return;
		}

		setIsLoading(true);

		try {
			const res = await fetch("/api/setup/init", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, name }),
			});

			const data = (await res.json()) as { success?: boolean; error?: string };

			if (!res.ok) {
				throw new Error(data.error || "初始化失败");
			}

			toast.success("系统初始化成功！正在跳转到登录页...");
			setTimeout(() => {
				router.push("/login");
			}, 1500);
		} catch (error) {
			const message = error instanceof Error ? error.message : "初始化失败";
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
						<CardDescription>
							超级管理员账号已存在，正在跳转到登录页面...
						</CardDescription>
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
					<CardDescription>
						首次使用请创建超级管理员账号
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">管理员名称</Label>
							<Input
								id="name"
								type="text"
								placeholder="请输入名称"
								value={name}
								onChange={(e) => setName(e.target.value)}
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
								value={email}
								onChange={(e) => setEmail(e.target.value)}
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
								value={password}
								onChange={(e) => setPassword(e.target.value)}
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
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								disabled={isLoading}
								required
							/>
						</div>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									初始化中...
								</>
							) : (
								"创建超级管理员"
							)}
						</Button>
					</form>
					<p className="mt-4 text-center text-xs text-muted-foreground">
						创建后可在系统设置中管理用户注册权限
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
