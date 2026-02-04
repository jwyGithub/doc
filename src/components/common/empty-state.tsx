import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	className?: string;
	action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, className, action }: EmptyStateProps) {
	return (
		<div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
			<Icon className="h-12 w-12 mb-4 opacity-50 text-muted-foreground" />
			<p className="text-base text-muted-foreground mb-1">{title}</p>
			{description && <p className="text-sm text-muted-foreground">{description}</p>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
