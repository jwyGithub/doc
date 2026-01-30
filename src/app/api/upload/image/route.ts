import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
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

        // 生成文件名：timestamp-random.ext
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop() || 'png';
        const filename = `documents/${timestamp}-${random}.${ext}`;

        // 上传到 Vercel Blob
        const blob = await put(filename, file, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return NextResponse.json({
            success: true,
            url: blob.url,
            filename: blob.pathname
        });
    } catch (error) {
        console.error('Image upload failed:', error);
        const message = error instanceof Error ? error.message : '上传失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
