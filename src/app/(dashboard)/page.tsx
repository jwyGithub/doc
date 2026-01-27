import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function HomePage() {
	return (
		<div className="flex flex-col h-full">
			<header className="flex h-14 items-center gap-4 border-b px-6">
				<SidebarTrigger />
				<h1 className="font-semibold">欢迎</h1>
			</header>
			<main className="flex-1 flex items-center justify-center p-6">
				<div className="text-center space-y-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-10 duration-500">
					<div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
						<FileText className="h-12 w-12 text-primary" />
					</div>
					<div className="space-y-2">
						<h2 className="text-2xl font-bold">欢迎使用文档管理系统</h2>
						<p className="text-muted-foreground">
							从左侧选择一个文档开始阅读，或者创建一个新文档
						</p>
					</div>
					<Link href="/documents/new">
						<Button size="lg" className="gap-2">
							<Plus className="h-5 w-5" />
							创建新文档
						</Button>
					</Link>
				</div>
			</main>
		</div>
	);
}
