import { NextResponse } from "next/server";
import { desc, ne } from "drizzle-orm";
import { createDb, users } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/session";

export async function GET() {
	try {
		await requireAdmin();
		const d1 = await getD1Database();
		const db = createDb(d1);

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

		return NextResponse.json({ users: allUsers });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch users";
		return NextResponse.json({ error: message }, { status: 403 });
	}
}
