import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { AI_BASE_URL, AI_CONFIG_KEY } from '@/constants';

interface AIConfigData {
    apiKey: string;
    model: string;
    systemPrompt: string;
}

interface TestRequestBody {
    apiKey?: string;
    model: string;
}

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: {
        message?: string;
    };
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

            const configResult = await db.select().from(settings).where(eq(settings.key, AI_CONFIG_KEY)).get();

            if (configResult) {
                const config = JSON.parse(configResult.value) as AIConfigData;
                apiKey = config.apiKey;
            }
        }

        if (!apiKey || !model) {
            return Response.json({ error: '缺少必要参数' }, { status: 400 });
        }

        const openaiProvider = createOpenAI({
            apiKey: apiKey,
            baseURL: AI_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            }
        });

        const result = await generateText({
            model: openaiProvider.chat(model),
            messages: [
                {
                    role: 'user',
                    content: 'Hi, just testing the connection. Reply with "OK" only.'
                }
            ]
        });

        if (result) {
            return Response.json({ success: true, message: '连接成功' });
        } else {
            return Response.json({ error: '未收到有效响应' }, { status: 500 });
        }
    } catch (error) {
        console.error('AI test failed:', error);
        const message = error instanceof Error ? error.message : '连接测试失败';
        return Response.json({ error: message }, { status: 500 });
    }
}

