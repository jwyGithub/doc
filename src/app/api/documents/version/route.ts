import { getD1Database } from "@/lib/cloudflare";
import { createDb } from "@/db";
import { documents, settings } from "@/db/schema";
import { eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * 获取文档版本号
 * 版本号基于：1. settings 中的 doc_version 2. 最新文档的更新时间
 */
export async function GET() {
	try {
		const d1 = await getD1Database();
		const db = createDb(d1);

		// 获取 settings 中的版本号
		const versionSetting = await db.query.settings.findFirst({
			where: eq(settings.key, "doc_version"),
		});

		// 获取最新文档的更新时间
		const latestDoc = await db
			.select({ maxUpdated: max(documents.updatedAt) })
			.from(documents);

		const settingVersion = versionSetting
			? parseInt(versionSetting.value, 10)
			: 0;
		const latestUpdate = latestDoc[0]?.maxUpdated
			? new Date(latestDoc[0].maxUpdated).getTime()
			: 0;

		// 取两者的最大值作为版本号
		const version = Math.max(settingVersion, latestUpdate);

		return NextResponse.json({ version });
	} catch (error) {
		console.error("Failed to get document version:", error);
		// 出错时返回当前时间戳，强制客户端刷新
		return NextResponse.json({ version: Date.now() });
	}
}
