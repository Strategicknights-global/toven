import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	serverTimestamp,
	Timestamp,
	updateDoc,
	type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
	VerificationLocationCreateInput,
	VerificationLocationSchema,
	VerificationLocationUpdateInput,
} from '../schemas/VerificationLocationSchema';
import { executeSearchQuery, executeSearchQueryCount, type SearchParams, type PaginationParams } from '../utils/firestoreSearch';

const COLLECTION_NAME = 'verificationLocations';

const sanitizeString = (value: unknown): string | undefined => {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed || undefined;
};

const mapDoc = (docId: string, data: Record<string, unknown>): VerificationLocationSchema => {
	const toDate = (value: unknown): Date | undefined => {
		if (value instanceof Timestamp) {
			return value.toDate();
		}
		if (value instanceof Date) {
			return value;
		}
		return undefined;
	};

	return {
		id: docId,
		name: String(data.name ?? ''),
		createdAt: toDate(data.createdAt),
		updatedAt: toDate(data.updatedAt),
	};
};

export class VerificationLocationModel {
	static collectionName = COLLECTION_NAME;

	static async findAll(): Promise<VerificationLocationSchema[]> {
		const snapshot = await getDocs(collection(db, this.collectionName));
		return snapshot.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()));
	}

	static async findById(id: string): Promise<VerificationLocationSchema | null> {
		const ref = doc(db, this.collectionName, id);
		const snap = await getDoc(ref);
		if (!snap.exists()) {
			return null;
		}
		return mapDoc(snap.id, snap.data());
	}

	static async create(input: VerificationLocationCreateInput): Promise<string> {
		const payload: DocumentData = {
			name: sanitizeString(input.name) ?? '',
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const docRef = await addDoc(collection(db, this.collectionName), payload);
		return docRef.id;
	}

	static async update(id: string, input: VerificationLocationUpdateInput): Promise<void> {
		const payload: DocumentData = {
			updatedAt: serverTimestamp(),
		};

		if (input.name !== undefined) {
			payload.name = sanitizeString(input.name) ?? '';
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
	): Promise<{ data: VerificationLocationSchema[]; total: number }> {
		const rawData = await executeSearchQuery<Record<string, unknown>>(
			this.collectionName,
			search,
			pagination
		);
		const data = rawData.map((doc) => mapDoc(doc.id as string, doc));
		const total = await executeSearchQueryCount(
			this.collectionName,
			search
		);
		return { data, total };
	}
}
