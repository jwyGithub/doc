export interface AIConfig {
    provider: string;
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
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

