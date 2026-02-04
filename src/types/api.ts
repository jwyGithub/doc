import type { Document, User, Share } from '@/db/schema';

// Document API
export interface GetDocumentsResponse {
	documents: Document[];
}

export interface GetDocumentResponse {
	document: Document;
}

export interface CreateDocumentRequest {
	title: string;
	content?: string;
	parentId?: string;
}

export interface CreateDocumentResponse {
	document: Document;
}

export interface UpdateDocumentRequest {
	title?: string;
	content?: string;
	parentId?: string | null;
}

export interface UpdateDocumentResponse {
	document: Document;
}

export interface DeleteDocumentResponse {
	success: boolean;
}

// User API
export interface GetUsersResponse {
	users: User[];
}

export interface UpdateUserRequest {
	name: string;
	role: string;
}

export interface UpdateUserResponse {
	user: User;
}

export interface DeleteUserResponse {
	success: boolean;
}

// Share API
export interface ShareInfo {
	id: string;
	password: string | null;
	expiresAt: Date | null;
}

export interface GetShareResponse {
	share?: ShareInfo;
}

export interface CreateShareRequest {
	documentId: string;
	password?: string;
	expiresAt?: string;
}

export interface CreateShareResponse {
	share: ShareInfo;
	updated?: boolean;
}

export interface GetSharesResponse {
	shares: Array<{
		id: string;
		documentId: string;
		documentTitle: string | null;
		password: string | null;
		expiresAt: Date | null;
		viewCount: number;
		createdAt: Date;
		userName: string | null;
	}>;
}

export interface DeleteShareResponse {
	success: boolean;
}

// AI API
export interface AIConfigResponse {
	config: {
		provider: string;
		baseUrl: string;
		apiKey: string;
		model: string;
	} | null;
}

export interface GetAIModelsResponse {
	models: string[];
}

export interface BlobItem {
	url: string;
	pathname: string;
	size: number;
	uploadedAt: Date;
}

export interface GetBlobsResponse {
	blobs: BlobItem[];
}
