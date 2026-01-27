import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isSystemInitialized } from "@/lib/setup";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { SearchCommand } from "@/components/search-command";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// 检查系统是否已初始化
	const initialized = await isSystemInitialized();

	if (!initialized) {
		redirect("/setup");
	}

	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	return (
		<SidebarProvider>
			<AppSidebar user={user} />
			<SidebarInset className="flex flex-col h-screen max-h-screen overflow-hidden">
				{children}
			</SidebarInset>
			<Toaster position="bottom-right" />
			<SearchCommand />
		</SidebarProvider>
	);
}
