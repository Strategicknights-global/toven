import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Firestore Search Configuration
 * Defines how to search across multiple fields using server-side filtering
 * Reference: https://cloud.google.com/firestore/native/docs/query-data/multiple-range-fields
 */

export type SearchFieldType = 'text' | 'number' | 'date' | 'enum';

export interface SearchField {
  name: string;
  label: string;
  type: SearchFieldType;
  /** For text fields, use case-insensitive prefix search */
  caseInsensitive?: boolean;
  /** For enum fields, provide valid options */
  options?: string[];
}

export interface PaginationParams {
  pageSize: number;
  pageNumber: number;
}

export interface SearchParams {
  field: string;
  value: string;
  type: SearchFieldType;
}

/**
 * Build a Firestore text search query with case-insensitive prefix matching
 * For email: "john" searches for emails starting with "john" (e.g., john@example.com, johndoe@example.com)
 */
export function buildTextSearchConstraint(field: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const upperBound = `${trimmed}\uf8ff`;

  return [
    where(field, '>=', trimmed),
    where(field, '<=', upperBound),
  ];
}

/**
 * Build a Firestore number range search query
 */
export function buildNumberSearchConstraint(field: string, value: string) {
  if (!value || value.length === 0) {
    return null;
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    return null;
  }

  // For exact match on numbers, just use equality
  return [where(field, '==', num)];
}

/**
 * Build a Firestore date search query
 */
export function buildDateSearchConstraint(field: string, value: string) {
  if (!value || value.length === 0) {
    return null;
  }

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }

    // For date strings, search for that entire day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return [
      where(field, '>=', startOfDay),
      where(field, '<=', endOfDay),
    ];
  } catch {
    return null;
  }
}

/**
 * Build a Firestore enum/status search query
 */
export function buildEnumSearchConstraint(field: string, value: string) {
  if (!value || value.length === 0) {
    return null;
  }

  return [where(field, '==', value)];
}

/**
 * Build search constraints based on field type
 * Returns an array of where clauses that can be chained together
 */
export function buildSearchConstraints(
  field: string,
  value: string,
  type: SearchFieldType = 'text'
): ReturnType<typeof where>[] | null {
  switch (type) {
    case 'text':
      return buildTextSearchConstraint(field, value);
    case 'number':
      return buildNumberSearchConstraint(field, value);
    case 'date':
      return buildDateSearchConstraint(field, value);
    case 'enum':
      return buildEnumSearchConstraint(field, value);
    default:
      return null;
  }
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function generateTextSearchVariants(rawValue: string): string[] {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return [];
  }

  const variants = new Set<string>();
  variants.add(trimmed);
  variants.add(trimmed.toLowerCase());
  variants.add(trimmed.toUpperCase());

  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  variants.add(capitalised);

  const titleCase = toTitleCase(trimmed);
  if (titleCase) {
    variants.add(titleCase);
  }

  return Array.from(variants).filter(Boolean);
}

function resolveFieldValue(data: DocumentData, fieldPath: string): unknown {
  if (!fieldPath.includes('.')) {
    return (data as Record<string, unknown>)[fieldPath];
  }

  return fieldPath.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object') {
      const record = acc as Record<string, unknown>;
      return record[segment];
    }
    return undefined;
  }, data as Record<string, unknown>);
}

function textMatchesPrefix(value: unknown, searchLower: string): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return false;
  }

  return stringValue.toLowerCase().startsWith(searchLower);
}

async function fetchTextSearchDocs(
  coll: CollectionReference<DocumentData>,
  field: string,
  rawValue: string,
  baseConstraints: ReturnType<typeof where>[],
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const variants = generateTextSearchVariants(rawValue);
  if (variants.length === 0) {
    return [];
  }

  const docMap = new Map<string, QueryDocumentSnapshot<DocumentData>>();

  for (const variant of variants) {
    const rangeConstraints = buildTextSearchConstraint(field, variant) ?? [];
    if (rangeConstraints.length === 0) {
      continue;
    }

    const q = query(coll, ...baseConstraints, ...rangeConstraints);
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((docSnap) => {
      if (!docMap.has(docSnap.id)) {
        docMap.set(docSnap.id, docSnap);
      }
    });
  }

  return Array.from(docMap.values());
}

