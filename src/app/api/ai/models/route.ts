import { AI_CONFIG_KEY } from '@/constants';
import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { requireAuth } from '@/lib/session';
import { AIModelData } from '@/types';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

interface AIConfigData {
    apiKey: string;
    baseUrl?: string;
    model: string;
    systemPrompt: string;
}

export async function POST() {
    try {
        // ✅ 添加权限验证，保护 API 不被未授权访问
        await requireAuth();

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

        const res: { data: AIModelData[]; object: string } = await fetch(`${config.baseUrl}/models`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${config.apiKey}`
            }
        }).then(res => res.json());

        return NextResponse.json({ models: res.data });
    } catch (error) {
        return NextResponse.json({ error: '获取模型列表失败' }, { status: 500 });
    }
}

