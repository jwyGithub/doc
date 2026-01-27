import { headers } from "next/headers";
import { createAuth } from "./auth";
import { getD1Database } from "./cloudflare";
import type { User } from "@/db/schema";

export async function getServerSession() {
	const db = await getD1Database();
	const auth = createAuth(db);
	const headersList = await headers();
	const session = await auth.api.getSession({
		headers: headersList,
	});
	return session;
}

export async function getCurrentUser(): Promise<User | null> {
	const session = await getServerSession();
	if (!session?.user) {
		return null;
	}
	return session.user as User;
}

export async function requireAuth(): Promise<User> {
	const user = await getCurrentUser();
	if (!user) {
		throw new Error("Unauthorized");
	}
	return user;
}

export async function requireAdmin(): Promise<User> {
	const user = await requireAuth();
	if (user.role !== "admin" && user.role !== "superadmin") {
		throw new Error("Forbidden: Admin access required");
	}
	return user;
}

export async function requireSuperAdmin(): Promise<User> {
	const user = await requireAuth();
	if (user.role !== "superadmin") {
		throw new Error("Forbidden: Super admin access required");
	}
	return user;
}

export function isSuperAdmin(user: User | null): boolean {
	return user?.role === "superadmin";
}

export function isAdmin(user: User | null): boolean {
	return user?.role === "admin" || user?.role === "superadmin";
}
