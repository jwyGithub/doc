'use client';

import { useCallback, useEffect, useState } from 'react';
import { documentService } from '@/services';
import type { Document } from '@/db/schema';

const DOCUMENTS_UPDATED_EVENT = 'documents-updated';

export function triggerDocumentsRefresh() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent(DOCUMENTS_UPDATED_EVENT));
	}
}

export function useDocuments() {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchDocuments = useCallback(async () => {
		try {
			const data = await documentService.getAll();
			setDocuments(data.documents || []);
		} catch (error) {
			console.error('Failed to fetch documents:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchDocuments();

		const handleUpdate = () => {
			fetchDocuments();
		};

		window.addEventListener(DOCUMENTS_UPDATED_EVENT, handleUpdate);
		return () => {
			window.removeEventListener(DOCUMENTS_UPDATED_EVENT, handleUpdate);
		};
	}, [fetchDocuments]);

	return { documents, loading, refresh: fetchDocuments };
}
