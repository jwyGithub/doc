import { eq, asc } from "drizzle-orm";
import { createDb, documents } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		await requireAuth();
		const d1 = await getD1Database();
		const db = createDb(d1);

		const allDocuments = await db
			.select()
			.from(documents)
			.orderBy(asc(documents.order), asc(documents.createdAt));

		return NextResponse.json({ documents: allDocuments });
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
