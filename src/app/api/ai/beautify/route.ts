import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { AI_BASE_URL, AI_CONFIG_KEY } from '@/constants';

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

        const openaiProvider = createOpenAI({
            apiKey: config.apiKey,
            baseURL: AI_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`
            }
        });

        const result = streamText({
            model: openaiProvider.chat(config.model),
            messages: [
                {
                    role: 'system',
                    content: config.systemPrompt
                },
                {
                    role: 'user',
                    content: content
                }
            ],
            providerOptions: {
                openai: {
                    stream: true,
                    thinking: {
                        type: 'disabled'
                    },
                    max_tokens: 65536,
                    temperature: 1.0
                }
            }
        });
        return result.toTextStreamResponse({
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

