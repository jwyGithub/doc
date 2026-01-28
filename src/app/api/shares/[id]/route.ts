import { eq, and } from "drizzle-orm";
import { createDb, shares } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

interface RouteParams {
	params: Promise<{ id: string }>;
}

// 删除分享
export async function DELETE(_request: Request, { params }: RouteParams) {
	try {
		const user = await requireAuth();
		const { id } = await params;

		const d1 = await getD1Database();
		const db = createDb(d1);

		// 检查分享是否存在且属于当前用户
		const [share] = await db
			.select()
			.from(shares)
			.where(and(eq(shares.id, id), eq(shares.userId, user.id)))
			.limit(1);

		if (!share) {
			return NextResponse.json(
				{ error: "分享不存在或无权限删除" },
				{ status: 404 }
			);
		}

		await db.delete(shares).where(eq(shares.id, id));

		return NextResponse.json({ success: true });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "删除分享失败";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

// 获取单个分享信息（用于查看分享设置）
export async function GET(_request: Request, { params }: RouteParams) {
	try {
		const user = await requireAuth();
		const { id } = await params;

		const d1 = await getD1Database();
		const db = createDb(d1);

		const [share] = await db
			.select()
			.from(shares)
			.where(and(eq(shares.id, id), eq(shares.userId, user.id)))
			.limit(1);

		if (!share) {
			return NextResponse.json(
				{ error: "分享不存在或无权限查看" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ share });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "获取分享信息失败";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
