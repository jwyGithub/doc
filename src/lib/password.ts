export function generatePassword(length: number = 4, chars: string = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'): string {
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

export function validatePassword(password: string, minLength: number = 8): { valid: boolean; message?: string } {
	if (password.length < minLength) {
		return {
			valid: false,
			message: `密码长度至少为 ${minLength} 位`,
		};
	}
	return { valid: true };
}

export function validatePasswordMatch(password: string, confirmPassword: string): { valid: boolean; message?: string } {
	if (password !== confirmPassword) {
		return {
			valid: false,
			message: '两次输入的密码不一致',
		};
	}
	return { valid: true };
}
