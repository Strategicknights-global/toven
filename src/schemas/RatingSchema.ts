export interface RatingSchema {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1-5 stars
  feedback: string;
  createdAt: Date;
  updatedAt?: Date;
  // Optional metadata
  userRole?: string;
  status?: 'pending' | 'approved' | 'rejected';
}
