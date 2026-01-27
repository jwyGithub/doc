import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { createDb, documents } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";
import { DocumentViewer } from "@/components/document-viewer";

interface Props {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ highlight?: string }>;
}

export default async function DocumentPage({ params, searchParams }: Props) {
	const { id } = await params;
	const { highlight } = await searchParams;
	
	try {
		await requireAuth();
		const d1 = await getD1Database();
		const db = createDb(d1);

		const [document] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, id))
			.limit(1);

		if (!document) {
			notFound();
		}

		return <DocumentViewer document={document} highlight={highlight} />;
	} catch {
		notFound();
	}
}
