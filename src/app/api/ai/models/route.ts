import { NextResponse } from 'next/server';
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
            return NextResponse.json({ error: '缺少 API Key' }, { status: 400 });
        }

        // 调用 Google Generative AI 模型列表 API
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', {
            method: 'GET',
            headers: {
                'x-goog-api-key': apiKey
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch models:', errorText);
            return NextResponse.json({ error: '获取模型列表失败，请检查 API Key 是否正确' }, { status: response.status });
        }

        const data = (await response.json()) as ModelsResponse;

        // 过滤出支持生成内容的模型
        const generativeModels = data.models
            .filter(
                model =>
                    model.supportedGenerationMethods?.includes('generateContent') ||
                    model.supportedGenerationMethods?.includes('streamGenerateContent')
            )
            .map(model => ({
                id: model.name.replace('models/', ''),
                name: model.displayName || model.name.replace('models/', ''),
                description: model.description || ''
            }));

        return NextResponse.json({ models: generativeModels });
    } catch (error) {
        console.error('Failed to list models:', error);
        const message = error instanceof Error ? error.message : '获取模型列表失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

