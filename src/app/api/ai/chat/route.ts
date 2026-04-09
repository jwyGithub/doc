import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';
import { createOpenAI, type OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { AI_CONFIG_KEY } from '@/constants';
import { requireAuth } from '@/lib/session';

interface AIConfigData {
    apiKey: string;
    baseUrl?: string;
    model: string;
    systemPrompt: string;
}

export async function POST(request: Request) {
    try {
        await requireAuth();

        const body = (await request.json()) as {
            messages: UIMessage[];
            model: string;
            systemPrompt: string;
            thinking?: boolean;
        };
        const { messages, model, systemPrompt, thinking } = body;

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
            name: 'openai',
            baseURL: config.baseUrl,
            apiKey: config.apiKey,
            headers: {
                Authorization: `Bearer ${config.apiKey}`
            }
        });

        const streamTextOptions: Parameters<typeof streamText>[0] = {
            model: openaiProvider.chat(model),
            system: systemPrompt,
            messages: await convertToModelMessages(messages)
        };

        if (thinking) {
            streamTextOptions.providerOptions = {
                openai: {
                    forceReasoning: true,
                    reasoningEffort: 'high',
                    reasoningSummary: 'detailed'
                } satisfies OpenAILanguageModelResponsesOptions
            };
        }
        const result = streamText(streamTextOptions);

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('AI chat failed:', error);
        const message = error instanceof Error ? error.message : '对话失败';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

