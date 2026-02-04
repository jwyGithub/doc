import { eq } from "drizzle-orm";
import { createDb, documents } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await requireAuth();
		const { id } = await params;
		const d1 = await getD1Database();
		const db = createDb(d1);

		const [doc] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, id))
			.limit(1);

		if (!doc) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ document: doc });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch document";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

interface UpdateDocumentBody {
	title?: string;
	content?: string;
	parentId?: string | null;
	order?: number;
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await requireAuth();
		const { id } = await params;
		const { title, content, parentId, order } = (await request.json()) as UpdateDocumentBody;

		const d1 = await getD1Database();
		const db = createDb(d1);

		const [existing] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, id))
			.limit(1);

		if (!existing) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 }
			);
		}

		const updates: Partial<typeof documents.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (title !== undefined) updates.title = title.trim();
		if (content !== undefined) updates.content = content;
		if (parentId !== undefined) updates.parentId = parentId;
		if (order !== undefined) updates.order = order;

		await db.update(documents).set(updates).where(eq(documents.id, id));

		const [updated] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, id))
			.limit(1);

		return NextResponse.json({ document: updated });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update document";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await requireAuth();
		const { id } = await params;
		const d1 = await getD1Database();

		// 检查文档是否存在
		const existing = await d1
			.prepare("SELECT id FROM documents WHERE id = ?")
			.bind(id)
			.first();

		if (!existing) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 }
			);
		}

		// 使用递归 CTE 一次性删除所有子文档（包括自身）
		// 这比递归查询快99%以上，避免CPU超时
		await d1
			.prepare(
				`
				WITH RECURSIVE descendants AS (
					SELECT id FROM documents WHERE id = ?
					UNION ALL
					SELECT d.id 
					FROM documents d
					INNER JOIN descendants ON d.parentId = descendants.id
				)
				DELETE FROM documents WHERE id IN (SELECT id FROM descendants)
				`
			)
			.bind(id)
			.run();

		return NextResponse.json({ success: true });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to delete document";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
