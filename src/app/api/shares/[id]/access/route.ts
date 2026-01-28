import { eq } from "drizzle-orm";
import { createDb, shares, documents } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { NextResponse } from "next/server";

interface RouteParams {
	params: Promise<{ id: string }>;
}

interface AccessBody {
	password?: string;
}

// 公开访问分享文档（不需要登录）
export async function POST(request: Request, { params }: RouteParams) {
	try {
		const { id } = await params;
		const body = (await request.json().catch(() => ({}))) as AccessBody;
		const { password } = body;

		const d1 = await getD1Database();
		const db = createDb(d1);

		// 获取分享信息
		const [share] = await db
			.select()
			.from(shares)
			.where(eq(shares.id, id))
			.limit(1);

		if (!share) {
			return NextResponse.json({ error: "分享链接不存在" }, { status: 404 });
		}

		// 检查是否过期
		if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
			return NextResponse.json({ error: "分享链接已过期" }, { status: 410 });
		}

		// 检查密码
		if (share.password) {
			if (!password) {
				return NextResponse.json(
					{ error: "需要输入访问密码", requirePassword: true },
					{ status: 401 }
				);
			}
			if (password !== share.password) {
				return NextResponse.json(
					{ error: "访问密码错误", requirePassword: true },
					{ status: 401 }
				);
			}
		}

		// 获取文档内容
		const [doc] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, share.documentId))
			.limit(1);

		if (!doc) {
			return NextResponse.json({ error: "文档不存在" }, { status: 404 });
		}

		// 更新访问计数
		await db
			.update(shares)
			.set({
				viewCount: share.viewCount + 1,
				updatedAt: new Date(),
			})
			.where(eq(shares.id, id));

		return NextResponse.json({
			document: {
				title: doc.title,
				content: doc.content,
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "访问分享文档失败";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

// 检查分享状态（是否需要密码、是否过期）
export async function GET(_request: Request, { params }: RouteParams) {
	try {
		const { id } = await params;

		const d1 = await getD1Database();
		const db = createDb(d1);

		const [share] = await db
			.select({
				id: shares.id,
				hasPassword: shares.password,
				expiresAt: shares.expiresAt,
				documentId: shares.documentId,
			})
			.from(shares)
			.where(eq(shares.id, id))
			.limit(1);

		if (!share) {
			return NextResponse.json({ error: "分享链接不存在" }, { status: 404 });
		}

		// 检查是否过期
		const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();

		// 获取文档标题
		const [doc] = await db
			.select({ title: documents.title })
			.from(documents)
			.where(eq(documents.id, share.documentId))
			.limit(1);

		return NextResponse.json({
			id: share.id,
			requirePassword: !!share.hasPassword,
			isExpired,
			documentTitle: doc?.title || "未知文档",
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "获取分享状态失败";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
