"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// 文档类型定义
export interface DocumentRecord {
	id: string;
	title: string;
	content: string;
	parentId: string | null;
	createdAt: string;
	updatedAt: string;
}

// 元数据类型
export interface MetaRecord {
	key: string;
	value: string | number;
}

// IndexedDB Schema 定义
interface DocSearchDB extends DBSchema {
	documents: {
		key: string;
		value: DocumentRecord;
		indexes: {
			"by-updated": string;
		};
	};
	meta: {
		key: string;
		value: MetaRecord;
	};
}

const DB_NAME = "doc-search-db";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<DocSearchDB> | null = null;

/**
 * 获取数据库实例（单例模式）
 */
export async function getDB(): Promise<IDBPDatabase<DocSearchDB>> {
	if (dbInstance) {
		return dbInstance;
	}

	dbInstance = await openDB<DocSearchDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// 创建文档存储
			if (!db.objectStoreNames.contains("documents")) {
				const docStore = db.createObjectStore("documents", { keyPath: "id" });
				docStore.createIndex("by-updated", "updatedAt");
			}

			// 创建元数据存储
			if (!db.objectStoreNames.contains("meta")) {
				db.createObjectStore("meta", { keyPath: "key" });
			}
		},
	});

	return dbInstance;
}

/**
 * 获取缓存的版本号
 */
export async function getCachedVersion(): Promise<number | null> {
	const db = await getDB();
	const meta = await db.get("meta", "version");
	return meta ? (meta.value as number) : null;
}

/**
 * 设置缓存的版本号
 */
export async function setCachedVersion(version: number): Promise<void> {
	const db = await getDB();
	await db.put("meta", { key: "version", value: version });
}

/**
 * 获取所有缓存的文档
 */
export async function getAllCachedDocuments(): Promise<DocumentRecord[]> {
	const db = await getDB();
	return db.getAll("documents");
}

/**
 * 批量保存文档
 */
export async function saveDocuments(documents: DocumentRecord[]): Promise<void> {
	const db = await getDB();
	const tx = db.transaction("documents", "readwrite");

	await Promise.all([
		...documents.map((doc) => tx.store.put(doc)),
		tx.done,
	]);
}

/**
 * 添加或更新单个文档
 */
export async function saveDocument(document: DocumentRecord): Promise<void> {
	const db = await getDB();
	await db.put("documents", document);
}

/**
 * 删除单个文档
 */
export async function deleteDocument(id: string): Promise<void> {
	const db = await getDB();
	await db.delete("documents", id);
}

/**
 * 清空所有文档缓存
 */
export async function clearDocuments(): Promise<void> {
	const db = await getDB();
	await db.clear("documents");
}

/**
 * 获取缓存文档数量
 */
export async function getDocumentCount(): Promise<number> {
	const db = await getDB();
	return db.count("documents");
}
