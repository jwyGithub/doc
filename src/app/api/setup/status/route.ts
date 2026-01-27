import { NextResponse } from "next/server";
import { getD1Database } from "@/lib/cloudflare";
import { createDb } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * 检查系统是否已完成初始化（是否存在超级管理员）
 */
export async function GET() {
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

		return NextResponse.json({
			initialized: !!adminUser,
			message: adminUser ? "系统已初始化" : "系统未初始化，请创建超级管理员",
		});
	} catch (error) {
		console.error("Failed to check setup status:", error);
		// 数据库可能还没创建，返回未初始化状态
		return NextResponse.json({
			initialized: false,
			message: "系统未初始化",
		});
	}
}
