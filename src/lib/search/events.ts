'use client';

import type { DocumentRecord } from './db';
import { addOrUpdateDocument, removeDocument } from './engine';

// 自定义事件名
const SEARCH_INDEX_UPDATED_EVENT = 'search-index-updated';

/**
 * 触发搜索索引更新事件
 */
export function triggerSearchIndexUpdate() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SEARCH_INDEX_UPDATED_EVENT));
    }
}

/**
 * 监听搜索索引更新事件
 */
export function onSearchIndexUpdate(callback: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }

    window.addEventListener(SEARCH_INDEX_UPDATED_EVENT, callback);
    return () => {
        window.removeEventListener(SEARCH_INDEX_UPDATED_EVENT, callback);
    };
}

/**
 * 文档创建后更新索引
 */
export async function onDocumentCreated(document: DocumentRecord): Promise<void> {
    try {
        await addOrUpdateDocument(document);
        triggerSearchIndexUpdate();
    } catch (error) {
        console.error('[Search] Failed to add document to index:', error);
    }
}

/**
 * 文档更新后更新索引
 */
export async function onDocumentUpdated(document: DocumentRecord): Promise<void> {
    try {
        await addOrUpdateDocument(document);
        triggerSearchIndexUpdate();
    } catch (error) {
        console.error('[Search] Failed to update document in index:', error);
    }
}

/**
 * 文档删除后更新索引
 */
export async function onDocumentDeleted(documentId: string): Promise<void> {
    try {
        await removeDocument(documentId);
        triggerSearchIndexUpdate();
    } catch (error) {
        console.error('[Search] Failed to remove document from index:', error);
    }
}

