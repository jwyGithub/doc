import { useState, useCallback, useEffect } from 'react';
import type { AsyncState } from '@/types';

interface UseAsyncOptions<T> {
	immediate?: boolean;
	onSuccess?: (data: T) => void;
	onError?: (error: string) => void;
	initialData?: T | null;
}

export function useAsync<T, Args extends unknown[] = []>(
	asyncFunction?: (...args: Args) => Promise<T>,
	options: UseAsyncOptions<T> = {}
) {
	const { immediate = false, onSuccess, onError, initialData = null } = options;

	const [state, setState] = useState<AsyncState<T>>({
		data: initialData,
		loading: immediate,
		error: null,
	});

	const execute = useCallback(
		async (...args: Args) => {
			if (!asyncFunction) {
				throw new Error('asyncFunction is required');
			}

			setState((prev) => ({ ...prev, loading: true, error: null }));
			try {
				const data = await asyncFunction(...args);
				setState({ data, loading: false, error: null });
				onSuccess?.(data);
				return data;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
				onError?.(errorMessage);
				throw error;
			}
		},
		[asyncFunction, onSuccess, onError]
	);

	const reset = useCallback(() => {
		setState({ data: initialData, loading: false, error: null });
	}, [initialData]);

	useEffect(() => {
		if (immediate && asyncFunction) {
			execute(...([] as unknown as Args));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return {
		...state,
		execute,
		reset,
		refresh: execute,
	};
}
