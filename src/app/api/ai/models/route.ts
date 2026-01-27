import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';

const AI_CONFIG_KEY = 'ai_config';

interface AIConfigData {
    apiKey: string;
    model: string;
    systemPrompt: string;
}

interface ModelInfo {
    name: string;
    displayName: string;
    description: string;
    supportedGenerationMethods: string[];
}

interface ModelsResponse {
    models: ModelInfo[];
    nextPageToken?: string;
}

interface ListModelsRequestBody {
    apiKey?: string;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ListModelsRequestBody;
        let apiKey = body.apiKey;

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

        if (!apiKey) {
            return Response.json({ error: '缺少 API Key' }, { status: 400 });
        }

        return Response.json({
            models: [
                {
                    id: 'GLM-4.7-Flash',
                    name: 'GLM-4.7-Flash',
                    displayName: 'GLM-4.7-Flash',
                    description: 'GLM-4.7-Flash',
                    supportedGenerationMethods: ['generateContent']
                }
            ]
        });
    } catch (error) {
        console.error('Failed to list models:', error);
        const message = error instanceof Error ? error.message : '获取模型列表失败';
        return Response.json({ error: message }, { status: 500 });
    }
}

