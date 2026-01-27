import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { createDb, documents } from "@/db";
import { getD1Database } from "@/lib/cloudflare";
import { requireAuth } from "@/lib/session";
import { DocumentViewer } from "@/components/document-viewer";

interface Props {
	params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
	const { id } = await params;
	
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

		return <DocumentViewer document={document} />;
	} catch {
		notFound();
	}
}
