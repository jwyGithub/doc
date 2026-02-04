import { api } from './api';
import type {
	GetShareResponse,
	CreateShareRequest,
	CreateShareResponse,
	GetSharesResponse,
	DeleteShareResponse,
} from '@/types';

export const shareService = {
	getByDocumentId: (documentId: string) =>
		api.get<GetShareResponse>(`/api/shares/document/${documentId}`),

	create: (data: CreateShareRequest) =>
		api.post<CreateShareResponse>('/api/shares', data),

	getAll: () => api.get<GetSharesResponse>('/api/shares'),

	delete: (id: string) =>
		api.delete<DeleteShareResponse>(`/api/shares/${id}`),
};
