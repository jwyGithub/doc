import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { assets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getD1Database } from '@/lib/cloudflare';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: '缺少资源 ID' }, { status: 400 });
        }

        // 获取数据库连接
        const d1 = await getD1Database();
        const db = createDb(d1);

        // 查询资源
        const result = await db
            .select()
            .from(assets)
            .where(eq(assets.id, id))
            .limit(1);

        if (result.length === 0) {
            return NextResponse.json({ error: '资源不存在' }, { status: 404 });
        }

        const asset = result[0];

        // 将 base64 转换为 Buffer
        const buffer = Buffer.from(asset.data, 'base64');

        // 返回图片
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': asset.mimeType,
                'Content-Length': asset.size.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Get asset failed:', error);
        const message = error instanceof Error ? error.message : '获取资源失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
