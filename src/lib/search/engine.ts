"use client";

import MiniSearch, { type SearchResult } from "minisearch";
import {
	type DocumentRecord,
	getAllCachedDocuments,
	saveDocuments,
	saveDocument,
	deleteDocument as deleteFromDB,
	getCachedVersion,
	setCachedVersion,
	clearDocuments,
} from "./db";

// 搜索结果类型
export interface SearchResultItem {
	id: string;
	title: string;
	content: string;
	score: number;
	titleMatch: boolean;
	contentMatch: boolean;
	matchedTerms: string[];
}

// 搜索引擎实例
let searchEngine: MiniSearch<DocumentRecord> | null = null;

// 是否已初始化
let initialized = false;

// 初始化锁，防止并发初始化
let initPromise: Promise<void> | null = null;

/**
 * 创建 MiniSearch 实例
 */
function createSearchEngine(): MiniSearch<DocumentRecord> {
	return new MiniSearch<DocumentRecord>({
		fields: ["title", "content"], // 搜索字段
		storeFields: ["title", "content"], // 存储字段，搜索结果中返回
		searchOptions: {
			boost: { title: 2 }, // 标题权重更高
			prefix: true, // 支持前缀搜索
			fuzzy: 0.2, // 模糊搜索容差
		},
		// 自定义分词器，支持中文（优化版本，避免CPU超时）
		tokenize: (text) => {
			// 按空格、标点符号分词，同时保留连续的中文字符
			const tokens: string[] = [];
			// 基本分词：按非字母数字中文字符分割
			const basicTokens = text.toLowerCase().split(/[\s\-_.,:;!?()[\]{}'"<>/\\|@#$%^&*+=`~]+/);
			
			for (const token of basicTokens) {
				if (token.length === 0) continue;
				tokens.push(token);
				
				// 对于包含中文的文本，进行字符级别的索引（支持任意位置匹配）
				// 优化：限制长度和生成数量，避免CPU超时
				if (/[\u4e00-\u9fa5]/.test(token) && token.length <= 50) {
					// 只对长度 <= 50 的 token 生成 n-gram
					// 限制最多生成 30 个 n-gram，避免过度索引
					const maxNgrams = 30;
					let ngramCount = 0;
					
					// 生成 bigram 以支持更好的中文搜索
					for (let i = 0; i < token.length - 1 && ngramCount < maxNgrams; i++) {
						tokens.push(token.slice(i, i + 2)); // bigram
						ngramCount++;
						
						// 只对前 20 个字符生成 trigram
						if (i < Math.min(20, token.length - 2) && ngramCount < maxNgrams) {
							tokens.push(token.slice(i, i + 3)); // trigram
							ngramCount++;
						}
					}
				}
			}
			
			return tokens.filter(t => t.length > 0);
		},
	});
}

/**
 * 从服务器获取文档版本号
 */
async function fetchServerVersion(): Promise<number> {
	try {
		const res = await fetch("/api/documents/version");
		const data = (await res.json()) as { version: number };
		return data.version;
	} catch {
		return Date.now(); // 出错时返回当前时间戳，强制刷新
	}
}

/**
 * 从服务器获取所有文档
 */
async function fetchAllDocuments(): Promise<DocumentRecord[]> {
	const res = await fetch("/api/documents");
	const data = (await res.json()) as { documents?: DocumentRecord[] };
	return data.documents || [];
}

/**
 * 初始化搜索引擎
 */
export async function initSearchEngine(): Promise<void> {
	// 如果已经有初始化进行中，等待它完成
	if (initPromise) {
		return initPromise;
	}

	// 如果已初始化，直接返回
	if (initialized && searchEngine) {
		return;
	}

	initPromise = (async () => {
		try {
			// 创建搜索引擎实例
			searchEngine = createSearchEngine();

			// 获取服务器版本号
			const serverVersion = await fetchServerVersion();
			const cachedVersion = await getCachedVersion();

			let documents: DocumentRecord[];

			if (cachedVersion === serverVersion) {
				// 版本相同，使用缓存数据
				documents = await getAllCachedDocuments();
				console.log(`[Search] Using cached data, ${documents.length} documents`);
			} else {
				// 版本不同，从服务器获取最新数据
				documents = await fetchAllDocuments();
				// 清空旧缓存并保存新数据
				await clearDocuments();
				await saveDocuments(documents);
				await setCachedVersion(serverVersion);
				console.log(`[Search] Fetched fresh data, ${documents.length} documents`);
			}

			// 建立索引
			if (documents.length > 0) {
				searchEngine.addAll(documents);
			}

			initialized = true;
		} catch (error) {
			console.error("[Search] Init failed:", error);
			// 初始化失败时，尝试直接从服务器获取数据
			searchEngine = createSearchEngine();
			const documents = await fetchAllDocuments();
			if (documents.length > 0) {
				searchEngine.addAll(documents);
			}
			initialized = true;
		} finally {
			initPromise = null;
		}
	})();

	return initPromise;
}

/**
 * 检查文本是否包含搜索词（支持部分匹配）
 */
function containsSearchTerm(text: string, searchQuery: string): boolean {
	if (!text || !searchQuery) return false;
	const lowerText = text.toLowerCase();
	const lowerQuery = searchQuery.toLowerCase().trim();
	
	// 直接包含整个搜索词
	if (lowerText.includes(lowerQuery)) {
		return true;
	}
	
	// 对于中文搜索，检查是否包含搜索词的大部分字符（至少 60%）
	if (/[\u4e00-\u9fa5]/.test(lowerQuery)) {
		let matchCount = 0;
		for (const char of lowerQuery) {
			if (lowerText.includes(char)) {
				matchCount++;
			}
		}
		// 至少匹配 60% 的字符
		if (matchCount / lowerQuery.length >= 0.6) {
			return true;
		}
	}
	
	return false;
}

/**
 * 执行搜索
 */
export async function search(query: string): Promise<SearchResultItem[]> {
	if (!query.trim()) {
		return [];
	}

	// 确保引擎已初始化
	await initSearchEngine();

	if (!searchEngine) {
		return [];
	}

	const results: SearchResult[] = searchEngine.search(query, {
		prefix: true,
		fuzzy: 0.2,
		boost: { title: 2 },
	});

	// 后过滤：确保结果确实包含搜索词
	const filteredResults = results.filter((result) => {
		const title = result.title as string || "";
		const content = result.content as string || "";
		return containsSearchTerm(title, query) || containsSearchTerm(content, query);
	});

	return filteredResults.map((result) => ({
		id: result.id as string,
		title: result.title as string,
		content: result.content as string,
		score: result.score,
		titleMatch: containsSearchTerm(result.title as string || "", query),
		contentMatch: containsSearchTerm(result.content as string || "", query),
		matchedTerms: result.terms || [],
	}));
}

/**
 * 添加或更新文档到索引
 */
export async function addOrUpdateDocument(document: DocumentRecord): Promise<void> {
	await initSearchEngine();

	if (!searchEngine) return;

	// 先尝试删除旧文档（如果存在）
	try {
		searchEngine.discard(document.id);
	} catch {
		// 文档不存在，忽略错误
	}

	// 添加新文档
	searchEngine.add(document);

	// 更新 IndexedDB 缓存
	await saveDocument(document);

	// 更新版本号
	await setCachedVersion(Date.now());
}

/**
 * 从索引中删除文档
 */
export async function removeDocument(id: string): Promise<void> {
	await initSearchEngine();

	if (!searchEngine) return;

	try {
		searchEngine.discard(id);
	} catch {
		// 文档不存在，忽略错误
	}

	// 从 IndexedDB 删除
	await deleteFromDB(id);

	// 更新版本号
	await setCachedVersion(Date.now());
}

/**
 * 强制刷新索引（重新从服务器获取数据）
 */
export async function refreshIndex(): Promise<void> {
	initialized = false;
	searchEngine = null;
	await initSearchEngine();
}

/**
 * 获取索引状态
 */
export function getIndexStatus(): { initialized: boolean; documentCount: number } {
	return {
		initialized,
		documentCount: searchEngine?.documentCount || 0,
	};
}