function sortDocsByField(
  docs: QueryDocumentSnapshot<DocumentData>[],
  field: string,
): QueryDocumentSnapshot<DocumentData>[] {
  return [...docs].sort((a, b) => {
    const aValue = resolveFieldValue(a.data(), field);
    const bValue = resolveFieldValue(b.data(), field);
    const aString = aValue === null || aValue === undefined ? '' : String(aValue);
    const bString = bValue === null || bValue === undefined ? '' : String(bValue);
    return aString.localeCompare(bString, undefined, { sensitivity: 'base' });
  });
}

function paginateAndMapDocs<T extends DocumentData>(
  docs: QueryDocumentSnapshot<DocumentData>[],
  pagination: PaginationParams,
): T[] {
  const offset = Math.max(0, (pagination.pageNumber - 1) * pagination.pageSize);
  const limit = pagination.pageSize;

  return docs
    .slice(offset, offset + limit)
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as unknown as T));
}

const extractDateMillis = (value: unknown): number => {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? Number.NEGATIVE_INFINITY : value.getTime();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
  }
  return Number.NEGATIVE_INFINITY;
};

const getDocumentDatePriority = (docSnap: QueryDocumentSnapshot<DocumentData>): number => {
  const data = docSnap.data() as Record<string, unknown>;
  const created = extractDateMillis(data.createdAt ?? data.created_at ?? null);
  if (Number.isFinite(created) && created !== Number.NEGATIVE_INFINITY) {
    return created;
  }
  const updated = extractDateMillis(data.updatedAt ?? data.updated_at ?? null);
  if (Number.isFinite(updated) && updated !== Number.NEGATIVE_INFINITY) {
    return updated;
  }
  const generic = extractDateMillis(data.date ?? data.timestamp ?? null);
  return Number.isFinite(generic) && generic !== Number.NEGATIVE_INFINITY ? generic : Number.NEGATIVE_INFINITY;
};

const sortDocsByNewest = (docs: QueryDocumentSnapshot<DocumentData>[]) => {
  return [...docs].sort((a, b) => getDocumentDatePriority(b) - getDocumentDatePriority(a));
};

/**
 * Execute a server-side paginated search query
 * @param collectionName - Firestore collection name
 * @param searchParams - Search parameters (field, value, type)
 * @param pagination - Pagination params (pageSize, pageNumber)
 * @param additionalConstraints - Additional where clauses to apply
 * @returns Array of documents matching the search
 */
export async function executeSearchQuery<T extends DocumentData>(
  collectionName: string,
  searchParams: SearchParams | null,
  pagination: PaginationParams,
  additionalConstraints: ReturnType<typeof where>[] = []
): Promise<T[]> {
  const coll = collection(db, collectionName);
  const baseConstraints = [...additionalConstraints];

  let isIdSearch = false;

  // Add search constraints if search is provided
  if (searchParams && searchParams.value) {
    if (searchParams.field === 'id') {
      // Special handling for ID field - search document IDs client-side
      isIdSearch = true;
    } else if (searchParams.type === 'text') {
      const textDocs = await fetchTextSearchDocs(coll, searchParams.field, searchParams.value, baseConstraints);
      const searchLower = searchParams.value.trim().toLowerCase();
      const filteredDocs = textDocs.filter((docSnap) => {
        const value = resolveFieldValue(docSnap.data(), searchParams.field);
        return textMatchesPrefix(value, searchLower);
      });
      const sortedDocs = sortDocsByField(filteredDocs, searchParams.field);
      return paginateAndMapDocs<T>(sortedDocs, pagination);
    } else {
      const searchConstraints = buildSearchConstraints(
        searchParams.field,
        searchParams.value,
        searchParams.type
      );

      if (searchConstraints && searchConstraints.length > 0) {
        baseConstraints.push(...searchConstraints);
      }
    }
  }

  // Add ordering for pagination
  // Note: In Firestore, ordering must come after all where clauses for optimal index usage
  const q = query(coll, ...baseConstraints);

  // Execute query
  const snapshot = await getDocs(q);

  let docs = snapshot.docs;

  // Filter by ID if searching on ID field
  if (isIdSearch && searchParams) {
    const searchValueLower = searchParams.value.toLowerCase();
    docs = docs.filter(doc => doc.id.toLowerCase().startsWith(searchValueLower));
  }

  docs = sortDocsByNewest(docs);

  // Manually handle pagination on client-side since Firestore pagination is complex
  // In production, use query cursors for better performance with large datasets
  return paginateAndMapDocs<T>(docs, pagination);
}

/**
 * Execute a search query and get total count
 * @param collectionName - Firestore collection name
 * @param searchParams - Search parameters
 * @param additionalConstraints - Additional where clauses
 * @returns Total count of matching documents
 */
