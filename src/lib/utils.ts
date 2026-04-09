import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function safeParseJson(json: string) {
    try {
        return JSON.parse(json);
    } catch (error) {
        return {};
    }
}

