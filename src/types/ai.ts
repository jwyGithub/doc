export interface ModelOption {
    id: string;
    name: string;
    provider?: string;
}

export interface AIModelData {
    created: number;
    id: string;
    object: string;
    owned_by: string;
}

export interface ImageGenerateRequestBody {
    prompt: string;
    model: string;
    size?: string;
    quality?: 'standard' | 'hd' | 'medium';
    n?: number;
}

export interface ImageGenerateResponse {
    images?: string[];
    error?: string;
}
