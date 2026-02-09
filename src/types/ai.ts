export interface AIConfig {
    provider: string;
    baseUrl: string;
    apiKey: string;
    model: string;
}

/** 多模态消息内容部分 */
export interface TextContentPart {
    type: 'text';
    text: string;
}

export interface ImageContentPart {
    type: 'image';
    image: string; // base64 data URI
}

export type MessageContentPart = TextContentPart | ImageContentPart;

/** 聊天消息 */
export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    /** 多模态内容（用户消息可附带图片） */
    parts?: MessageContentPart[];
    /** AI 推理/思考过程 */
    reasoning?: string;
    /** 生成的图片列表 (base64 data URI) */
    generatedImages?: string[];
}

export interface ModelOption {
    id: string;
    name: string;
    provider?: string;
}

export interface ChatSession {
    id: string;
    messages: AIMessage[];
    createdAt: Date;
}

export interface AIModelData {
    created: number;
    id: string;
    object: string;
    owned_by: string;
}

/** SSE 流事件类型 */
export interface SSEEvent {
    type: 'reasoning' | 'text' | 'image' | 'error' | 'done';
    content?: string;
}

/** 聊天请求体 */
export interface ChatRequestBody {
    messages: AIMessage[];
    systemPrompt: string;
    model: string;
    thinking?: boolean;
}

/** 图片生成请求体 */
export interface ImageGenerateRequestBody {
    prompt: string;
    model: string;
    size?: string;
    quality?: 'standard' | 'hd' | 'medium';
    n?: number;
}

/** 图片生成响应 */
export interface ImageGenerateResponse {
    images?: string[]; // base64 data URI 数组
    error?: string;
}
