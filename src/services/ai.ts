import { api } from './api';
import type { AIConfigResponse, GetAIModelsResponse } from '@/types';

export interface SaveAIConfigRequest {
	provider: string;
	baseUrl: string;
	apiKey: string;
	model: string;
}

export interface SaveAIConfigResponse {
	success: boolean;
}

export interface TestAIConnectionResponse {
	success: boolean;
	message?: string;
}

export interface BeautifyRequest {
	content: string;
	systemPrompt?: string;
}

export interface ChatRequest {
	messages: Array<{
		role: 'user' | 'assistant' | 'system';
		content: string;
	}>;
	model?: string;
	systemPrompt?: string;
}

export const aiService = {
	getConfig: () => api.get<AIConfigResponse>('/api/ai/config'),

	saveConfig: (data: SaveAIConfigRequest) =>
		api.post<SaveAIConfigResponse>('/api/ai/config', data),

	getModels: () => api.get<GetAIModelsResponse>('/api/ai/models'),

	testConnection: () => api.get<TestAIConnectionResponse>('/api/ai/test'),

	beautify: (data: BeautifyRequest) =>
		fetch('/api/ai/beautify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		}),

	chat: (data: ChatRequest) =>
		fetch('/api/ai/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		}),
};
