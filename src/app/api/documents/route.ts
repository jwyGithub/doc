import { eq, asc, sql } from "drizzle-orm";
import { createDb, documents } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	try {
		await requireAuth();
		const d1 = await getD1Database();
		const db = createDb(d1);

		// 获取分页参数
		const { searchParams } = new URL(request.url);
		const limit = Number(searchParams.get('limit')) || 1000; // 默认1000，兼容现有行为
		const offset = Number(searchParams.get('offset')) || 0;
		const noPagination = searchParams.get('all') === 'true'; // 支持查询所有文档

		if (noPagination) {
			// 保持向后兼容：允许查询所有文档
			const allDocuments = await db
				.select()
				.from(documents)
				.orderBy(asc(documents.order), asc(documents.createdAt));

			return NextResponse.json({ documents: allDocuments });
		}

		// 分页查询文档
		const allDocuments = await db
			.select()
			.from(documents)
			.orderBy(asc(documents.order), asc(documents.createdAt))
			.limit(limit)
			.offset(offset);

		// 查询总数（用于分页）
		const [{ count }] = await db
			.select({ count: sql<number>`count(*)` })
			.from(documents);

		return NextResponse.json({ 
			documents: allDocuments,
			total: count,
			hasMore: offset + limit < count,
			limit,
			offset
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch documents";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

interface CreateDocumentBody {
	title?: string;
	content?: string;
	parentId?: string;
}

export async function POST(request: Request) {
	try {
		const user = await requireAuth();
		const { title, content, parentId } = (await request.json()) as CreateDocumentBody;

		if (!title?.trim()) {
			return NextResponse.json(
				{ error: "Title is required" },
				{ status: 400 }
			);
		}

		const d1 = await getD1Database();
		const db = createDb(d1);

		// 获取最大order
		const siblings = await db
			.select()
			.from(documents)
			.where(
				parentId
					? eq(documents.parentId, parentId)
					: eq(documents.parentId, "")
			);

		const maxOrder = siblings.reduce(
			(max, doc) => Math.max(max, doc.order),
			-1
		);

		const newDoc = {
			id: crypto.randomUUID(),
			title: title.trim(),
			content: content || "",
			parentId: parentId || null,
			order: maxOrder + 1,
			authorId: user.id,
		};

		await db.insert(documents).values(newDoc);

		return NextResponse.json({ document: newDoc }, { status: 201 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create document";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
