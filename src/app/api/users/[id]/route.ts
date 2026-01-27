import { eq } from "drizzle-orm";
import { createDb, users, sessions, accounts, documents } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAdmin, getCurrentUser } from "@/lib/session";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await requireAdmin();
		const { id } = await params;
		const d1 = await getD1Database();
		const db = createDb(d1);

		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
				role: users.role,
				createdAt: users.createdAt,
			})
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		if (!user) {
			return Response.json({ error: "User not found" }, { status: 404 });
		}

		return Response.json({ user });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch user";
		return Response.json({ error: message }, { status: 403 });
	}
}

interface UpdateUserBody {
	name?: string;
	role?: "user" | "admin" | "superadmin";
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const currentUser = await requireAdmin();
		const { id } = await params;
		const { name, role } = (await request.json()) as UpdateUserBody;

		const d1 = await getD1Database();
		const db = createDb(d1);

		const [targetUser] = await db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		if (!targetUser) {
			return Response.json({ error: "User not found" }, { status: 404 });
		}

		// 不能修改超级管理员的角色（除非自己是超级管理员）
		if (
			targetUser.role === "superadmin" &&
			currentUser.role !== "superadmin"
		) {
			return Response.json(
				{ error: "Cannot modify super admin" },
				{ status: 403 }
			);
		}

		// 只有超级管理员才能设置管理员角色
		if (role === "admin" && currentUser.role !== "superadmin") {
			return Response.json(
				{ error: "Only super admin can set admin role" },
				{ status: 403 }
			);
		}

		// 不能将自己降级
		if (currentUser.id === id && role && role !== currentUser.role) {
			return Response.json(
				{ error: "Cannot change your own role" },
				{ status: 403 }
			);
		}

		const updates: Partial<typeof users.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (name !== undefined) updates.name = name.trim();
		if (role !== undefined && currentUser.role === "superadmin") {
			updates.role = role;
		}

		await db.update(users).set(updates).where(eq(users.id, id));

		const [updated] = await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
				role: users.role,
				createdAt: users.createdAt,
			})
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		return Response.json({ user: updated });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update user";
		return Response.json({ error: message }, { status: 403 });
	}
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const currentUser = await requireAdmin();
		const { id } = await params;

		if (currentUser.id === id) {
			return Response.json(
				{ error: "Cannot delete yourself" },
				{ status: 403 }
			);
		}

		const d1 = await getD1Database();
		const db = createDb(d1);

		const [targetUser] = await db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		if (!targetUser) {
			return Response.json({ error: "User not found" }, { status: 404 });
		}

		// 不能删除超级管理员
		if (targetUser.role === "superadmin") {
			return Response.json(
				{ error: "Cannot delete super admin" },
				{ status: 403 }
			);
		}

		// 只有超级管理员能删除管理员
		if (targetUser.role === "admin" && currentUser.role !== "superadmin") {
			return Response.json(
				{ error: "Only super admin can delete admin" },
				{ status: 403 }
			);
		}

		// 删除用户相关数据
		await db.delete(sessions).where(eq(sessions.userId, id));
		await db.delete(accounts).where(eq(accounts.userId, id));
		await db.delete(documents).where(eq(documents.authorId, id));
		await db.delete(users).where(eq(users.id, id));

		return Response.json({ success: true });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to delete user";
		return Response.json({ error: message }, { status: 403 });
	}
}
