import { NextResponse } from 'next/server';
import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';

const AI_CONFIG_KEY = 'ai_config';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

        // 使用原生 fetch 调用 Gemini API
        const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: "Hi, just testing the connection. Reply with 'OK' only."
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 10
                }
            })
        });

        const data = (await response.json()) as GeminiResponse;

        if (!response.ok) {
            const errorMessage = data.error?.message || '连接测试失败';
            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
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
