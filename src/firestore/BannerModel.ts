import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { BannerCreateInput, BannerSchema, BannerUpdateInput, BannerPlacement } from '../schemas/BannerSchema';
import { isBannerPlacement } from '../schemas/BannerSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'banners';

const VALID_PLACEMENTS = new Set<BannerPlacement>([
  'home',
  'packages',
  'home-meal',
  'home-categories',
  'diet-meal',
  'subscription',
  'addons',
  'party-orders',
  'about',
  'contact',
]);

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

const mapDoc = (docId: string, data: Record<string, unknown>): BannerSchema => {
  const placementRaw = String(data.placement ?? 'home');
  const placement = isBannerPlacement(placementRaw) && VALID_PLACEMENTS.has(placementRaw)
    ? placementRaw
    : 'home';

  return {
    id: docId,
    placement,
    fileName: String(data.fileName ?? 'banner'),
    title: typeof data.title === 'string' ? data.title : null,
  description: typeof data.description === 'string' ? data.description : null,
  ctaLabel: typeof data.ctaLabel === 'string' ? data.ctaLabel : null,
  ctaHref: typeof data.ctaHref === 'string' ? data.ctaHref : null,
    imageBase64: typeof data.imageBase64 === 'string' ? data.imageBase64 : null,
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : null,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : null,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

export class BannerModel {
  static collectionName = COLLECTION_NAME;

  static ensurePlacement(placement: BannerPlacement): BannerPlacement {
    if (!VALID_PLACEMENTS.has(placement)) {
      return 'home';
    }
    return placement;
  }

  private static sortBanners(list: BannerSchema[]): BannerSchema[] {
    return [...list].sort((a, b) => {
      const aHasSortOrder = typeof a.sortOrder === 'number';
      const bHasSortOrder = typeof b.sortOrder === 'number';

      if (aHasSortOrder && bHasSortOrder) {
        if (a.sortOrder! !== b.sortOrder!) {
          return a.sortOrder! - b.sortOrder!;
        }
      } else if (aHasSortOrder !== bHasSortOrder) {
        return aHasSortOrder ? -1 : 1;
      }

      const aCreated = a.createdAt?.getTime() ?? 0;
      const bCreated = b.createdAt?.getTime() ?? 0;
      return bCreated - aCreated;
    });
  }

  private static preparePlacementBanners(list: BannerSchema[]): BannerSchema[] {
    const filtered = list.filter((banner) => banner.isActive !== false && (banner.imageBase64 || banner.imageUrl));
    return this.sortBanners(filtered);
  }

  static async findAll(): Promise<BannerSchema[]> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data())) as BannerSchema[];
  }

  static async findActiveByPlacement(placement: BannerPlacement): Promise<BannerSchema[]> {
    const ensuredPlacement = this.ensurePlacement(placement);
    const placementQuery = query(collection(db, this.collectionName), where('placement', '==', ensuredPlacement));
    const snapshot = await getDocs(placementQuery);
    const mapped = snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
    return this.preparePlacementBanners(mapped);
  }

  static async findById(id: string): Promise<BannerSchema | null> {
    const ref = doc(db, this.collectionName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return mapDoc(snap.id, snap.data());
  }

  static async create(input: BannerCreateInput): Promise<string> {
    const placement = this.ensurePlacement(input.placement);

    const payload: DocumentData = {
      placement,
      fileName: input.fileName || 'banner',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const title = normalizeString(input.title);
    if (title !== null) {
      payload.title = title;
    }

    const description = normalizeString(input.description);
    if (description !== null) {
      payload.description = description;
    }

    const ctaLabel = normalizeString(input.ctaLabel);
    if (ctaLabel !== null) {
      payload.ctaLabel = ctaLabel;
    }

    const ctaHref = normalizeString(input.ctaHref);
    if (ctaHref !== null) {
      payload.ctaHref = ctaHref;
    }

    if (typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)) {
      payload.sortOrder = input.sortOrder;
    }

    if (typeof input.isActive === 'boolean') {
      payload.isActive = input.isActive;
    }

    const imageBase64 = normalizeString(input.imageBase64);
    const imageUrl = normalizeString(input.imageUrl);

    if (!imageBase64 && !imageUrl) {
      throw new Error('Provide an image before saving the banner.');
    }

    if (imageBase64) {
      payload.imageBase64 = imageBase64;
    }

    if (imageUrl) {
      payload.imageUrl = imageUrl;
    }

    const docRef = await addDoc(collection(db, this.collectionName), payload);
    return docRef.id;
  }

  static async update(id: string, input: BannerUpdateInput): Promise<void> {
    const payload: DocumentData = {
      updatedAt: serverTimestamp(),
    };

    if (input.placement) {
      payload.placement = this.ensurePlacement(input.placement);
    }

    if (typeof input.fileName === 'string') {
      const trimmed = input.fileName.trim();
      if (trimmed) {
        payload.fileName = trimmed;
      }
    }

    if (input.title !== undefined) {
      payload.title = normalizeString(input.title);
    }

    if (input.description !== undefined) {
      payload.description = normalizeString(input.description);
    }

    if (input.ctaLabel !== undefined) {
      payload.ctaLabel = normalizeString(input.ctaLabel);
    }

    if (input.ctaHref !== undefined) {
      payload.ctaHref = normalizeString(input.ctaHref);
    }

    if (input.sortOrder !== undefined) {
      if (input.sortOrder === null) {
        payload.sortOrder = null;
      } else if (typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)) {
        payload.sortOrder = input.sortOrder;
      }
    }

    if (typeof input.isActive === 'boolean') {
      payload.isActive = input.isActive;
    }

    if (input.imageBase64 !== undefined) {
      const value = normalizeString(input.imageBase64);
      payload.imageBase64 = value;
      if (!value && input.imageUrl === undefined) {
        payload.imageUrl = null;
      }
    }

    if (input.imageUrl !== undefined) {
      const value = normalizeString(input.imageUrl);
      payload.imageUrl = value;
    }

    await updateDoc(doc(db, this.collectionName, id), payload);
  }

  static async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  // Server-side paginated search
  static async searchPaginated(
    pagination: PaginationParams,
    search: SearchParams | null = null
  ): Promise<{ data: BannerSchema[]; total: number }> {
    // Fetch raw docs (may contain Firestore Timestamp values)
  const raw = await executeSearchQuery<Record<string, unknown> & { id: string }>(
      this.collectionName,
      search,
      pagination
    );
    const total = await executeSearchQueryCount(
      this.collectionName,
      search
    );
    // Normalize fields via mapDoc to ensure Date instances for createdAt/updatedAt
    const data: BannerSchema[] = raw.map((doc) => mapDoc(String(doc.id), doc as Record<string, unknown>));
    return { data, total };
  }
}
