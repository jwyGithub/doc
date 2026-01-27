import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';

const AI_CONFIG_KEY = 'ai_config';

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

        // 创建 Google Generative AI 客户端
        const google = createGoogleGenerativeAI({
            apiKey: config.apiKey
        });

        // 流式生成美化内容
        const result = streamText({
            model: google(config.model),
            system: config.systemPrompt,
            prompt: `请美化以下 Markdown 文档内容，直接返回美化后的 Markdown，不要添加任何额外解释：${content}`
        });

        // 返回流式响应
        return result.toTextStreamResponse({
            headers: {
                'Content-Type': 'text/event-stream'
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

