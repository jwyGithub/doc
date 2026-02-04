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
    // 获取所有文档（默认使用 all=true 保持向后兼容）
    getAll: () => api.get<GetDocumentsResponse>('/api/documents?all=true'),

    // 分页获取文档
    getPage: (limit = 100, offset = 0) => api.get<GetDocumentsResponse>(`/api/documents?limit=${limit}&offset=${offset}`),

    getById: (id: string) => api.get<GetDocumentResponse>(`/api/documents/${id}`),

    create: (data: CreateDocumentRequest) => api.post<CreateDocumentResponse>('/api/documents', data),

    update: (id: string, data: UpdateDocumentRequest) => api.put<UpdateDocumentResponse>(`/api/documents/${id}`, data),

    delete: (id: string) => api.delete<DeleteDocumentResponse>(`/api/documents/${id}`)
};

