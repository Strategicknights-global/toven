import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Sparkles, Star, Trash2 } from 'lucide-react';
import StarRating from '../components/StarRating';
import { useRatingsStore } from '../stores/ratingsStore';
import { useToastStore } from '../stores/toastStore';
import ConfirmDialog from '../components/ConfirmDialog';

const personaPresets = [
  'Working Professional',
  'Student',
  'Fitness Enthusiast',
  'Home Chef',
  'Delivery Partner',
  'Subscriber',
];

const getFallbackEmail = (label: string) =>
  `${label.toLowerCase().replace(/[^a-z]+/g, '-') || 'friend'}@stories.toven`;

const PublicDisplayRatingsPage: React.FC = () => {
  const { ratings, loading, createRating, loadRatings, updateStatus, deleteRating } = useRatingsStore();
  const addToast = useToastStore((state) => state.addToast);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    persona: personaPresets[0],
    rating: 5,
    feedback: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'approved' | 'pending' | 'rejected' | 'all'>('approved');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    void loadRatings();
  }, [loadRatings]);

  const filteredRatings = useMemo(() => {
    if (filter === 'all') {
      return ratings;
    }
    return ratings.filter((rating) => rating.status === filter);
  }, [ratings, filter]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.feedback.trim()) {
      addToast('Please provide a name and a feedback quote.', 'error');
      return;
    }

    setSubmitting(true);
    const personaLabel = form.persona.trim() || 'Subscriber';
    const payload = {
      userId: `public-${Date.now()}`,
      userName: form.fullName.trim(),
      userEmail: form.email.trim() || getFallbackEmail(personaLabel),
      rating: Number(form.rating),
      feedback: form.feedback.trim(),
      userRole: personaLabel,
      status: 'approved' as const,
    };

    const id = await createRating(payload);
    setSubmitting(false);

    if (id) {
      setForm({ fullName: '', email: '', persona: personaLabel, rating: 5, feedback: '' });
      addToast('Rating published to public stories.', 'success');
    } else {
      addToast('Failed to create rating.', 'error');
    }
  };

  const handleStatusChange = async (id: string, status: 'approved' | 'pending' | 'rejected') => {
    const success = await updateStatus(id, status);
    addToast(success ? 'Status updated.' : 'Failed to update status.', success ? 'success' : 'error');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-purple-500">Marketing</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold text-slate-900">
              <Sparkles className="h-7 w-7 text-purple-500" /> Public Display Ratings
            </h1>
            <p className="mt-1 text-sm text-slate-600">Curate the testimonials that appear on the landing page carousel.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRatings()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:text-purple-600 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin text-purple-500' : ''}`} />
            Refresh
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Create spotlight rating</h2>
                <p className="text-sm text-slate-500">Add quotes from campaigns, influencers, or call recordings.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Full name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Ananya Sharma"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Persona label</label>
                  <input
                    type="text"
                    value={form.persona}
                    onChange={(event) => setForm((prev) => ({ ...prev, persona: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., Working Professional"
                    list="persona-suggestions"
                  />
                  <datalist id="persona-suggestions">
                    {personaPresets.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Contact email (optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                    placeholder="campaign@toven.in"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Star rating</label>
                <div className="mt-2 flex items-center gap-4">
                  <input
                    type="range"
                    min="3"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(event) => setForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-1 text-purple-700">
                    <Star className="h-4 w-4" />
                    <span className="text-sm font-semibold">{form.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Feedback quote</label>
                <textarea
                  value={form.feedback}
                  onChange={(event) => setForm((prev) => ({ ...prev, feedback: event.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-relaxed focus:border-purple-500 focus:outline-none"
                  rows={5}
                  placeholder="This is the snackable quote that will scroll on the website."
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Tip: keep it under 240 characters for best results.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
                  </span>
                ) : (
                  'Publish to carousel'
                )}
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Live snapshots</h2>
            <p className="text-sm text-slate-500">Track how many approved quotes are live.</p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Approved</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">
                  {ratings.filter((rating) => rating.status === 'approved').length}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Pending</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">
                  {ratings.filter((rating) => rating.status === 'pending').length}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Rejected</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">
                  {ratings.filter((rating) => rating.status === 'rejected').length}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase text-slate-500">Filter</p>
              <div className="mt-2 flex gap-2 overflow-x-auto rounded-full bg-slate-100 p-1">
                {(['approved', 'pending', 'rejected', 'all'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={`flex-1 rounded-full px-4 py-1 text-xs font-semibold capitalize transition ${
                      filter === option ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{filter === 'all' ? 'All Ratings' : `${filter} ratings`}</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {filteredRatings.length} entries
            </span>
          </div>

          {loading && ratings.length === 0 ? (
            <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : filteredRatings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">No ratings match this filter yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRatings.map((rating) => (
                <article key={rating.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{rating.userName}</h3>
                        <span className="rounded-full bg-purple-50 px-3 py-0.5 text-xs font-semibold text-purple-600">
                          {rating.userRole || 'Subscriber'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            rating.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : rating.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {rating.status ?? 'pending'}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">{rating.userEmail}</p>
                      <div className="mt-2">
                        <StarRating readonly rating={rating.rating} size="sm" />
                      </div>
                      <p className="mt-4 text-base leading-relaxed text-slate-800">“{rating.feedback}”</p>
                      <p className="mt-3 text-xs text-slate-500">Updated {formatDate(rating.updatedAt ?? rating.createdAt)}</p>
                    </div>

                    <div className="flex gap-2 sm:flex-col">
                      {rating.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(rating.id!, 'approved')}
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
                        >
                          Publish
                        </button>
                      )}
                      {rating.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(rating.id!, 'pending')}
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                        >
                          Pause
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(rating.id ?? null)}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete rating"
        description="This quote will be removed permanently. Continue?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const success = await deleteRating(deleteTarget);
          addToast(success ? 'Rating deleted.' : 'Failed to delete rating.', success ? 'success' : 'error');
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default PublicDisplayRatingsPage;
