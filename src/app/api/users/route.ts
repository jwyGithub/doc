import { desc, sql } from "drizzle-orm";
import { createDb, users } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/session";

export async function GET(request: Request) {
	try {
		await requireAdmin();
		const d1 = await getD1Database();
		const db = createDb(d1);

		// 获取分页参数
		const { searchParams } = new URL(request.url);
		const limit = Number(searchParams.get('limit')) || 100; // 默认100个用户
		const offset = Number(searchParams.get('offset')) || 0;
		const noPagination = searchParams.get('all') === 'true'; // 支持查询所有用户

		if (noPagination) {
			// 保持向后兼容：允许查询所有用户
			const allUsers = await db
				.select({
					id: users.id,
					email: users.email,
					name: users.name,
					role: users.role,
					createdAt: users.createdAt,
				})
				.from(users)
				.orderBy(desc(users.createdAt));

			return Response.json({ users: allUsers });
		}

		// 分页查询用户
		const allUsers = await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
				role: users.role,
				createdAt: users.createdAt,
			})
			.from(users)
			.orderBy(desc(users.createdAt))
			.limit(limit)
			.offset(offset);

		// 查询总数
		const [{ count }] = await db
			.select({ count: sql<number>`count(*)` })
			.from(users);

		return Response.json({ 
			users: allUsers,
			total: count,
			hasMore: offset + limit < count,
			limit,
			offset
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch users";
		return Response.json({ error: message }, { status: 403 });
	}
}
