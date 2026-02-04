export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
	const defaultOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	};

	return new Date(date).toLocaleDateString('zh-CN', options || defaultOptions);
}

export function formatDateTime(date: string | Date): string {
	return formatDate(date, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function formatShortDateTime(date: string | Date): string {
	return formatDate(date, {
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatRelativeTime(date: string | Date): string {
	const now = new Date();
	const target = new Date(date);
	const diffMs = now.getTime() - target.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return '刚刚';
	if (diffMins < 60) return `${diffMins}分钟前`;
	if (diffHours < 24) return `${diffHours}小时前`;
	if (diffDays < 7) return `${diffDays}天前`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
	return `${Math.floor(diffDays / 365)}年前`;
}

export function isExpired(expiresAt: Date | null): boolean {
	if (!expiresAt) return false;
	return new Date(expiresAt) < new Date();
}
