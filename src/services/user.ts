import { api } from './api';
import type {
	GetUsersResponse,
	UpdateUserRequest,
	UpdateUserResponse,
	DeleteUserResponse,
} from '@/types';

export const userService = {
	getAll: () => api.get<GetUsersResponse>('/api/users'),

	update: (id: string, data: UpdateUserRequest) =>
		api.put<UpdateUserResponse>(`/api/users/${id}`, data),

	delete: (id: string) =>
		api.delete<DeleteUserResponse>(`/api/users/${id}`),
};
