import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { assets } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getD1Database } from '@/lib/cloudflare';
import { createAuth } from '@/lib/auth';

// 列出所有资源文件
export async function GET(request: Request) {
    try {
        // 获取数据库连接
        const d1 = await getD1Database();
        const db = createDb(d1);

        // 验证用户登录
        const auth = createAuth(d1);
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get('limit')) || 100;
        const offset = Number(searchParams.get('offset')) || 0;

        // 查询资源列表（不返回 data 字段以减少数据量）
        const assetsList = await db
            .select({
                id: assets.id,
                filename: assets.filename,
                mimeType: assets.mimeType,
                size: assets.size,
                uploadedBy: assets.uploadedBy,
                createdAt: assets.createdAt,
                updatedAt: assets.updatedAt,
            })
            .from(assets)
            .orderBy(desc(assets.createdAt))
            .limit(limit)
            .offset(offset);

        // 查询总数
        const totalResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(assets);
        
        const total = totalResult[0]?.count || 0;
        const hasMore = offset + limit < total;

        // 将结果转换为类似 blob 的格式，保持兼容性
        const blobs = assetsList.map(asset => ({
            url: `/api/assets/${asset.id}`,
            pathname: asset.filename,
            size: asset.size,
            uploadedAt: asset.createdAt,
            downloadUrl: `/api/assets/${asset.id}`,
        }));

        return NextResponse.json({
            success: true,
            blobs,
            hasMore,
            total
        });
    } catch (error) {
        console.error('List assets failed:', error);
        const message = error instanceof Error ? error.message : '获取列表失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// 删除资源文件
export async function DELETE(request: Request) {
    try {
        // 获取数据库连接
        const d1 = await getD1Database();
        const db = createDb(d1);

        // 验证用户登录
        const auth = createAuth(d1);
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const body = (await request.json()) as { urls: string[] };

        if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
            return NextResponse.json({ error: '请提供要删除的文件 URL' }, { status: 400 });
        }

        // 从 URL 中提取资源 ID
        // URL 格式: /api/assets/{id}
        const assetIds = body.urls
            .map(url => {
                const matches = url.match(/\/api\/assets\/([^/]+)$/);
                return matches ? matches[1] : null;
            })
            .filter(id => id !== null) as string[];

        if (assetIds.length === 0) {
            return NextResponse.json({ error: '无效的 URL 格式' }, { status: 400 });
        }

        // 批量删除
        for (const id of assetIds) {
            await db.delete(assets).where(eq(assets.id, id));
        }

        return NextResponse.json({
            success: true,
            deleted: assetIds.length
        });
    } catch (error) {
        console.error('Delete assets failed:', error);
        const message = error instanceof Error ? error.message : '删除失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
