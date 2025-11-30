import React, { useState } from 'react';
import { X } from 'lucide-react';
import StarRating from './StarRating';
import { useRatingsStore } from '../stores/ratingsStore';
import { useUserRoleStore } from '../stores/userRoleStore';
import { useToastStore } from '../stores/toastStore';

interface SubmitRatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubmitRatingDialog: React.FC<SubmitRatingDialogProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { user } = useUserRoleStore();
  const createRating = useRatingsStore((state) => state.createRating);
  const addToast = useToastStore((state) => state.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      addToast('You must be logged in to submit a rating', 'error');
      return;
    }

    if (rating === 0) {
      addToast('Please select a rating', 'error');
      return;
    }

    if (feedback.trim().length === 0) {
      addToast('Please provide feedback', 'error');
      return;
    }

    setSubmitting(true);

    const success = await createRating({
      userId: user.uid,
      userName: user.displayName || user.email || 'Anonymous',
      userEmail: user.email || '',
      rating,
      feedback: feedback.trim(),
      status: 'pending',
    });

    setSubmitting(false);

    if (success) {
      addToast('Thanks for sharing your experience! We read every note to keep raising the bar.', 'success');
      setRating(0);
      setFeedback('');
      onClose();
    } else {
      addToast('Failed to submit rating. Please try again.', 'error');
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setRating(0);
      setFeedback('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Rate Your Experience</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                How would you rate our service?
              </label>
              <div className="flex justify-center py-4">
                <StarRating rating={rating} onRatingChange={setRating} size="lg" />
              </div>
              {rating > 0 && (
                <p className="mt-2 text-center text-sm text-slate-600">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </div>

            {/* Feedback */}
            <div>
              <label htmlFor="feedback" className="mb-2 block text-sm font-semibold text-slate-700">
                Tell us about your experience
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="What did you like or dislike about our service?"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={submitting}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Your feedback helps us improve our service
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0 || feedback.trim().length === 0}
              className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitRatingDialog;
