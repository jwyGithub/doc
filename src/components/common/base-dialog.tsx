import { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingState } from './loading-state';
import type { DialogProps } from '@/types';

interface BaseDialogProps extends DialogProps {
	title: string;
	description?: string;
	icon?: LucideIcon;
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
	loading?: boolean;
	footer?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}

const sizeClasses = {
	sm: 'sm:max-w-md',
	md: 'sm:max-w-lg',
	lg: '!w-[60vw] !max-w-[90vw]',
	xl: '!w-[80vw] !max-w-[90vw]',
	full: '!w-[90vw] !max-w-[95vw]',
};

export function BaseDialog({
	open,
	onOpenChange,
	title,
	description,
	icon: Icon,
	size = 'md',
	loading = false,
	footer,
	children,
	className,
}: BaseDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={`${sizeClasses[size]} ${className || ''} max-h-[80vh] flex flex-col`}>
				<DialogHeader>
					<DialogTitle className={Icon ? 'flex items-center gap-2' : ''}>
						{Icon && <Icon className="h-5 w-5" />}
						{title}
					</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>

				{loading ? <LoadingState /> : <div className="flex-1 overflow-y-auto py-4">{children}</div>}

				{footer && <DialogFooter>{footer}</DialogFooter>}
			</DialogContent>
		</Dialog>
	);
}
