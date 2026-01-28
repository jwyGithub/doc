import { createAuth } from '@/lib/auth';
import { getD1Database } from '@/lib/cloudflare';

async function handleAuth(request: Request) {
    const db = await getD1Database();
    const auth = createAuth(db);
    return auth.handler(request);
}

export async function GET(request: Request) {
    return handleAuth(request);
}

export async function POST(request: Request) {
    return handleAuth(request);
}

