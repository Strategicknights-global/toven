import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type TableOptions,
  type SortingState,
  type ColumnFiltersState,
  type Row,
} from '@tanstack/react-table';

export type DataTableColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

export type DataTableColumnDef<TData, TValue = unknown> = ColumnDef<TData, TValue> & {
  meta?: DataTableColumnMeta;
};

export type DataTableGroupLabelContext<TData extends object> = {
  rawKey: string | null | undefined;
  rows: Row<TData>[];
  level: number;
};

export type DataTableGroupHeaderContext<TData extends object> = DataTableGroupLabelContext<TData> & {
  label: string;
};

export type DataTableGroupOptions<TData extends object> = {
  id?: string;
  getGroupKey: (row: Row<TData>) => string | null | undefined;
  getGroupLabel?: (context: DataTableGroupLabelContext<TData>) => string;
  renderGroupHeader?: (context: DataTableGroupHeaderContext<TData>) => React.ReactNode;
  headerRowClassName?: string;
  headerCellClassName?: string;
  fallbackLabel?: string;
};

export type DataTablePaginationOptions = {
  currentPage: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  totalItems?: number;
};

export type DataTableProps<TData extends object> = {
  columns: DataTableColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  loadingMessage?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  wrapperClassName?: string;
  tableClassName?: string;
  headerBaseClassName?: string;
  cellBaseClassName?: string;
  tableOptions?: Partial<Omit<TableOptions<TData>, 'data' | 'columns'>>;
  enableColumnFilters?: boolean;
  enableSorting?: boolean;
  groupOptions?: DataTableGroupOptions<TData>[];
  pagination?: DataTablePaginationOptions;
  /** server-side search */
  searchFields?: { value: string; label: string }[];
  searchField?: string;
  searchValue?: string;
  onSearchFieldChange?: (field: string) => void;
  onSearchValueChange?: (value: string) => void;
};

// Default page size options. We put 1000 first so it's the default selection.
// Include 0 as a sentinel value representing "All" rows (rendered as "All" in the UI).
const defaultPageSizeOptions = [1000, 5, 10, 25, 50, 100, 10000, 0];

const defaultWrapperClass =
  'overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-950/5 ring-1 ring-slate-200/60';
const defaultTableClass = 'min-w-full divide-y divide-slate-200 text-left text-sm';
const defaultHeaderBaseClass =
  'px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500/80';
const defaultCellBaseClass = 'px-6 py-4 text-sm text-slate-700 align-middle';
// Circular spinner with rounded stroke caps (Android-like) using SVG
const defaultLoadingMessage = (
  <div className="flex flex-col items-center justify-center gap-3 py-2" role="status" aria-live="polite">
    <svg
      className="h-8 w-8 animate-spin text-purple-500"
      viewBox="0 0 50 50"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="currentColor"
        strokeWidth="6"
        className="opacity-20"
      />
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="94"  /* ~2πr where r=15 => stylized dash length */
        strokeDashoffset="70"
      />
    </svg>
    <span className="text-sm font-medium text-slate-500">Loading…</span>
  </div>
);
const defaultEmptyMessage = 'No records found.';

