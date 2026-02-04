export type ExpiresType = '1h' | '1d' | '7d' | '30d' | 'never';

export interface ShareFormState {
	usePassword: boolean;
	password: string;
	expiresType: ExpiresType;
}

export interface ShareItem {
	id: string;
	documentId: string;
	documentTitle: string | null;
	password: string | null;
	expiresAt: Date | null;
	viewCount: number;
	createdAt: Date;
}
