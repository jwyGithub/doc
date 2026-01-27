import { eq } from "drizzle-orm";
import { createDb, documents } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";

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
			return Response.json(
				{ error: "Document not found" },
				{ status: 404 }
			);
		}

		return Response.json({ document: doc });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch document";
		return Response.json({ error: message }, { status: 500 });
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
			return Response.json(
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

		return Response.json({ document: updated });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update document";
		return Response.json({ error: message }, { status: 500 });
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
		const db = createDb(d1);

		const [existing] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, id))
			.limit(1);

		if (!existing) {
			return Response.json(
				{ error: "Document not found" },
				{ status: 404 }
			);
		}

		// 递归删除子文档
		const deleteRecursive = async (docId: string) => {
			const children = await db
				.select()
				.from(documents)
				.where(eq(documents.parentId, docId));

			for (const child of children) {
				await deleteRecursive(child.id);
			}

			await db.delete(documents).where(eq(documents.id, docId));
		};

		await deleteRecursive(id);

		return Response.json({ success: true });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to delete document";
		return Response.json({ error: message }, { status: 500 });
	}
}