function DataTable<TData extends object>({
  columns,
  data,
  loading = false,
  loadingMessage = defaultLoadingMessage,
  emptyMessage = defaultEmptyMessage,
  wrapperClassName = defaultWrapperClass,
  tableClassName = defaultTableClass,
  headerBaseClassName = defaultHeaderBaseClass,
  cellBaseClassName = defaultCellBaseClass,
  tableOptions,
  enableColumnFilters = false,
  enableSorting = true,
  groupOptions,
  pagination,
  searchFields,
  searchField,
  searchValue,
  onSearchFieldChange,
  onSearchValueChange,
}: DataTableProps<TData>) {
  const { getCoreRowModel: coreRowModelOverride, ...restOptions } = tableOptions ?? {};

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: coreRowModelOverride ?? getCoreRowModel(),
    getFilteredRowModel: enableColumnFilters ? getFilteredRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    state: {
      sorting,
      columnFilters,
      ...restOptions?.state,
    },
    onSortingChange: enableSorting ? setSorting : undefined,
    onColumnFiltersChange: enableColumnFilters ? setColumnFilters : undefined,
    globalFilterFn: 'auto',
    ...restOptions,
  });

  const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1);

  const tableRows = table.getRowModel().rows;

  const buildDisplayItems = React.useCallback(
    (rows: Row<TData>[], level: number): Array<{ type: 'group'; level: number; normalizedKey: string; label: string; rawKey: string | null | undefined; rows: Row<TData>[] } | { type: 'row'; row: Row<TData> }> => {
      if (!groupOptions || groupOptions.length === 0 || level >= groupOptions.length) {
        return rows.map((row) => ({ type: 'row', row }));
      }

      const groupDef = groupOptions[level];
      const groups = new Map<string, { rawKey: string | null | undefined; rows: Row<TData>[] }>();

      rows.forEach((row) => {
        const rawKeyValue = groupDef.getGroupKey(row);
        const hasKey = typeof rawKeyValue === 'string' && rawKeyValue.trim().length > 0;
        const normalizedKey = hasKey ? rawKeyValue!.trim() : `__ungrouped_${level}__`;
        const existing = groups.get(normalizedKey);
        if (existing) {
          existing.rows.push(row);
        } else {
          groups.set(normalizedKey, { rawKey: hasKey ? rawKeyValue!.trim() : rawKeyValue ?? null, rows: [row] });
        }
      });

      const items: Array<{ type: 'group'; level: number; normalizedKey: string; label: string; rawKey: string | null | undefined; rows: Row<TData>[] } | { type: 'row'; row: Row<TData> }> = [];

      for (const [normalizedKey, bucket] of groups.entries()) {
        const label = groupDef.getGroupLabel
          ? groupDef.getGroupLabel({ rawKey: bucket.rawKey, rows: bucket.rows, level })
          : typeof bucket.rawKey === 'string' && bucket.rawKey.trim().length > 0
          ? bucket.rawKey.trim()
          : groupDef.fallbackLabel ?? 'Ungrouped';

        items.push({
          type: 'group',
          level,
          normalizedKey,
          label,
          rawKey: bucket.rawKey,
          rows: bucket.rows,
        });

        items.push(...buildDisplayItems(bucket.rows, level + 1));
      }

      return items;
    },
    [groupOptions]
  );

  const displayItems = React.useMemo(() => buildDisplayItems(tableRows, 0), [buildDisplayItems, tableRows]);

  const activeRows = tableRows.length;
  const totalRows = data.length;

  const paginationMeta = React.useMemo(() => {
    if (!pagination) {
      return null;
    }

    const safePage = Math.max(1, Number.isFinite(pagination.currentPage) ? pagination.currentPage : 1);
    const pageSize = Math.max(1, pagination.pageSize ?? (data.length > 0 ? data.length : 1));
    const totalItems = pagination.totalItems;
    const itemsOnPage = data.length;

    if (totalItems === 0) {
      return {
        label: 'Showing 0 (0)',
        hasPrev: pagination.hasPrev ?? safePage > 1,
        hasNext: pagination.hasNext ?? false,
        safePage,
        pageSize,
      } as const;
    }

    const startIndex = itemsOnPage > 0 ? (safePage - 1) * pageSize + 1 : (safePage - 1) * pageSize + (totalItems ? 1 : 0);
    const endIndex = itemsOnPage > 0
      ? (totalItems != null ? Math.min(totalItems, startIndex + itemsOnPage - 1) : startIndex + itemsOnPage - 1)
      : (totalItems != null ? Math.min(totalItems, startIndex - 1) : startIndex - 1);

    const totalSuffix = totalItems != null ? ` (${totalItems})` : '';

    let label = `Page ${safePage}`;
    if (itemsOnPage > 0) {
      label = totalItems != null
        ? `Showing ${startIndex}-${endIndex}${totalSuffix}`
        : `Showing ${startIndex}-${endIndex}`;
    } else if (totalItems != null) {
      label = `Showing ${Math.max(endIndex, 0)}${totalSuffix}`;
    }

    const computedHasPrev = pagination.hasPrev ?? safePage > 1;
    const computedHasNext = pagination.hasNext ?? (
      totalItems != null
        ? safePage * pageSize < totalItems
        : itemsOnPage >= pageSize
    );

    return {
      label,
      hasPrev: computedHasPrev,
      hasNext: computedHasNext,
      safePage,
      pageSize,
    } as const;
  }, [pagination, data.length]);

  const handlePrevPage = React.useCallback(() => {
    if (!pagination || !paginationMeta) {
      return;
    }
    if (!paginationMeta.hasPrev) {
      return;
    }
    if (pagination.onPageChange) {
      pagination.onPageChange(paginationMeta.safePage - 1);
      return;
    }
    pagination.onPrev?.();
  }, [pagination, paginationMeta]);

  const handleNextPage = React.useCallback(() => {
    if (!pagination || !paginationMeta) {
      return;
    }
    if (!paginationMeta.hasNext) {
      return;
    }
    if (pagination.onPageChange) {
      pagination.onPageChange(paginationMeta.safePage + 1);
      return;
    }
    pagination.onNext?.();
  }, [pagination, paginationMeta]);

  const pageSizeOptions = React.useMemo(() => {
    if (!pagination) {
      return [];
    }
    const baseOptions = pagination.pageSizeOptions && pagination.pageSizeOptions.length > 0 ? pagination.pageSizeOptions : defaultPageSizeOptions;
    const sizeSet = new Set<number>(baseOptions);
    if (pagination.pageSize && Number.isFinite(pagination.pageSize)) {
      sizeSet.add(Math.max(1, Math.floor(pagination.pageSize)));
    }
    return Array.from(sizeSet).filter((size) => Number.isFinite(size) && size > 0).sort((a, b) => a - b);
  }, [pagination]);

  return (
    <div className={wrapperClassName}>
      {(searchFields || enableColumnFilters) && (
        <div className="flex flex-col gap-2 p-4 border-b border-slate-200/70 bg-gradient-to-b from-white to-slate-50/40">
          {searchFields && (
            <div className="flex items-center gap-3">
              <select
                value={searchField ?? ''}
                onChange={(e) => onSearchFieldChange?.(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500"
              >
                <option value="">Select field to search</option>
                {searchFields.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={searchValue ?? ''}
                onChange={(e) => onSearchValueChange?.(e.target.value)}
                placeholder="Search..."
                className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchValueChange?.('')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
              <div className="ml-auto text-xs text-slate-500">
                {activeRows} of {totalRows} rows
              </div>
            </div>
          )}
          {enableColumnFilters && (
            <div className="flex flex-wrap gap-3 pt-1">
              {table.getAllColumns().filter(c => c.getCanFilter()).map(col => (
                <div key={col.id} className="flex items-center gap-1 text-xs">
                  <label className="font-medium text-slate-600" htmlFor={`col-filter-${col.id}`}>{col.columnDef.header as string}</label>
                  <input
                    id={`col-filter-${col.id}`}
                    value={(col.getFilterValue() as string) ?? ''}
                    onChange={e => col.setFilterValue(e.target.value)}
                    placeholder="Filter"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                  />
                  {col.getFilterValue() ? (
                    <button
                      type="button"
                      onClick={() => col.setFilterValue(undefined)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                      aria-label={`Clear filter for ${String(col.id)}`}
                    >
                      <span aria-hidden="true">✕</span>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <table className={tableClassName}>
        <thead className="bg-slate-50/90 text-slate-500">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined;
                const canSort = enableSorting && header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const sortIndicator = sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '';
                const baseHeaderClass = `${headerBaseClassName} ${meta?.headerClassName ?? ''}`.trim();
                return (
                  <th
                    key={header.id}
                    className={canSort ? `${baseHeaderClass} select-none cursor-pointer group` : baseHeaderClass}
                    scope="col"
                    {...(canSort
                      ? {
                          role: 'button',
                          tabIndex: 0,
                          onClick: header.column.getToggleSortingHandler(),
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              header.column.toggleSorting();
                            }
                          },
                        }
                      : {})}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">
                            {sortIndicator || '⇅'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-transparent">
          {loading ? (
            <tr>
              <td colSpan={visibleColumnCount} className={`${cellBaseClassName} py-10 text-center`}> 
                {loadingMessage}
              </td>
            </tr>
          ) : displayItems.length > 0 ? (
            displayItems.map((item, index) => {
              if (item.type === 'group') {
                const definition = groupOptions?.[item.level];
                const headerContent = definition?.renderGroupHeader
                  ? definition.renderGroupHeader({ label: item.label, rawKey: item.rawKey, rows: item.rows, level: item.level })
                  : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{item.label}</span>
                      <span className="text-[11px] text-slate-500">{item.rows.length} items</span>
                    </div>
                  );

                const rowClassName = definition?.headerRowClassName ??
                  (item.level === 0 ? 'bg-slate-200/50 text-slate-700' : 'bg-slate-100/60 text-slate-600');
                const cellClassName = `${cellBaseClassName} ${definition?.headerCellClassName ?? 'py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600'}`.trim();

                return (
                  <tr key={`group-${item.level}-${item.normalizedKey}-${index}`} className={rowClassName}>
                    <td colSpan={visibleColumnCount} className={cellClassName}>
                      {headerContent}
                    </td>
                  </tr>
                );
              }

              const row = item.row;
              return (
                <tr
                  key={row.id}
                  className="group/row border-b border-slate-100/80 last:border-none odd:bg-white even:bg-slate-50/60 transition-colors duration-200 ease-out hover:bg-purple-50/70 focus-within:bg-purple-50/80"
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
                    const className = `${cellBaseClassName} ${meta?.cellClassName ?? ''}`.trim();
                    return (
                      <td key={cell.id} className={className}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={visibleColumnCount}
                className={`${cellBaseClassName} py-12 text-center text-sm font-medium text-slate-500`}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pagination && paginationMeta && (
        <div className="flex flex-col gap-3 border-t border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>{paginationMeta.label}</div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {pagination.onPageSizeChange && pageSizeOptions.length > 0 && (
              <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Rows per page
                <select
                  value={pagination.pageSize ?? pageSizeOptions[0] ?? paginationMeta.pageSize}
                  onChange={(event) => {
                    const nextSize = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(nextSize)) {
                      // Pass the numeric page size. A value of 0 is used to indicate "All" rows.
                      pagination.onPageSizeChange?.(nextSize);
                    }
                  }}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                >
                  {pageSizeOptions.map((sizeOption) => (
                    <option key={String(sizeOption)} value={sizeOption}>
                      {sizeOption === 0 ? 'All' : String(sizeOption)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={!paginationMeta.hasPrev || loading}
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Page {paginationMeta.safePage}</span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!paginationMeta.hasNext || loading}
                className="inline-flex items-center rounded-md border border-purple-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
