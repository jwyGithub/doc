import type { User } from '@/db/schema';

export interface UserFormState {
	name: string;
	role: string;
}

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface UserWithRole extends User {
	role: UserRole;
}
