import { api } from './api';
import type { GetBlobsResponse } from '@/types';

export interface DeleteBlobResponse {
	success: boolean;
}

export const blobService = {
	getAll: () => api.get<GetBlobsResponse>('/api/blobs'),

	delete: (key: string) =>
		api.delete<DeleteBlobResponse>(`/api/blobs?key=${encodeURIComponent(key)}`),
};
