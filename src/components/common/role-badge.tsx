import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types';

interface RoleBadgeProps {
	role: UserRole | string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
	switch (role) {
		case 'superadmin':
			return <Badge variant="destructive">超级管理员</Badge>;
		case 'admin':
			return <Badge variant="default">管理员</Badge>;
		default:
			return <Badge variant="secondary">普通用户</Badge>;
	}
}
