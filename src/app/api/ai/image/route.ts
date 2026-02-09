import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';
import { AI_CONFIG_KEY } from '@/constants';
import { requireAuth } from '@/lib/session';
import type { ImageGenerateRequestBody } from '@/types/ai';

interface AIConfigData {
    apiKey: string;
    baseUrl?: string;
    model: string;
    systemPrompt: string;
}

interface OpenAIImageData {
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
}

interface OpenAIImageResponse {
    created: number;
    data: OpenAIImageData[];
}

export async function POST(request: Request) {
    try {
        await requireAuth();

        const { prompt, model, size, quality, n } = (await request.json()) as ImageGenerateRequestBody;

        if (!prompt) {
            return new Response(JSON.stringify({ error: '缺少图片描述' }), {
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

        // 调用 OpenAI-compatible Images API
        const baseUrl = config.baseUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model,
                prompt,
                size: size || '1024x1024',
                quality: quality || 'standard',
                n: n || 1,
                response_format: 'b64_json'
            })
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
            const errorMessage = errorData?.error?.message || `图片生成失败 (${response.status})`;
            return new Response(JSON.stringify({ error: errorMessage }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = (await response.json()) as OpenAIImageResponse;

        // 将返回的图片转换为 data URI
        const images = data.data
            .map(item => {
                if (item.b64_json) {
                    return `data:image/png;base64,${item.b64_json}`;
                }
                if (item.url) {
                    return item.url;
                }
                return null;
            })
            .filter((url): url is string => url !== null);

        return new Response(JSON.stringify({ images }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Image generation failed:', error);
        const message = error instanceof Error ? error.message : '图片生成失败';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
