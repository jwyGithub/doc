import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';

const AI_CONFIG_KEY = 'ai_config';

interface AIConfigData {
    apiKey: string;
    model: string;
    systemPrompt: string;
}

interface TestRequestBody {
    apiKey?: string;
    model: string;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as TestRequestBody;
        let apiKey = body.apiKey;
        const { model } = body;

        // 如果没有传入 apiKey，从数据库获取
        if (!apiKey) {
            const d1 = await getD1Database();
            const db = createDb(d1);

            const configResult = await db
                .select()
                .from(settings)
                .where(eq(settings.key, AI_CONFIG_KEY))
                .get();

            if (configResult) {
                const config = JSON.parse(configResult.value) as AIConfigData;
                apiKey = config.apiKey;
            }
        }

        if (!apiKey || !model) {
            return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
        }

        // 创建 Google Generative AI 客户端
        const google = createGoogleGenerativeAI({
            apiKey: apiKey
        });

        // 发送测试请求
        const result = await generateText({
            model: google(model),
            prompt: "Hi, just testing the connection. Reply with 'OK' only."
        });

        if (result.text) {
            return NextResponse.json({ success: true, message: '连接成功' });
        } else {
            return NextResponse.json({ error: '未收到有效响应' }, { status: 500 });
        }
    } catch (error) {
        console.error('AI test failed:', error);
        const message = error instanceof Error ? error.message : '连接测试失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
