import { api } from './api';

export interface SetupStatusResponse {
	initialized: boolean;
}

export interface InitSetupRequest {
	name: string;
	email: string;
	password: string;
}

export interface InitSetupResponse {
	success: boolean;
}

export const setupService = {
	getStatus: () => api.get<SetupStatusResponse>('/api/setup/status'),

	init: (data: InitSetupRequest) =>
		api.post<InitSetupResponse>('/api/setup/init', data),
};
