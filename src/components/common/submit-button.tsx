import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
	loading?: boolean;
	loadingText?: string;
	children: React.ReactNode;
}

export function SubmitButton({ loading = false, loadingText = '处理中...', children, disabled, ...props }: SubmitButtonProps) {
	return (
		<Button disabled={disabled || loading} {...props}>
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{loadingText}
				</>
			) : (
				children
			)}
		</Button>
	);
}
