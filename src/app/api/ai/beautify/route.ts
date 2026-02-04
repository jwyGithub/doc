import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { AI_CONFIG_KEY } from '@/constants';
import { requireAuth } from '@/lib/session';

interface AIConfigData {
    apiKey: string;
    baseUrl?: string;
    model: string;
    systemPrompt: string;
}

interface BeautifyRequestBody {
    content: string;
}

// 配置常量
const MAX_TOKENS = 4096;
const REQUEST_TIMEOUT = 30000;
const MAX_CONTENT_LENGTH = 20000;

export async function POST(request: Request) {
    try {
        // ✅ 添加权限验证
        await requireAuth();
        
        const { content } = (await request.json()) as BeautifyRequestBody;

        // ✅ 验证内容
        if (!content) {
            return new Response(JSON.stringify({ error: '缺少文档内容' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ✅ 验证内容长度
        if (content.length > MAX_CONTENT_LENGTH) {
            return new Response(JSON.stringify({ error: '文档内容过长，请分段美化' }), {
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

        if (!config.apiKey || !config.model || !config.baseUrl) {
            return new Response(JSON.stringify({ error: 'AI 配置不完整' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const openaiProvider = createOpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`
            }
        });

        // ✅ 添加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn('[AI Beautify] Request timeout after 30s');
        }, REQUEST_TIMEOUT);

        try {
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
                abortSignal: controller.signal,
                providerOptions: {
                    openai: {
                        stream: true,
                        thinking: {
                            type: 'disabled'
                        },
                        // ✅ 限制 token 数量
                        max_tokens: MAX_TOKENS,
                        temperature: 1.0
                    }
                }
            });
            
            return result.toTextStreamResponse({
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                }
            });
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        console.error('AI beautify failed:', error);
        const message = error instanceof Error ? error.message : '美化失败';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

