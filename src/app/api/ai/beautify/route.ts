import { createDb, settings } from '@/db';
import { getD1Database } from '@/lib/cloudflare';
import { eq } from 'drizzle-orm';

const AI_CONFIG_KEY = 'ai_config';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface AIConfigData {
    apiKey: string;
    model: string;
    systemPrompt: string;
}

interface BeautifyRequestBody {
    content: string;
}

interface GeminiStreamResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
}

export async function POST(request: Request) {
    try {
        const { content } = (await request.json()) as BeautifyRequestBody;

        if (!content) {
            return new Response(JSON.stringify({ error: '缺少文档内容' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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

        if (!config.apiKey || !config.model) {
            return new Response(JSON.stringify({ error: 'AI 配置不完整' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 使用原生 fetch 调用 Gemini API（流式）
        const response = await fetch(`${GEMINI_API_BASE}/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `${config.systemPrompt}\n\n请美化以下 Markdown 文档内容，直接返回美化后的 Markdown，不要添加任何额外解释：\n\n${content}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', errorText);
            return new Response(JSON.stringify({ error: 'AI 服务请求失败' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 转换 Gemini SSE 流为纯文本流
        const reader = response.body?.getReader();
        if (!reader) {
            return new Response(JSON.stringify({ error: '无法读取响应流' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.slice(6);
                                if (jsonStr.trim() === '[DONE]') continue;

                                try {
                                    const data = JSON.parse(jsonStr) as GeminiStreamResponse;
                                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                    if (text) {
                                        controller.enqueue(encoder.encode(text));
                                    }
                                } catch {
                                    // 忽略解析错误
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Stream processing error:', error);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            }
        });
    } catch (error) {
        console.error('AI beautify failed:', error);
        const message = error instanceof Error ? error.message : '美化失败';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

