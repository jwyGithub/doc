// 应用信息
export const APP_INFO = {
	NAME: '文档管理系统',
	VERSION: '1.0.0',
	TECH_STACK: 'Next.js + Cloudflare D1',
	SUPER_ADMIN_EMAIL: 'admin@doc.local',
} as const;

// 密码配置
export const PASSWORD_CONFIG = {
	MIN_LENGTH: 8,
	CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
	DEFAULT_GENERATED_LENGTH: 4,
} as const;

// 存储键
export const STORAGE_KEYS = {
	REMEMBER_CREDENTIALS: 'doc_remember_credentials',
	THEME: 'theme',
	EXPANDED_FOLDERS: 'expanded_folders',
	VIEW_MODE: 'view_mode',
} as const;

// AI 系统提示词
export const AI_SYSTEM_PROMPTS = {
	BEAUTIFY: `你是一个专业的文档写作助手。你的任务是帮助用户优化和美化他们的文档内容。
- 保持原文的核心信息和语义
- 改善文档的结构和可读性
- 使用更专业、清晰的表达方式
- 修正明显的语法和拼写错误
- 保持 Markdown 格式

请直接输出优化后的文档内容，不需要解释。`,

	CHAT: `你是一个友好的 AI 助手，专门帮助用户处理文档相关的问题。
- 提供准确、有用的建议
- 用清晰、简洁的语言回答
- 在必要时给出示例
- 保持专业和礼貌`,
} as const;

// 过期时间选项
export const EXPIRY_OPTIONS = {
	'1h': { label: '1 小时', hours: 1 },
	'1d': { label: '1 天', hours: 24 },
	'7d': { label: '7 天', hours: 168 },
	'30d': { label: '30 天', hours: 720 },
	never: { label: '永不过期', hours: null },
} as const;

// 用户角色
export const USER_ROLES = {
	USER: 'user',
	ADMIN: 'admin',
	SUPERADMIN: 'superadmin',
} as const;

export const USER_ROLE_LABELS = {
	[USER_ROLES.USER]: '普通用户',
	[USER_ROLES.ADMIN]: '管理员',
	[USER_ROLES.SUPERADMIN]: '超级管理员',
} as const;

// 视图模式
export const VIEW_MODES = {
	SPLIT: 'split',
	EDIT: 'edit',
	PREVIEW: 'preview',
} as const;

// AI 配置
export const AI_CONFIG_KEY = 'ai_config';

export const models = [
	{
		id: 'gemini-3-flash',
		name: 'gemini-3-flash',
		displayName: 'gemini-3-flash',
	},
	{
		id: 'gemini-3-pro-high',
		name: 'gemini-3-pro-high',
		displayName: 'gemini-3-pro-high',
	},
	{
		id: 'gemini-3-pro-low',
		name: 'gemini-3-pro-low',
		displayName: 'gemini-3-pro-low',
	},
	{
		id: 'gemini-3-pro-image',
		name: 'gemini-3-pro-image',
		displayName: 'gemini-3-pro-image',
	},
	{
		id: 'gemini-2.5-flash',
		name: 'gemini-2.5-flash',
		displayName: 'gemini-2.5-flash',
	},
	{
		id: 'gemini-2.5-flash-thinking',
		name: 'gemini-2.5-flash-thinking',
		displayName: 'gemini-2.5-flash-thinking',
	},
	{
		id: 'claude-sonnet-4-5',
		name: 'claude-sonnet-4-5',
		displayName: 'claude-sonnet-4-5',
	},
	{
		id: 'claude-sonnet-4-5-thinking',
		name: 'claude-sonnet-4-5-thinking',
		displayName: 'claude-sonnet-4-5-thinking',
	},
	{
		id: 'claude-opus-4-5-thinking',
		name: 'claude-opus-4-5-thinking',
		displayName: 'claude-opus-4-5-thinking',
	},
];
