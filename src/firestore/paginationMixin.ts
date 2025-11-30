/**
 * Pagination Model Mixin
 * Template for adding searchPaginated to models
 * Usage: Import and use in your model class
 */

import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';
import type { DocumentData } from 'firebase/firestore';

/**
 * Add this method to all models for server-side paginated search
 * @param collectionName - Name of the Firestore collection
 * @param pagination - Pagination parameters
 * @param search - Optional search parameters
 * @returns Data and total count
 */
export async function addSearchPaginatedMethod<T extends DocumentData>(
  collectionName: string,
  pagination: PaginationParams,
  search: SearchParams | null = null
): Promise<{ data: T[]; total: number }> {
  const data = await executeSearchQuery<T>(
    collectionName,
    search,
    pagination
  );
  const total = await executeSearchQueryCount(
    collectionName,
    search
  );
  return { data, total };
}
