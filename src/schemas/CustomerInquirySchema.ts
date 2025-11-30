export type CustomerInquiryStatus = 'new' | 'in_progress' | 'resolved';

export interface CustomerInquirySchema {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: CustomerInquiryStatus;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string | null;
  customerShortId?: string | null;
}

export type CustomerInquiryCreateInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  status?: CustomerInquiryStatus;
};

export type CustomerInquiryUpdateInput = Partial<{
  name: string;
  email: string;
  subject: string;
  message: string;
  status: CustomerInquiryStatus;
}>;
