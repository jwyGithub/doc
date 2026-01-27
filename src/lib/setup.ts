import { getD1Database } from "@/lib/cloudflare";
import { createDb } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * 检查系统是否已初始化（服务端使用）
 */
export async function isSystemInitialized(): Promise<boolean> {
	try {
		const d1 = await getD1Database();
		const db = createDb(d1);

		// 检查是否存在超级管理员或管理员
		const adminUser = await db.query.users.findFirst({
			where: or(
				eq(users.role, "superadmin"),
				eq(users.role, "admin")
			),
		});

		return !!adminUser;
	} catch (error) {
		console.error("Failed to check system initialization:", error);
		// 出错时返回 false，引导用户去初始化
		return false;
	}
}
