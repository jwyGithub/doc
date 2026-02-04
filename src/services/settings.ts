import { api } from './api';

export interface RegistrationSettings {
	allowRegistration: boolean;
}

export interface GetRegistrationSettingsResponse {
	allowRegistration: boolean;
}

export interface UpdateRegistrationSettingsRequest {
	allowRegistration: boolean;
}

export interface UpdateRegistrationSettingsResponse {
	success: boolean;
}

export const settingsService = {
	getRegistration: () =>
		api.get<GetRegistrationSettingsResponse>('/api/settings/registration'),

	updateRegistration: (data: UpdateRegistrationSettingsRequest) =>
		api.post<UpdateRegistrationSettingsResponse>('/api/settings/registration', data),
};
