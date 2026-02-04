import { lazy } from 'react';

// AI 对话框
export const AIConfigDialog = lazy(() =>
	import('../dialogs/ai/ai-config-dialog').then((mod) => ({ default: mod.AIConfigDialog }))
);

export const AIChatDialog = lazy(() =>
	import('../dialogs/ai/ai-chat-dialog').then((mod) => ({ default: mod.AIChatDialog }))
);

export const AIBeautifyDialog = lazy(() =>
	import('../dialogs/ai/ai-beautify-dialog').then((mod) => ({ default: mod.AIBeautifyDialog }))
);

// 分享对话框
export const ShareDialog = lazy(() =>
	import('../dialogs/share/share-dialog').then((mod) => ({ default: mod.ShareDialog }))
);

export const SharesDialog = lazy(() =>
	import('../dialogs/share/shares-dialog').then((mod) => ({ default: mod.SharesDialog }))
);

// 用户对话框
export const UsersDialog = lazy(() =>
	import('../dialogs/user/users-dialog').then((mod) => ({ default: mod.UsersDialog }))
);

// 设置对话框
export const SettingsDialog = lazy(() =>
	import('../dialogs/settings/settings-dialog').then((mod) => ({ default: mod.SettingsDialog }))
);

// Blob管理对话框
export const BlobManagerDialog = lazy(() =>
	import('../dialogs/blob/blob-manager-dialog').then((mod) => ({ default: mod.BlobManagerDialog }))
);
