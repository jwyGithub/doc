import type { ApiResponse } from '@/types';

export class ApiError extends Error {
	constructor(
		message: string,
		public status?: number,
		public data?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export async function fetchApi<T>(
	url: string,
	options?: RequestInit
): Promise<T> {
	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options?.headers,
			},
		});

		const data: unknown = await response.json();

		if (!response.ok) {
			const errorData = data as { error?: string };
			throw new ApiError(
				errorData.error || 'Request failed',
				response.status,
				data
			);
		}

		return data as T;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError(
			error instanceof Error ? error.message : 'Unknown error occurred'
		);
	}
}

export const api = {
	get: <T>(url: string, options?: RequestInit) =>
		fetchApi<T>(url, { ...options, method: 'GET' }),

	post: <T>(url: string, body?: unknown, options?: RequestInit) =>
		fetchApi<T>(url, {
			...options,
			method: 'POST',
			body: body ? JSON.stringify(body) : undefined,
		}),

	put: <T>(url: string, body?: unknown, options?: RequestInit) =>
		fetchApi<T>(url, {
			...options,
			method: 'PUT',
			body: body ? JSON.stringify(body) : undefined,
		}),

	delete: <T>(url: string, options?: RequestInit) =>
		fetchApi<T>(url, { ...options, method: 'DELETE' }),
};
