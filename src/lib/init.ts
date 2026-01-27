import { eq } from "drizzle-orm";
import { createDb } from "@/db";
import { settings } from "@/db/schema";

/**
 * 检查是否允许用户注册
 */
export async function isRegistrationAllowed(d1: D1Database): Promise<boolean> {
	const db = createDb(d1);
	const setting = await db
		.select()
		.from(settings)
		.where(eq(settings.key, "allow_registration"))
		.limit(1);

	if (setting.length === 0) {
		return false; // 默认不允许注册，需要管理员开启
	}

	return setting[0].value === "true";
}

/**
 * 设置是否允许用户注册
 */
export async function setRegistrationAllowed(
	d1: D1Database,
	allowed: boolean
): Promise<void> {
	const db = createDb(d1);
	const existing = await db
		.select()
		.from(settings)
		.where(eq(settings.key, "allow_registration"))
		.limit(1);

	if (existing.length === 0) {
		await db.insert(settings).values({
			id: crypto.randomUUID(),
			key: "allow_registration",
			value: allowed ? "true" : "false",
		});
	} else {
		await db
			.update(settings)
			.set({ value: allowed ? "true" : "false", updatedAt: new Date() })
			.where(eq(settings.key, "allow_registration"));
	}
}
