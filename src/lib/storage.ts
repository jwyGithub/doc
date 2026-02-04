export const STORAGE_KEYS = {
	REMEMBER_CREDENTIALS: 'doc_remember_credentials',
	THEME: 'theme',
	EXPANDED_FOLDERS: 'expanded_folders',
	VIEW_MODE: 'view_mode',
} as const;

export function encodeCredentials(email: string, password: string): string {
	return btoa(`${email}:${password}`);
}

export function decodeCredentials(encoded: string): { email: string; password: string } | null {
	try {
		const decoded = atob(encoded);
		const [email, password] = decoded.split(':');
		return email && password ? { email, password } : null;
	} catch {
		return null;
	}
}

export function saveToStorage<T>(key: string, value: T): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error('Failed to save to storage:', error);
	}
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
	try {
		const item = localStorage.getItem(key);
		return item ? (JSON.parse(item) as T) : defaultValue;
	} catch {
		return defaultValue;
	}
}

export function removeFromStorage(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.error('Failed to remove from storage:', error);
	}
}
