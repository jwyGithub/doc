import { NextResponse } from 'next/server';
import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';

const AI_CONFIG_KEY = 'ai_config';

interface AIConfigData {
    apiKey: string;
    model: string;
    systemPrompt: string;
}

// 获取 AI 配置
export async function GET() {
    try {
        const d1 = await getD1Database();
        const db = createDb(d1);

        const result = await db
            .select()
            .from(settings)
            .where(eq(settings.key, AI_CONFIG_KEY))
            .get();

        if (result) {
            const config = JSON.parse(result.value) as AIConfigData;
            // 不返回完整的 apiKey，只返回部分用于显示
            return NextResponse.json({
                apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}...` : '',
                apiKeyConfigured: !!config.apiKey,
                model: config.model,
                systemPrompt: config.systemPrompt
            });
        }

        return NextResponse.json({
            apiKey: '',
            apiKeyConfigured: false,
            model: '',
            systemPrompt: ''
        });
    } catch (error) {
        console.error('Failed to get AI config:', error);
        return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
    }
}

// 保存 AI 配置
export async function POST(request: Request) {
    try {
        const d1 = await getD1Database();
        const db = createDb(d1);

        const body = (await request.json()) as AIConfigData;

        // 如果传入的 apiKey 是遮罩格式（包含...），则保留原有的 apiKey
        let apiKeyToSave = body.apiKey;
        if (body.apiKey?.includes('...')) {
            const existing = await db
                .select()
                .from(settings)
                .where(eq(settings.key, AI_CONFIG_KEY))
                .get();
            if (existing) {
                const existingConfig = JSON.parse(existing.value) as AIConfigData;
                apiKeyToSave = existingConfig.apiKey;
            }
        }

        const configValue = JSON.stringify({
            apiKey: apiKeyToSave,
            model: body.model,
            systemPrompt: body.systemPrompt
        });

        // 使用 upsert 逻辑
        const existing = await db
            .select()
            .from(settings)
            .where(eq(settings.key, AI_CONFIG_KEY))
            .get();

        if (existing) {
            await db
                .update(settings)
                .set({ value: configValue, updatedAt: new Date() })
                .where(eq(settings.key, AI_CONFIG_KEY));
        } else {
            await db.insert(settings).values({
                id: crypto.randomUUID(),
                key: AI_CONFIG_KEY,
                value: configValue
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save AI config:', error);
        return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
    }
}
