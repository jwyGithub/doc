'use client';

import { Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from '@/components/ui/sidebar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import { useDialog } from '@/hooks/use-dialog';
import type { User } from '@/db/schema';
import { ThemeToggle } from '../common/theme-toggle';
import {
	AIConfigDialog,
	AIChatDialog,
	UsersDialog,
	SettingsDialog,
	SharesDialog,
	BlobManagerDialog,
	DocumentTree,
	SearchCommand,
} from '@/components/lazy';

interface AppSidebarProps {
	user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
	const pathname = usePathname();
	const router = useRouter();

	const aiConfigDialog = useDialog('aiConfig');
	const aiChatDialog = useDialog('aiChat');
	const usersDialog = useDialog('users');
	const settingsDialog = useDialog('settings');
	const sharesDialog = useDialog('shares');
	const blobManagerDialog = useDialog('blobManager');

	const isAdmin = user.role === 'admin' || user.role === 'superadmin';
	const isSuperAdmin = user.role === 'superadmin';

	const handleSignOut = async () => {
		await signOut();
		router.push('/login');
		router.refresh();
	};

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
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
									<span className="flex-1 text-left truncate">{user.name}</span>
									<ChevronUp className="h-4 w-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent side="top" align="start" className="w-56">
								<div className="px-2 py-1.5">
									<p className="text-sm font-medium">{user.name}</p>
									<p className="text-xs text-muted-foreground">{user.email}</p>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={aiChatDialog.open}>
									<MessageSquare className="mr-2 h-4 w-4" />
									<span>AI 对话</span>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={aiConfigDialog.open}>
									<Sparkles className="mr-2 h-4 w-4" />
									<span>AI 配置</span>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={sharesDialog.open}>
									<Link2 className="mr-2 h-4 w-4" />
									<span>分享管理</span>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={blobManagerDialog.open}>
									<Database className="mr-2 h-4 w-4" />
									<span>Blob 管理</span>
								</DropdownMenuItem>
								{isAdmin && (
									<>
										<DropdownMenuItem onClick={usersDialog.open}>
											<Users className="mr-2 h-4 w-4" />
											<span>用户管理</span>
										</DropdownMenuItem>
										{isSuperAdmin && (
											<DropdownMenuItem onClick={settingsDialog.open}>
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

			{aiChatDialog.isOpen && (
				<Suspense fallback={null}>
					<AIChatDialog open={aiChatDialog.isOpen} onOpenChange={aiChatDialog.setOpen} />
				</Suspense>
			)}
			{aiConfigDialog.isOpen && (
				<Suspense fallback={null}>
					<AIConfigDialog open={aiConfigDialog.isOpen} onOpenChange={aiConfigDialog.setOpen} />
				</Suspense>
			)}
			{usersDialog.isOpen && (
				<Suspense fallback={null}>
					<UsersDialog open={usersDialog.isOpen} onOpenChange={usersDialog.setOpen} />
				</Suspense>
			)}
			{settingsDialog.isOpen && (
				<Suspense fallback={null}>
					<SettingsDialog open={settingsDialog.isOpen} onOpenChange={settingsDialog.setOpen} />
				</Suspense>
			)}
			{sharesDialog.isOpen && (
				<Suspense fallback={null}>
					<SharesDialog open={sharesDialog.isOpen} onOpenChange={sharesDialog.setOpen} />
				</Suspense>
			)}
			{blobManagerDialog.isOpen && (
				<Suspense fallback={null}>
					<BlobManagerDialog open={blobManagerDialog.isOpen} onOpenChange={blobManagerDialog.setOpen} />
				</Suspense>
			)}
		</Sidebar>
	);
}
