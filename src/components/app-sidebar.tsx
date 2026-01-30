"use client";

import { useState, lazy, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	FileText,
	Users,
	Settings,
	LogOut,
	ChevronUp,
	Plus,
	FolderOpen,
	Sparkles,
	Link2,
	MessageSquare,
	Database,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import type { User } from "@/db/schema";
import { DocumentTree } from "./document-tree";
import { ThemeToggle } from "./theme-toggle";
import { UsersDialog } from "./users-dialog";
import { SettingsDialog } from "./settings-dialog";
import { SharesDialog } from "./shares-dialog";
import { BlobManagerDialog } from "./blob-manager-dialog";

// 延迟加载 AI 配置对话框
const AIConfigDialog = lazy(() => import("./ai-config-dialog").then(mod => ({ default: mod.AIConfigDialog })));
// 延迟加载 AI 对话框
const AIChatDialog = lazy(() => import("./ai-chat-dialog").then(mod => ({ default: mod.AIChatDialog })));

interface AppSidebarProps {
	user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [showAIConfig, setShowAIConfig] = useState(false);
	const [showAIChat, setShowAIChat] = useState(false);
	const [showUsers, setShowUsers] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showShares, setShowShares] = useState(false);
	const [showBlobManager, setShowBlobManager] = useState(false);
	const isAdmin = user.role === "admin" || user.role === "superadmin";
	const isSuperAdmin = user.role === "superadmin";

	const handleSignOut = async () => {
		await signOut();
		router.push("/login");
		router.refresh();
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<Sidebar className="border-r">
			<SidebarHeader className="border-b px-4 py-3">
				<div className="flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<div className="p-1.5 rounded-md bg-primary">
							<FileText className="h-5 w-5 text-primary-foreground" />
						</div>
						<span className="font-semibold text-lg">文档管理</span>
					</Link>
					<ThemeToggle />
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<FolderOpen className="h-4 w-4" />
							文档列表
						</span>
						<Link href="/documents/new">
							<Button variant="ghost" size="icon" className="h-6 w-6">
								<Plus className="h-4 w-4" />
							</Button>
						</Link>
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<DocumentTree currentPath={pathname} />
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton className="w-full">
									<Avatar className="h-6 w-6">
										<AvatarFallback className="text-xs">
											{getInitials(user.name)}
										</AvatarFallback>
									</Avatar>
									<span className="flex-1 text-left truncate">
										{user.name}
									</span>
									<ChevronUp className="h-4 w-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="top"
								align="start"
								className="w-56"
							>
								<div className="px-2 py-1.5">
									<p className="text-sm font-medium">{user.name}</p>
									<p className="text-xs text-muted-foreground">
										{user.email}
									</p>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => setShowAIChat(true)}>
									<MessageSquare className="mr-2 h-4 w-4" />
									<span>AI 对话</span>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setShowAIConfig(true)}>
									<Sparkles className="mr-2 h-4 w-4" />
									<span>AI 配置</span>
								</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setShowShares(true)}>
								<Link2 className="mr-2 h-4 w-4" />
								<span>分享管理</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setShowBlobManager(true)}>
								<Database className="mr-2 h-4 w-4" />
								<span>Blob 管理</span>
							</DropdownMenuItem>
							{isAdmin && (
									<>
										<DropdownMenuItem onClick={() => setShowUsers(true)}>
											<Users className="mr-2 h-4 w-4" />
											<span>用户管理</span>
										</DropdownMenuItem>
										{isSuperAdmin && (
											<DropdownMenuItem onClick={() => setShowSettings(true)}>
												<Settings className="mr-2 h-4 w-4" />
												<span>系统设置</span>
											</DropdownMenuItem>
										)}
									</>
								)}
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleSignOut}>
									<LogOut className="mr-2 h-4 w-4" />
									<span>退出登录</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

		{showAIChat && (
			<Suspense fallback={null}>
				<AIChatDialog open={showAIChat} onOpenChange={setShowAIChat} />
			</Suspense>
		)}
		{showAIConfig && (
			<Suspense fallback={null}>
				<AIConfigDialog open={showAIConfig} onOpenChange={setShowAIConfig} />
			</Suspense>
		)}
		<UsersDialog open={showUsers} onOpenChange={setShowUsers} />
		<SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
		<SharesDialog open={showShares} onOpenChange={setShowShares} />
		<BlobManagerDialog open={showBlobManager} onOpenChange={setShowBlobManager} />
		</Sidebar>
	);
}