export async function executeSearchQueryCount(
  collectionName: string,
  searchParams: SearchParams | null,
  additionalConstraints: ReturnType<typeof where>[] = []
): Promise<number> {
  const coll = collection(db, collectionName);
  const baseConstraints = [...additionalConstraints];

  let isIdSearch = false;

  // Add search constraints if search is provided
  if (searchParams && searchParams.value) {
    if (searchParams.field === 'id') {
      // Special handling for ID field - search document IDs client-side
      isIdSearch = true;
    } else if (searchParams.type === 'text') {
      const textDocs = await fetchTextSearchDocs(coll, searchParams.field, searchParams.value, baseConstraints);
      const searchLower = searchParams.value.trim().toLowerCase();
      const filteredDocs = textDocs.filter((docSnap) => {
        const value = resolveFieldValue(docSnap.data(), searchParams.field);
        return textMatchesPrefix(value, searchLower);
      });
      return filteredDocs.length;
    } else {
      const searchConstraints = buildSearchConstraints(
        searchParams.field,
        searchParams.value,
        searchParams.type
      );

      if (searchConstraints && searchConstraints.length > 0) {
        baseConstraints.push(...searchConstraints);
      }
    }
  }

  const q = query(coll, ...baseConstraints);
  const snapshot = await getDocs(q);

  let docs = snapshot.docs;

  // Filter by ID if searching on ID field
  if (isIdSearch && searchParams) {
    const searchValueLower = searchParams.value.toLowerCase();
    docs = docs.filter(doc => doc.id.toLowerCase().startsWith(searchValueLower));
  }

  return docs.length;
}

/**
 * Search across a specific field with simple pagination
 * Useful for simple searches without complex filters
 */
export async function simpleSearch<T extends DocumentData>(
  collectionName: string,
  field: string,
  searchValue: string,
  pageSize: number = 10,
  pageNumber: number = 1
): Promise<{ data: T[]; total: number }> {
  if (!searchValue || searchValue.trim().length === 0) {
    // If no search value, return empty results
    return { data: [], total: 0 };
  }

  const coll = collection(db, collectionName);
  const textDocs = await fetchTextSearchDocs(coll, field, searchValue, []);
  const searchLower = searchValue.trim().toLowerCase();
  const filteredDocs = textDocs.filter((docSnap) => {
    const value = resolveFieldValue(docSnap.data(), field);
    return textMatchesPrefix(value, searchLower);
  });
  const sortedDocs = sortDocsByField(filteredDocs, field);

  return {
    data: paginateAndMapDocs<T>(sortedDocs, { pageNumber, pageSize }),
    total: filteredDocs.length,
  };
}

/**
 * Multi-field search - search across multiple fields with OR logic
 * This requires client-side filtering as Firestore doesn't support OR in queries
 * For better performance, implement separate queries per field and merge results
 */
export async function multiFieldSearch<T extends DocumentData>(
  collectionName: string,
  searchValue: string,
  searchFields: SearchField[],
  pageSize: number = 10,
  pageNumber: number = 1
): Promise<{ data: T[]; total: number }> {
  if (!searchValue || searchValue.trim().length === 0) {
    return { data: [], total: 0 };
  }

  const coll = collection(db, collectionName);
  const docMap = new Map<string, T & { id: string }>();
  const searchLower = searchValue.trim().toLowerCase();

  const addDoc = (docSnap: QueryDocumentSnapshot<DocumentData>) => {
    if (docMap.has(docSnap.id)) {
      return;
    }
    docMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as T & { id: string });
  };

  // Query each field separately and merge results
  for (const field of searchFields) {
    if (field.type === 'text') {
      const textDocs = await fetchTextSearchDocs(coll, field.name, searchValue, []);
      const filteredDocs = textDocs.filter((docSnap) => {
        const value = resolveFieldValue(docSnap.data(), field.name);
        return textMatchesPrefix(value, searchLower);
      });
      const sortedDocs = sortDocsByField(filteredDocs, field.name);
      sortedDocs.forEach(addDoc);
      continue;
    }

    const constraints = buildSearchConstraints(field.name, searchValue, field.type) || [];
    if (constraints.length === 0) {
      continue;
    }

    const q = query(coll, ...constraints);
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(addDoc);
  }

  // Apply pagination
  const offset = (pageNumber - 1) * pageSize;
  const mergedDocs = Array.from(docMap.values());
  const paginatedDocs = mergedDocs.slice(offset, offset + pageSize);

  return {
    data: paginatedDocs,
    total: mergedDocs.length,
  };
}
