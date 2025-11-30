import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  GraduationCap,
  User,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import DataTable, { type DataTableColumnDef } from '../components/DataTable';
import Dialog from '../components/Dialog';
import IconButton from '../components/IconButton';
import { useStudentVerificationStore } from '../stores/studentVerificationStore';
import type { StudentVerificationSchema, StudentVerificationStatus } from '../schemas/StudentVerificationSchema';
import { auth } from '../firebase';
import { UserModel } from '../firestore';
import { getSearchFieldsForCollection } from '../utils/searchFieldMappings';

const statusMeta: Record<StudentVerificationStatus, { label: string; badge: string; accent: string }> = {
  pending: {
    label: 'Pending review',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: 'text-amber-600',
  },
  approved: {
    label: 'Approved',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: 'text-emerald-600',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-rose-50 text-rose-600 border-rose-200',
    accent: 'text-rose-600',
  },
};

const formatDateTime = (value?: Date | null): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  } catch (error) {
    console.error('Failed to format datetime', error);
    return value.toLocaleString();
  }
};

const StudentVerifyPage: React.FC = () => {
  const verifications = useStudentVerificationStore((state) => state.verifications);
  const loading = useStudentVerificationStore((state) => state.loading);
  const updatingId = useStudentVerificationStore((state) => state.updatingId);
  const updateStatus = useStudentVerificationStore((state) => state.updateStatus);
  const totalItems = useStudentVerificationStore((state) => state.totalItems);
  const paginatedData = useStudentVerificationStore((state) => state.paginatedData);

  const [viewingVerification, setViewingVerification] = useState<StudentVerificationSchema | null>(null);
  const [decisionVerification, setDecisionVerification] = useState<StudentVerificationSchema | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [reviewer, setReviewer] = useState<{ id: string; name: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);
  const [searchField, setSearchField] = useState('studentId');
  const [searchValue, setSearchValue] = useState('');
  const searchFields = useMemo(() => getSearchFieldsForCollection('studentVerifications'), []);

  useEffect(() => {
    const search = searchValue ? { field: searchField, type: 'text' as const, value: searchValue } : null;
    void paginatedData({ pageNumber: currentPage, pageSize, search });
  }, [currentPage, pageSize, searchField, searchValue, paginatedData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue]);

  useEffect(() => {
    const current = auth.currentUser;
    if (!current) {
      return;
    }

    let active = true;
    (async () => {
      let resolvedName = current.displayName?.trim() ?? '';
      try {
        const record = await UserModel.findById(current.uid);
        if (record?.fullName && record.fullName.trim().length > 0) {
          resolvedName = record.fullName.trim();
        }
      } catch (error) {
        console.error('Failed to resolve reviewer name', error);
      }
      if (!resolvedName) {
        resolvedName = current.email?.split('@')[0] ?? 'Admin';
      }
      if (active) {
        setReviewer({ id: current.uid, name: resolvedName });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const sortedVerifications = useMemo(() => {
    return [...verifications].sort((a, b) => {
      const statusOrder: Record<StudentVerificationStatus, number> = {
        pending: 0,
        approved: 1,
        rejected: 2,
      };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }
      const aTime = a.createdAt?.getTime() ?? 0;
      const bTime = b.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [verifications]);

  const metrics = useMemo(() => {
    const pending = verifications.filter((item) => item.status === 'pending').length;
    const approved = verifications.filter((item) => item.status === 'approved').length;
    const rejected = verifications.filter((item) => item.status === 'rejected').length;
    return { pending, approved, rejected };
  }, [verifications]);

  const openDecisionModal = useCallback((verification: StudentVerificationSchema, action: 'approve' | 'reject') => {
    setDecisionVerification(verification);
    setDecisionAction(action);
    setDecisionNote('');
    setDecisionError(null);
  }, []);

  const handleCloseDecision = useCallback(() => {
    if (decisionLoading) {
      return;
    }
    setDecisionVerification(null);
    setDecisionNote('');
    setDecisionError(null);
  }, [decisionLoading]);

  const handleDecisionConfirm = useCallback(async () => {
    if (!decisionVerification || !reviewer) {
      return;
    }
    if (decisionAction === 'reject' && decisionNote.trim().length === 0) {
      setDecisionError('Please add a brief note for rejection.');
      return;
    }

    setDecisionLoading(true);
    try {
      await updateStatus(decisionVerification.id!, {
        status: decisionAction === 'approve' ? 'approved' : 'rejected',
        statusNote: decisionNote.trim().length > 0 ? decisionNote.trim() : null,
        reviewedBy: reviewer.id,
        reviewedByName: reviewer.name,
      });
      setDecisionVerification(null);
      setDecisionNote('');
      setDecisionError(null);
    } catch (error) {
      console.error('Failed to update verification status', error);
    } finally {
      setDecisionLoading(false);
    }
  }, [decisionAction, decisionNote, decisionVerification, reviewer, updateStatus]);

  const columns = useMemo<DataTableColumnDef<StudentVerificationSchema>[]>(() => [
    {
      id: 'customerId',
      header: 'Customer ID',
      meta: { cellClassName: 'align-middle text-sm font-medium text-slate-700' },
      cell: ({ row }) => {
        const verification = row.original;
        return verification.studentId || '—';
      },
    },
    {
      id: 'customerName',
      header: 'Customer Name',
      meta: { cellClassName: 'align-middle text-sm text-slate-700' },
      cell: ({ row }) => row.original.userName,
    },
    {
      id: 'mobile',
      header: 'Mobile',
      meta: { cellClassName: 'align-middle text-sm text-slate-600' },
      cell: ({ row }) => row.original.userPhone ?? '—',
    },
    {
      id: 'email',
      header: 'Email',
      meta: { cellClassName: 'align-middle text-sm text-slate-600' },
      cell: ({ row }) => row.original.userEmail ?? '—',
    },
    {
      id: 'institution',
      header: 'College / Institution',
      meta: { cellClassName: 'align-middle text-sm text-slate-700' },
      cell: ({ row }) => row.original.institutionName,
    },
    {
      id: 'courseCompletion',
      header: 'Year of Course Completion',
      meta: { cellClassName: 'align-middle text-sm text-slate-600' },
      cell: ({ row }) => row.original.expectedGraduation ?? row.original.yearOfStudy ?? '—',
    },
    {
      id: 'idCard',
      header: 'ID Card Photo',
      meta: { cellClassName: 'align-middle' },
      cell: ({ row }) => {
        const { studentIdCardImage } = row.original;
        if (!studentIdCardImage) {
          return <span className="text-sm text-slate-400">No upload</span>;
        }

        const isImage = studentIdCardImage.startsWith('data:image');
        return (
          <button
            type="button"
            onClick={() => setViewingVerification(row.original)}
            className="inline-flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            {isImage ? 'View Image' : 'View File'}
          </button>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { headerClassName: 'text-center', cellClassName: 'align-middle text-center' },
      cell: ({ row }) => {
        const verification = row.original;
        const isUpdating = updatingId === verification.id;

        return (
          <div className="flex flex-col items-center gap-2">
            <IconButton
              label="View"
              icon={<Eye size={16} />}
              onClick={() => setViewingVerification(verification)}
              title="View details"
              className="h-8 w-full bg-slate-50 text-slate-600 hover:bg-slate-100"
            />
            {verification.status === 'pending' && (
              <>
                <IconButton
                  label="Approve"
                  icon={<CheckCircle2 size={16} />}
                  onClick={() => openDecisionModal(verification, 'approve')}
                  title="Approve"
                  className="h-8 w-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  disabled={isUpdating}
                />
                <IconButton
                  label="Reject"
                  icon={<XCircle size={16} />}
                  onClick={() => openDecisionModal(verification, 'reject')}
                  title="Reject"
                  className="h-8 w-full bg-rose-50 text-rose-600 hover:bg-rose-100"
                  disabled={isUpdating}
                />
              </>
            )}
          </div>
        );
      },
    },
  ], [openDecisionModal, updatingId]);

  if (loading && verifications.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="text-sm text-slate-500">Loading verifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Student Verification</h1>
          <p className="mt-1 text-sm text-slate-500">Review and verify student identity submissions</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-3">
              <AlertCircle size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{metrics.pending}</p>
              <p className="text-xs font-medium text-amber-600">Pending Review</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-3">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{metrics.approved}</p>
              <p className="text-xs font-medium text-emerald-600">Approved</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-rose-100 p-3">
              <XCircle size={24} className="text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-700">{metrics.rejected}</p>
              <p className="text-xs font-medium text-rose-600">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div>
        <DataTable
          columns={columns}
          data={sortedVerifications}
          loading={loading}
          emptyMessage="No student verification requests found"
          pagination={{
            currentPage,
            pageSize,
            totalItems: totalItems ?? 0,
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
          }}
          searchFields={searchFields.map(f => ({ value: f.name, label: f.label }))}
          searchField={searchField}
          searchValue={searchValue}
          onSearchFieldChange={setSearchField}
          onSearchValueChange={setSearchValue}
        />
      </div>

      {/* View Details Dialog */}
      <Dialog
        open={!!viewingVerification}
        onClose={() => setViewingVerification(null)}
        title="Verification Details"
        size="xl"
      >
        {viewingVerification && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <User size={16} className="text-purple-500" />
                  Student Information
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {viewingVerification.userName}</p>
                  {viewingVerification.userEmail && (
                    <p><strong>Email:</strong> {viewingVerification.userEmail}</p>
                  )}
                  {viewingVerification.userPhone && (
                    <p><strong>Phone:</strong> {viewingVerification.userPhone}</p>
                  )}
                  {viewingVerification.verificationLocationName && (
                    <p><strong>Verification location:</strong> {viewingVerification.verificationLocationName}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <GraduationCap size={16} className="text-purple-500" />
                  Academic Details
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Student ID:</strong> {viewingVerification.studentId}</p>
                  <p><strong>Institution:</strong> {viewingVerification.institutionName}</p>
                  <p><strong>Course:</strong> {viewingVerification.course}</p>
                  <p><strong>Year of Study:</strong> {viewingVerification.yearOfStudy}</p>
                  {viewingVerification.expectedGraduation && (
                    <p><strong>Expected Graduation:</strong> {viewingVerification.expectedGraduation}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText size={16} className="text-purple-500" />
                Uploaded Documents
              </h3>
              <div className="space-y-3">
                {viewingVerification.studentIdCardImage && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-600">Student ID Card:</p>
                    <img
                      src={viewingVerification.studentIdCardImage}
                      alt="Student ID Card"
                      className="max-h-64 rounded border border-slate-200"
                    />
                  </div>
                )}
                {viewingVerification.enrollmentCertificate && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-600">Enrollment Certificate:</p>
                    {viewingVerification.enrollmentCertificate.startsWith('data:image') ? (
                      <img
                        src={viewingVerification.enrollmentCertificate}
                        alt="Enrollment Certificate"
                        className="max-h-64 rounded border border-slate-200"
                      />
                    ) : (
                      <a
                        href={viewingVerification.enrollmentCertificate}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Document
                      </a>
                    )}
                  </div>
                )}
                {viewingVerification.additionalDocument && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-600">Additional Document:</p>
                    {viewingVerification.additionalDocument.startsWith('data:image') ? (
                      <img
                        src={viewingVerification.additionalDocument}
                        alt="Additional Document"
                        className="max-h-64 rounded border border-slate-200"
                      />
                    ) : (
                      <a
                        href={viewingVerification.additionalDocument}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Document
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                    statusMeta[viewingVerification.status].badge
                  }`}
                >
                  {statusMeta[viewingVerification.status].label}
                </span>
              </div>
              {viewingVerification.reviewedAt && (
                <p className="mt-2 text-xs text-slate-500">
                  Reviewed on {formatDateTime(viewingVerification.reviewedAt)}
                  {viewingVerification.reviewedByName && ` by ${viewingVerification.reviewedByName}`}
                </p>
              )}
              {viewingVerification.statusNote && (
                <p className="mt-2 text-sm text-slate-600">
                  <strong>Note:</strong> {viewingVerification.statusNote}
                </p>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Decision Dialog */}
      <Dialog
        open={!!decisionVerification}
        onClose={handleCloseDecision}
        title={decisionAction === 'approve' ? 'Approve Verification' : 'Reject Verification'}
        size="md"
      >
        {decisionVerification && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                <strong>Student:</strong> {decisionVerification.userName}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Institution:</strong> {decisionVerification.institutionName}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Student ID:</strong> {decisionVerification.studentId}
              </p>
            </div>

            <div>
              <label htmlFor="decisionNote" className="mb-2 block text-sm font-medium text-slate-700">
                {decisionAction === 'approve' ? 'Note (optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                id="decisionNote"
                value={decisionNote}
                onChange={(e) => {
                  setDecisionNote(e.target.value);
                  setDecisionError(null);
                }}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={
                  decisionAction === 'approve'
                    ? 'Add any notes for this verification...'
                    : 'Please explain why this verification is being rejected...'
                }
              />
              {decisionError && <p className="mt-1 text-xs text-red-600">{decisionError}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDecisionConfirm}
                disabled={decisionLoading}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 disabled:opacity-50 ${
                  decisionAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                }`}
              >
                {decisionLoading
                  ? 'Processing...'
                  : decisionAction === 'approve'
                  ? 'Approve'
                  : 'Reject'}
              </button>
              <button
                onClick={handleCloseDecision}
                disabled={decisionLoading}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default StudentVerifyPage;
