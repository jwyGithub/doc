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

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatRequestBody {
    messages: Message[];
    systemPrompt: string;
    model: string;
}

export async function POST(request: Request) {
    try {
        // ✅ 添加权限验证，保护 API 不被未授权访问
        await requireAuth();

        const { messages, systemPrompt, model } = (await request.json()) as ChatRequestBody;

        // ✅ 验证请求参数
        if (!messages || messages.length === 0) {
            return new Response(JSON.stringify({ error: '缺少消息内容' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!model) {
            return new Response(JSON.stringify({ error: '缺少模型参数' }), {
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

        if (!config.apiKey || !config.baseUrl) {
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

        // 构建完整的消息列表
        const fullMessages: Message[] = [
            {
                role: 'system',
                content: systemPrompt
            },
            ...messages
        ];

        const result = streamText({
            model: openaiProvider.chat(model),
            messages: fullMessages,
            providerOptions: {
                openai: {
                    stream: true,
                    thinking: {
                        type: 'disabled'
                    },
                    temperature: 1.0
                }
            }
        });

        return result.toTextStreamResponse({
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no' // 禁用反向代理缓冲
            }
        });
    } catch (error) {
        console.error('AI chat failed:', error);
        const message = error instanceof Error ? error.message : '对话失败';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

