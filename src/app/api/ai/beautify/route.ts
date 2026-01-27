import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';

const AI_CONFIG_KEY = 'ai_config';
const GEMINI_API_BASE = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

interface AIConfigData {
    apiKey: string;
    model: string;
    systemPrompt: string;
}

interface BeautifyRequestBody {
    content: string;
}

export async function POST(request: Request) {
    try {
        const { content } = (await request.json()) as BeautifyRequestBody;

        if (!content) {
            return new Response(JSON.stringify({ error: '缺少文档内容' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 从数据库获取 AI 配置
        const d1 = await getD1Database();
        const db = createDb(d1);

        const configResult = await db.select().from(settings).where(eq(settings.key, AI_CONFIG_KEY)).get();

        if (!configResult) {
            return new Response(JSON.stringify({ error: '请先配置 AI 服务' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const config = JSON.parse(configResult.value) as AIConfigData;

        if (!config.apiKey || !config.model) {
            return new Response(JSON.stringify({ error: 'AI 配置不完整' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 使用原生 fetch 调用 Gemini API（流式）
        const response = await fetch(GEMINI_API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'user',
                        content: content
                    },
                    {
                        role: 'assistant',
                        content: config.systemPrompt
                    }
                ],
                stream: true,
                thinking: {
                    type: 'disabled'
                },
                max_tokens: 65536,
                temperature: 1.0
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API error:', errorText);
            return new Response(JSON.stringify({ error: 'AI 服务请求失败' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            }
        });
    } catch (error) {
        console.error('AI beautify failed:', error);
        const message = error instanceof Error ? error.message : '美化失败';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

