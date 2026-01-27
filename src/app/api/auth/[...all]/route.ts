import { createAuth } from "@/lib/auth";
import { getD1Database } from "@/lib/cloudflare";
import { toNextJsHandler } from "better-auth/next-js";

async function getHandler() {
	const db = await getD1Database();
	const auth = createAuth(db);
	return toNextJsHandler(auth);
}

export async function GET(request: Request) {
	const handler = await getHandler();
	return handler.GET(request);
}

export async function POST(request: Request) {
	const handler = await getHandler();
	return handler.POST(request);
}
