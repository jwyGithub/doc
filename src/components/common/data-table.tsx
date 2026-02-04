import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from './empty-state';
import { useTable, type ColumnDef } from '@/hooks/use-table';
import type { LucideIcon } from 'lucide-react';

export interface DataTableProps<T> {
	data: T[];
	columns: ColumnDef<T>[];
	loading?: boolean;
	emptyIcon?: LucideIcon;
	emptyTitle?: string;
	emptyDescription?: string;
	getRowId?: (row: T) => string;
	onRowClick?: (row: T) => void;
	initialSortBy?: string;
	initialSortOrder?: 'asc' | 'desc';
	className?: string;
	bordered?: boolean;
}

export function DataTable<T>({
	data,
	columns,
	loading = false,
	emptyIcon,
	emptyTitle = '暂无数据',
	emptyDescription,
	getRowId = (row) => String((row as Record<string, unknown>).id),
	onRowClick,
	initialSortBy,
	initialSortOrder = 'asc',
	className = '',
	bordered = true,
}: DataTableProps<T>) {
	const table = useTable({
		data,
		columns,
		getRowId,
		initialSortBy,
		initialSortOrder,
	});

	const getSortIcon = (columnId: string) => {
		if (table.state.sortBy !== columnId) {
			return <ArrowUpDown className="ml-2 h-4 w-4" />;
		}
		return table.state.sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
	};

	const getCellValue = (row: T, column: ColumnDef<T>): React.ReactNode => {
		// 如果有自定义cell渲染函数
		if (column.cell) {
			return column.cell(row);
		}

		// 如果accessor是函数
		if (typeof column.accessor === 'function') {
			const value = column.accessor(row);
			return value != null ? String(value) : null;
		}

		// 如果accessor是属性名
		if (column.accessor) {
			const value = (row as Record<string, unknown>)[column.accessor as string];
			return value != null ? String(value) : null;
		}

		return null;
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-16 w-full" />
				))}
			</div>
		);
	}

	if (data.length === 0) {
		return emptyIcon ? (
			<EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
		) : (
			<div className="text-center py-12 text-muted-foreground">
				<p>{emptyTitle}</p>
				{emptyDescription && <p className="text-sm mt-2">{emptyDescription}</p>}
			</div>
		);
	}

	return (
		<div className={bordered ? 'border rounded-lg' : ''}>
			<Table className={className}>
				<TableHeader>
					<TableRow>
						{columns.map((column) => (
							<TableHead
								key={column.id}
								className={column.className}
								style={column.width ? { width: column.width } : undefined}
							>
								{column.sortable ? (
									<Button
										variant="ghost"
										size="sm"
										className="-ml-3 h-8 data-[state=open]:bg-accent"
										onClick={() => table.handleSort(column.id)}
									>
										<span>{column.header}</span>
										{getSortIcon(column.id)}
									</Button>
								) : (
									column.header
								)}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{table.data.map((row) => {
						const rowId = getRowId(row);
						return (
							<TableRow
								key={rowId}
								className={onRowClick ? 'cursor-pointer' : ''}
								onClick={() => onRowClick?.(row)}
							>
								{columns.map((column) => (
									<TableCell key={column.id} className={column.className}>
										{getCellValue(row, column)}
									</TableCell>
								))}
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
