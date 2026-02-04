import { useState, useCallback } from 'react';

export function useForm<T extends Record<string, unknown>>(initialValues: T) {
	const [values, setValues] = useState<T>(initialValues);
	const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
	const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

	const setValue = useCallback(
		<K extends keyof T>(field: K, value: T[K]) => {
			setValues((prev) => ({ ...prev, [field]: value }));
		},
		[]
	);

	const setError = useCallback(
		<K extends keyof T>(field: K, error: string) => {
			setErrors((prev) => ({ ...prev, [field]: error }));
		},
		[]
	);

	const setFieldTouched = useCallback(
		<K extends keyof T>(field: K, isTouched = true) => {
			setTouched((prev) => ({ ...prev, [field]: isTouched }));
		},
		[]
	);

	const reset = useCallback(() => {
		setValues(initialValues);
		setErrors({});
		setTouched({});
	}, [initialValues]);

	const handleChange = useCallback(
		<K extends keyof T>(field: K) =>
			(value: T[K]) => {
				setValue(field, value);
			},
		[setValue]
	);

	return {
		values,
		errors,
		touched,
		setValue,
		setError,
		setFieldTouched,
		handleChange,
		reset,
		setValues,
	};
}
