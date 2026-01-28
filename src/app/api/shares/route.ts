import { eq, desc } from "drizzle-orm";
import { createDb, shares, documents, users } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

// 获取当前用户的所有分享
export async function GET() {
	try {
		const user = await requireAuth();
		const d1 = await getD1Database();
		const db = createDb(d1);

		const userShares = await db
			.select({
				id: shares.id,
				documentId: shares.documentId,
				documentTitle: documents.title,
				password: shares.password,
				expiresAt: shares.expiresAt,
				viewCount: shares.viewCount,
				createdAt: shares.createdAt,
				userName: users.name,
			})
			.from(shares)
			.leftJoin(documents, eq(shares.documentId, documents.id))
			.leftJoin(users, eq(shares.userId, users.id))
			.where(eq(shares.userId, user.id))
			.orderBy(desc(shares.createdAt));

		return NextResponse.json({ shares: userShares });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "获取分享列表失败";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

interface CreateShareBody {
	documentId: string;
	password?: string;
	expiresAt?: string; // ISO date string
}

// 创建新分享
export async function POST(request: Request) {
	try {
		const user = await requireAuth();
		const { documentId, password, expiresAt } =
			(await request.json()) as CreateShareBody;

		if (!documentId) {
			return NextResponse.json(
				{ error: "文档ID不能为空" },
				{ status: 400 }
			);
		}

		const d1 = await getD1Database();
		const db = createDb(d1);

		// 检查文档是否存在
		const [doc] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, documentId))
			.limit(1);

		if (!doc) {
			return NextResponse.json({ error: "文档不存在" }, { status: 404 });
		}

		// 检查是否已经存在相同文档的分享
		const [existingShare] = await db
			.select()
			.from(shares)
			.where(eq(shares.documentId, documentId))
			.limit(1);

		if (existingShare) {
			// 更新现有分享
			const updatedShare = {
				password: password || null,
				expiresAt: expiresAt ? new Date(expiresAt) : null,
				updatedAt: new Date(),
			};

			await db
				.update(shares)
				.set(updatedShare)
				.where(eq(shares.id, existingShare.id));

			return NextResponse.json({
				share: { ...existingShare, ...updatedShare },
				updated: true,
			});
		}

		// 创建新分享
		const newShare = {
			id: crypto.randomUUID(),
			documentId,
			userId: user.id,
			password: password || null,
			expiresAt: expiresAt ? new Date(expiresAt) : null,
			viewCount: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await db.insert(shares).values(newShare);

		return NextResponse.json({ share: newShare }, { status: 201 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "创建分享失败";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
