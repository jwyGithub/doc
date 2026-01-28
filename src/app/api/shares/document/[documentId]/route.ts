import { eq } from "drizzle-orm";
import { createDb, shares } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

interface RouteParams {
	params: Promise<{ documentId: string }>;
}

// 获取特定文档的分享信息
export async function GET(_request: Request, { params }: RouteParams) {
	try {
		await requireAuth();
		const { documentId } = await params;

		const d1 = await getD1Database();
		const db = createDb(d1);

		const [share] = await db
			.select()
			.from(shares)
			.where(eq(shares.documentId, documentId))
			.limit(1);

		return NextResponse.json({ share: share || null });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "获取分享信息失败";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
