import { api } from './api';
import type {
	GetUsersResponse,
	UpdateUserRequest,
	UpdateUserResponse,
	DeleteUserResponse,
} from '@/types';

export const userService = {
	// 获取所有用户（默认使用 all=true 保持向后兼容）
	getAll: () => api.get<GetUsersResponse>('/api/users?all=true'),

	// 分页获取用户
	getPage: (limit = 100, offset = 0) => 
		api.get<GetUsersResponse>(`/api/users?limit=${limit}&offset=${offset}`),

	update: (id: string, data: UpdateUserRequest) =>
		api.put<UpdateUserResponse>(`/api/users/${id}`, data),

	delete: (id: string) =>
		api.delete<DeleteUserResponse>(`/api/users/${id}`),
};
