export interface BlobFile {
	key: string;
	size: number;
	uploaded: string;
}

export interface BlobStats {
	totalSize: number;
	totalCount: number;
}
