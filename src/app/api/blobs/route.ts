import { list, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

// 列出所有 blob 文件
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get('cursor') || undefined;
        const limit = Number(searchParams.get('limit')) || 100;

        const result = await list({
            token: process.env.BLOB_READ_WRITE_TOKEN,
            cursor,
            limit,
            prefix: 'documents/' // 只列出 documents 目录下的文件
        });

        return NextResponse.json({
            success: true,
            blobs: result.blobs,
            cursor: result.cursor,
            hasMore: result.hasMore
        });
    } catch (error) {
        console.error('List blobs failed:', error);
        const message = error instanceof Error ? error.message : '获取列表失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// 删除 blob 文件
export async function DELETE(request: Request) {
    try {
        const body = (await request.json()) as { urls: string[] };

        if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
            return NextResponse.json({ error: '请提供要删除的文件 URL' }, { status: 400 });
        }

        // 批量删除
        await del(body.urls, {
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return NextResponse.json({
            success: true,
            deleted: body.urls.length
        });
    } catch (error) {
        console.error('Delete blobs failed:', error);
        const message = error instanceof Error ? error.message : '删除失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
