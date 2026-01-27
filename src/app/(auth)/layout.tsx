import { redirect } from "next/navigation";
import { isSystemInitialized } from "@/lib/setup";
import { Toaster } from "@/components/ui/sonner";

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// 检查系统是否已初始化
	const initialized = await isSystemInitialized();

	if (!initialized) {
		redirect("/setup");
	}

	return (
		<>
			{children}
			<Toaster position="bottom-right" />
		</>
	);
}
