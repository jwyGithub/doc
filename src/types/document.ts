import type { Document } from '@/db/schema';

export interface TreeNode extends Document {
	children: TreeNode[];
}

export type ViewMode = 'split' | 'edit' | 'preview';
