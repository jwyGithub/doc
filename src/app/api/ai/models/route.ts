import { models } from '@/constants';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        return NextResponse.json({
            models: models
        });
    } catch (error) {
        return NextResponse.json({ error: '获取模型列表失败' }, { status: 500 });
    }
}

