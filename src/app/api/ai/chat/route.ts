import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, type ModelMessage } from 'ai';
import { AI_CONFIG_KEY } from '@/constants';
import { requireAuth } from '@/lib/session';
import type { ChatRequestBody, AIMessage } from '@/types/ai';

interface AIConfigData {
    apiKey: string;
    baseUrl?: string;
    model: string;
    systemPrompt: string;
}

/** 构建 AI SDK 兼容的消息格式（支持多模态） */
function buildMessages(messages: AIMessage[], systemPrompt: string): ModelMessage[] {
    const result: ModelMessage[] = [{ role: 'system', content: systemPrompt }];

    for (const msg of messages) {
        if (msg.role === 'user') {
            if (msg.parts && msg.parts.length > 0) {
                const contentParts: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [];
                for (const part of msg.parts) {
                    if (part.type === 'text') {
                        contentParts.push({ type: 'text', text: part.text });
                    } else if (part.type === 'image') {
                        contentParts.push({ type: 'image', image: part.image });
                    }
                }
                result.push({ role: 'user', content: contentParts });
            } else {
                result.push({ role: 'user', content: msg.content });
            }
        } else if (msg.role === 'assistant') {
            result.push({ role: 'assistant', content: msg.content });
        }
    }

    return result;
}

/** 构建原始 Chat Completions API 消息格式 */
function buildRawMessages(messages: AIMessage[], systemPrompt: string) {
    const result: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> =
        [{ role: 'system', content: systemPrompt }];

    for (const msg of messages) {
        if (msg.role === 'user') {
            if (msg.parts && msg.parts.length > 0) {
                const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
                for (const part of msg.parts) {
                    if (part.type === 'text') {
                        contentParts.push({ type: 'text', text: part.text });
                    } else if (part.type === 'image') {
                        contentParts.push({ type: 'image_url', image_url: { url: part.image } });
                    }
                }
                result.push({ role: 'user', content: contentParts });
            } else {
                result.push({ role: 'user', content: msg.content });
            }
        } else if (msg.role === 'assistant') {
            result.push({ role: 'assistant', content: msg.content });
        }
    }

    return result;
}

/** 发送 SSE 事件 */
function sseEncode(event: { type: string; content?: string }): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

/** SSE 响应头 */
const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
};

/**
 * Thinking 模式：直接调用 Chat Completions API 解析 reasoning_content
 *
 * 原因：代理服务的 Responses API 实现不完整（缺少 item_id 等必要字段），
 * 导致 AI SDK 的 Zod schema 验证失败。
 * 直接调用 /chat/completions 并手动解析 reasoning_content 是最可靠的方案。
 */
async function handleThinkingStream(
    config: AIConfigData,
    model: string,
    messages: AIMessage[],
    systemPrompt: string
): Promise<Response> {
    const baseUrl = config.baseUrl!.replace(/\/$/, '');
    const rawMessages = buildRawMessages(messages, systemPrompt);

    const upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: rawMessages,
            stream: true
        })
    });

    if (!upstreamRes.ok) {
        const errorData = (await upstreamRes.json().catch(() => ({}))) as { error?: { message?: string } };
        const errorMessage = errorData?.error?.message || `上游 API 错误 (${upstreamRes.status})`;
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: upstreamRes.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!upstreamRes.body) {
        return new Response(JSON.stringify({ error: '上游未返回流' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const upstreamReader = upstreamRes.body.getReader();

    const readable = new ReadableStream({
        async start(controller) {
            let buffer = '';
            try {
                while (true) {
                    const { done, value } = await upstreamReader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;
                        const data = trimmed.slice(6);
                        if (data === '[DONE]') {
                            controller.enqueue(encoder.encode(sseEncode({ type: 'done' })));
                            continue;
                        }

                        try {
                            const chunk = JSON.parse(data) as {
                                choices?: Array<{
                                    delta?: {
                                        content?: string | null;
                                        reasoning_content?: string | null;
                                    };
                                    finish_reason?: string | null;
                                }>;
                            };
                            const delta = chunk.choices?.[0]?.delta;
                            if (!delta) continue;

                            if (delta.reasoning_content) {
                                controller.enqueue(
                                    encoder.encode(sseEncode({ type: 'reasoning', content: delta.reasoning_content }))
                                );
                            }
                            if (delta.content) {
                                controller.enqueue(
                                    encoder.encode(sseEncode({ type: 'text', content: delta.content }))
                                );
                            }
                        } catch {
                            // 忽略单行解析错误
                        }
                    }
                }
            } catch (error) {
                controller.enqueue(
                    encoder.encode(
                        sseEncode({
                            type: 'error',
                            content: error instanceof Error ? error.message : '流处理异常'
                        })
                    )
                );
            } finally {
                upstreamReader.releaseLock();
                controller.close();
            }
        }
    });

    return new Response(readable, { headers: SSE_HEADERS });
}

/**
 * 普通模式：通过 AI SDK Chat API 处理
 * Chat API 使用 /chat/completions 端点，兼容各类 OpenAI 兼容代理
 */
async function handleNormalStream(
    config: AIConfigData,
    model: string,
    messages: AIMessage[],
    systemPrompt: string
): Promise<Response> {
    const openaiProvider = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`
        }
    });

    const fullMessages = buildMessages(messages, systemPrompt);

    const result = streamText({
        model: openaiProvider.chat(model),
        messages: fullMessages
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            try {
                for await (const part of result.fullStream) {
                    switch (part.type) {
                        case 'text-delta':
                            controller.enqueue(encoder.encode(sseEncode({ type: 'text', content: part.text })));
                            break;
                        case 'file': {
                            const file = part.file;
                            if (file.mediaType.startsWith('image/')) {
                                const dataUri = `data:${file.mediaType};base64,${file.base64}`;
                                controller.enqueue(encoder.encode(sseEncode({ type: 'image', content: dataUri })));
                            }
                            break;
                        }
                        case 'error':
                            controller.enqueue(
                                encoder.encode(
                                    sseEncode({
                                        type: 'error',
                                        content: part.error instanceof Error ? part.error.message : '流处理错误'
                                    })
                                )
                            );
                            break;
                        case 'finish':
                            controller.enqueue(encoder.encode(sseEncode({ type: 'done' })));
                            break;
                    }
                }
            } catch (error) {
                controller.enqueue(
                    encoder.encode(
                        sseEncode({
                            type: 'error',
                            content: error instanceof Error ? error.message : '流处理异常'
                        })
                    )
                );
            } finally {
                controller.close();
            }
        }
    });

    return new Response(readable, { headers: SSE_HEADERS });
}

export async function POST(request: Request) {
    try {
        await requireAuth();

        const { messages, systemPrompt, model, thinking } = (await request.json()) as ChatRequestBody;

        if (!messages || messages.length === 0) {
            return new Response(JSON.stringify({ error: '缺少消息内容' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!model) {
            return new Response(JSON.stringify({ error: '缺少模型参数' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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

        if (thinking) {
            return handleThinkingStream(config, model, messages, systemPrompt);
        }

        return handleNormalStream(config, model, messages, systemPrompt);
    } catch (error) {
        console.error('AI chat failed:', error);
        const message = error instanceof Error ? error.message : '对话失败';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
