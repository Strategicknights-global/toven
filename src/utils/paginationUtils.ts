/**
 * Pagination Utilities for Server-Side Pagination
 * Provides helpers for managing pagination state and calculations
 */

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationConfig {
  initialPage?: number;
  initialPageSize?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

/**
 * Calculate pagination state
 */
export function calculatePaginationState(
  currentPage: number,
  pageSize: number,
  totalItems: number | null
): PaginationState {
  const hasNextPage = totalItems === null || currentPage * pageSize < totalItems;
  const hasPrevPage = currentPage > 1;

  return {
    currentPage,
    pageSize,
    totalItems,
    hasNextPage,
    hasPrevPage,
  };
}

/**
 * Calculate display info for pagination
 */
export function calculatePaginationDisplay(
  currentPage: number,
  pageSize: number,
  totalItems: number | null,
  itemsOnCurrentPage: number
) {
  if (totalItems === null || totalItems === 0) {
    return {
      label: 'No items',
      startIndex: 0,
      endIndex: 0,
      total: 0,
    };
  }

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = startIndex + itemsOnCurrentPage - 1;

  const label = `Showing ${startIndex}-${endIndex} of ${totalItems}`;

  return {
    label,
    startIndex,
    endIndex,
    total: totalItems,
  };
}

/**
 * Validate page number
 */
export function validatePageNumber(page: number | string): number {
  const num = typeof page === 'string' ? parseInt(page, 10) : page;
  return Math.max(1, Number.isFinite(num) ? num : 1);
}

/**
 * Validate page size
 */
export function validatePageSize(
  size: number | string,
  min: number = 1,
  max: number = 100
): number {
  const num = typeof size === 'string' ? parseInt(size, 10) : size;
  const validated = Number.isFinite(num) ? num : min;
  return Math.max(min, Math.min(max, validated));
}

/**
 * Get offset for Firestore queries
 */
export function getQueryOffset(page: number, pageSize: number): number {
  return Math.max(0, (page - 1) * pageSize);
}

/**
 * Default page size options for dropdowns
 */
export const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

/**
 * Get recommended page size options based on data volume
 */
export function getPageSizeOptions(
  estimatedTotalItems: number | null,
  defaultOptions: number[] = DEFAULT_PAGE_SIZE_OPTIONS
): number[] {
  if (estimatedTotalItems === null) {
    return defaultOptions;
  }

  // For small datasets, suggest smaller page sizes
  if (estimatedTotalItems < 50) {
    return [5, 10, 25];
  }

  if (estimatedTotalItems < 200) {
    return [10, 25, 50];
  }

  return defaultOptions;
}

/**
 * Create a hook-friendly pagination state manager
 */
export class PaginationManager {
  private currentPage: number;
  private pageSize: number;
  private totalItems: number | null;

  constructor(config?: PaginationConfig) {
    this.currentPage = config?.initialPage ?? 1;
    this.pageSize = config?.initialPageSize ?? config?.defaultPageSize ?? 10;
    this.totalItems = null;
  }

  getState(): PaginationState {
    return calculatePaginationState(this.currentPage, this.pageSize, this.totalItems);
  }

  setCurrentPage(page: number) {
    this.currentPage = validatePageNumber(page);
  }

  setPageSize(size: number) {
    this.pageSize = validatePageSize(size);
    // Reset to first page when changing page size
    this.currentPage = 1;
  }

  setTotalItems(total: number | null) {
    this.totalItems = total;
  }

  nextPage() {
    if (this.hasNextPage()) {
      this.currentPage += 1;
    }
  }

  prevPage() {
    if (this.hasPrevPage()) {
      this.currentPage -= 1;
    }
  }

  hasNextPage(): boolean {
    if (this.totalItems === null) return true;
    return this.currentPage * this.pageSize < this.totalItems;
  }

  hasPrevPage(): boolean {
    return this.currentPage > 1;
  }

  reset() {
    this.currentPage = 1;
  }

  getOffset(): number {
    return getQueryOffset(this.currentPage, this.pageSize);
  }

  getQueryParams() {
    return {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      offset: this.getOffset(),
    };
  }

  getDisplayInfo(itemsOnCurrentPage: number) {
    return calculatePaginationDisplay(
      this.currentPage,
      this.pageSize,
      this.totalItems,
      itemsOnCurrentPage
    );
  }
}
