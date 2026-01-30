import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { assets } from '@/db/schema';
import { nanoid } from 'nanoid';
import { getD1Database } from '@/lib/cloudflare';
import { createAuth } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        // 获取数据库连接
        const d1 = await getD1Database();
        const db = createDb(d1);

        // 获取当前用户
        const auth = createAuth(d1);
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: '未找到文件' }, { status: 400 });
        }

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: '只支持图片文件' }, { status: 400 });
        }

        // 验证文件大小（限制 5MB）
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: '图片大小不能超过 5MB' }, { status: 400 });
        }

        // 将文件转换为 base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');

        // 生成唯一 ID
        const assetId = nanoid();

        // 保存到数据库
        await db.insert(assets).values({
            id: assetId,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            data: base64Data,
            uploadedBy: session.user.id
        });

        // 返回图片访问 URL
        const url = `/api/assets/${assetId}`;

        return NextResponse.json({
            success: true,
            url,
            filename: file.name
        });
    } catch (error) {
        console.error('Image upload failed:', error);
        const message = error instanceof Error ? error.message : '上传失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

