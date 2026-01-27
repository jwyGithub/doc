import { getD1Database } from "@/lib/cloudflare";
import { createDb } from "@/db";
import { users, settings } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { createAuth } from "@/lib/auth";

interface SetupRequestBody {
	email: string;
	password: string;
	name: string;
}

/**
 * 系统初始化 - 创建超级管理员
 */
export async function POST(request: Request) {
	try {
		const d1 = await getD1Database();
		const db = createDb(d1);

		// 检查是否已存在管理员
		const existingAdmin = await db.query.users.findFirst({
			where: or(
				eq(users.role, "superadmin"),
				eq(users.role, "admin")
			),
		});

		if (existingAdmin) {
			return Response.json(
				{ error: "系统已初始化，无法重复创建超级管理员" },
				{ status: 400 }
			);
		}

		const body = (await request.json()) as SetupRequestBody;
		const { email, password, name } = body;

		// 验证输入
		if (!email || !password || !name) {
			return Response.json(
				{ error: "请填写完整信息" },
				{ status: 400 }
			);
		}

		// 验证邮箱格式
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return Response.json(
				{ error: "邮箱格式不正确" },
				{ status: 400 }
			);
		}

		// 验证密码长度
		if (password.length < 8) {
			return Response.json(
				{ error: "密码长度至少为8位" },
				{ status: 400 }
			);
		}

		// 使用 better-auth 创建用户
		const auth = createAuth(d1);
		const result = await auth.api.signUpEmail({
			body: {
				email,
				password,
				name,
			},
		});

		if (!result || !result.user) {
			return Response.json(
				{ error: "创建用户失败" },
				{ status: 500 }
			);
		}

		// 更新用户角色为超级管理员
		await db
			.update(users)
			.set({ role: "superadmin" })
			.where(eq(users.id, result.user.id));

		// 初始化系统设置
		const existingSettings = await db.query.settings.findFirst({
			where: eq(settings.key, "allow_registration"),
		});

		if (!existingSettings) {
			await db.insert(settings).values({
				id: crypto.randomUUID(),
				key: "allow_registration",
				value: "false", // 默认关闭注册
			});
		}

		return Response.json({
			success: true,
			message: "系统初始化成功",
			user: {
				id: result.user.id,
				email: result.user.email,
				name: result.user.name,
			},
		});
	} catch (error) {
		console.error("Setup failed:", error);
		const message = error instanceof Error ? error.message : "系统初始化失败";
		return Response.json({ error: message }, { status: 500 });
	}
}
