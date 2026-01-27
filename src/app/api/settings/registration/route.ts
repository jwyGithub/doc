import { NextResponse } from "next/server";
import { getD1Database } from "@/lib/cloudflare";
import { isRegistrationAllowed, setRegistrationAllowed } from "@/lib/init";
import { requireSuperAdmin } from "@/lib/session";

export async function GET() {
	try {
		const db = await getD1Database();
		const allowed = await isRegistrationAllowed(db);
		return NextResponse.json({ allowed });
	} catch {
		return NextResponse.json({ allowed: true });
	}
}

interface UpdateRegistrationBody {
	allowed: boolean;
}

export async function POST(request: Request) {
	try {
		await requireSuperAdmin();
		const { allowed } = (await request.json()) as UpdateRegistrationBody;
		const db = await getD1Database();
		await setRegistrationAllowed(db, allowed);
		return NextResponse.json({ success: true, allowed });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update settings";
		return NextResponse.json({ error: message }, { status: 403 });
	}
}
