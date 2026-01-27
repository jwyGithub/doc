"use client";

import { useCallback, useEffect, useState } from "react";
import type { Document } from "@/db/schema";

// 自定义事件名
const DOCUMENTS_UPDATED_EVENT = "documents-updated";

// 触发文档更新事件
export function triggerDocumentsRefresh() {
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(DOCUMENTS_UPDATED_EVENT));
	}
}

// 使用文档数据的 hook
export function useDocuments() {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchDocuments = useCallback(async () => {
		try {
			const res = await fetch("/api/documents");
			const data = (await res.json()) as { documents?: Document[] };
			setDocuments(data.documents || []);
		} catch (error) {
			console.error("Failed to fetch documents:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchDocuments();

		// 监听文档更新事件
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
