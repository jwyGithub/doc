import { useState, useMemo, useCallback } from 'react';

export interface ColumnDef<T> {
	id: string;
	header: string;
	accessor?: keyof T | ((row: T) => unknown);
	cell?: (row: T) => React.ReactNode;
	className?: string;
	sortable?: boolean;
	width?: string;
}

export interface TableState {
	sortBy: string | null;
	sortOrder: 'asc' | 'desc';
	selectedRows: Set<string>;
}

export interface UseTableOptions<T> {
	data: T[];
	columns: ColumnDef<T>[];
	getRowId?: (row: T) => string;
	initialSortBy?: string | null;
	initialSortOrder?: 'asc' | 'desc';
}

export function useTable<T>({
	data,
	columns,
	getRowId = (row) => String((row as Record<string, unknown>).id),
	initialSortBy = null,
	initialSortOrder = 'asc',
}: UseTableOptions<T>) {
	const [state, setState] = useState<TableState>({
		sortBy: initialSortBy,
		sortOrder: initialSortOrder,
		selectedRows: new Set(),
	});

	// 排序数据
	const sortedData = useMemo(() => {
		if (!state.sortBy) return data;

		const column = columns.find((col) => col.id === state.sortBy);
		if (!column) return data;

		return [...data].sort((a, b) => {
			let aValue: unknown;
			let bValue: unknown;

			if (typeof column.accessor === 'function') {
				aValue = column.accessor(a);
				bValue = column.accessor(b);
			} else if (column.accessor) {
				aValue = a[column.accessor];
				bValue = b[column.accessor];
			} else {
				return 0;
			}

			// 处理null/undefined
			if (aValue == null && bValue == null) return 0;
			if (aValue == null) return 1;
			if (bValue == null) return -1;

			// 字符串比较
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return state.sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
			}

			// 数字比较
			if (typeof aValue === 'number' && typeof bValue === 'number') {
				return state.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
			}

			// 日期比较
			if (aValue instanceof Date && bValue instanceof Date) {
				return state.sortOrder === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
			}

			return 0;
		});
	}, [data, columns, state.sortBy, state.sortOrder]);

	// 排序处理
	const handleSort = useCallback((columnId: string) => {
		setState((prev) => {
			if (prev.sortBy === columnId) {
				return {
					...prev,
					sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
				};
			}
			return {
				...prev,
				sortBy: columnId,
				sortOrder: 'asc',
			};
		});
	}, []);

	// 行选择
	const toggleRowSelection = useCallback(
		(rowId: string) => {
			setState((prev) => {
				const newSelected = new Set(prev.selectedRows);
				if (newSelected.has(rowId)) {
					newSelected.delete(rowId);
				} else {
					newSelected.add(rowId);
				}
				return { ...prev, selectedRows: newSelected };
			});
		},
		[]
	);

	const toggleAllRows = useCallback(() => {
		setState((prev) => {
			if (prev.selectedRows.size === data.length) {
				return { ...prev, selectedRows: new Set() };
			}
			return { ...prev, selectedRows: new Set(data.map(getRowId)) };
		});
	}, [data, getRowId]);

	const clearSelection = useCallback(() => {
		setState((prev) => ({ ...prev, selectedRows: new Set() }));
	}, []);

	const isRowSelected = useCallback(
		(rowId: string) => {
			return state.selectedRows.has(rowId);
		},
		[state.selectedRows]
	);

	const isAllSelected = state.selectedRows.size === data.length && data.length > 0;
	const isSomeSelected = state.selectedRows.size > 0 && state.selectedRows.size < data.length;

	return {
		data: sortedData,
		columns,
		state,
		handleSort,
		toggleRowSelection,
		toggleAllRows,
		clearSelection,
		isRowSelected,
		isAllSelected,
		isSomeSelected,
		selectedCount: state.selectedRows.size,
		getRowId,
	};
}
