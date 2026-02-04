import { api } from './api';
import type {
    GetDocumentsResponse,
    GetDocumentResponse,
    CreateDocumentRequest,
    CreateDocumentResponse,
    UpdateDocumentRequest,
    UpdateDocumentResponse,
    DeleteDocumentResponse
} from '@/types';

export const documentService = {
    getAll: () => api.get<GetDocumentsResponse>('/api/documents'),

    getById: (id: string) => api.get<GetDocumentResponse>(`/api/documents/${id}`),

    create: (data: CreateDocumentRequest) => api.post<CreateDocumentResponse>('/api/documents', data),

    update: (id: string, data: UpdateDocumentRequest) => api.put<UpdateDocumentResponse>(`/api/documents/${id}`, data),

    delete: (id: string) => api.delete<DeleteDocumentResponse>(`/api/documents/${id}`)
};

