import React from 'react';
import StarRating from './StarRating';
import { useRatingsStore } from '../stores/ratingsStore';

type CarouselItem = {
	id: string;
	name: string;
	role: string;
	rating: number;
	feedback: string;
	createdAt?: Date;
};

const formatDate = (value?: Date): string | null => {
	if (!value) return null;
	try {
		return new Intl.DateTimeFormat('en-IN', {
			month: 'short',
			year: 'numeric',
		}).format(value);
	} catch (error) {
		console.error('Failed to format date', error);
		return value.toDateString();
	}
};

interface InfiniteRatingScrollProps {
	className?: string;
}

const InfiniteRatingScroll: React.FC<InfiniteRatingScrollProps> = ({ className }) => {
	const { ratings, loadApprovedRatings, loading } = useRatingsStore();
	const initializedRef = React.useRef(false);
	const scrollRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (initializedRef.current) return;
		initializedRef.current = true;
		void loadApprovedRatings();
	}, [loadApprovedRatings]);

	const approved = React.useMemo(
		() => ratings.filter((rating) => rating.status === 'approved'),
		[ratings],
	);

	const baseItems: CarouselItem[] = React.useMemo(() => {
		return approved.map((rating, index) => ({
			id: rating.id ?? `rating-${index}`,
			name: rating.userName || rating.userEmail || 'Happy Customer',
			role: rating.userRole || 'Subscriber',
			rating: rating.rating,
			feedback: rating.feedback || 'Loved the experience!',
			createdAt: rating.createdAt instanceof Date ? rating.createdAt : undefined,
		}));
	}, [approved]);

	const showSection = baseItems.length > 0 || loading;

	const averageRating = React.useMemo(() => {
		if (baseItems.length === 0) return 0;
		const total = baseItems.reduce((sum, item) => sum + item.rating, 0);
		return total / baseItems.length;
	}, [baseItems]);

	const scrollLeft = () => {
		scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
	};

	const scrollRight = () => {
		scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
	};

	if (!showSection) return null;

	return (
		<section className={`bg-slate-950 text-white py-20 relative overflow-hidden ${className ?? ''}`}>
			<div
				className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent)]"
				aria-hidden="true"
			/>

			<div className="relative w-full px-4 sm:px-8 lg:px-16 xl:px-20 2xl:px-28">
				<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-lg uppercase tracking-[0.45em] text-purple-200">Feedbacks</p>
						<h2 className="text-3xl sm:text-4xl font-bold mt-3">Loved by foodies across the city</h2>
					</div>

					<div className="flex items-center gap-4">
						<div className="rounded-2xl bg-white/10 px-6 py-4 backdrop-blur border border-white/10">
							<p className="text-sm text-purple-200">Average Rating</p>
							<div className="flex items-center gap-2 mt-2">
								<span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
								<StarRating rating={Math.round(averageRating * 2) / 2} readonly size="sm" />
							</div>
							<p className="text-xs text-slate-300 mt-1">
								{baseItems.length > 0
									? `${approved.length}+ verified reviews`
									: 'Waiting for first public review'}
							</p>
						</div>
					</div>
				</div>

				<div className="mt-12 relative">
					{baseItems.length > 0 ? (
						<div className="relative group">

							{/* Left Scroll Button */}
							<button
								onClick={scrollLeft}
								className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-white/5 border border-white/10 backdrop-blur text-white px-3 py-2 rounded-full opacity-30 group-hover:opacity-70 transition"
							>
								‹
							</button>

							{/* Scrollable Content */}
							<div
								ref={scrollRef}
								className="flex gap-6 overflow-x-auto py-2 scrollbar-hide"
								style={{ scrollbarWidth: 'none' }} // Firefox
							>
								{baseItems.map((item, index) => (
									<article
										key={`${item.id}-${index}`}
										className="min-w-[280px] max-w-sm bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur shadow-[0_20px_45px_rgba(15,23,42,0.45)]"
									>
										<div className="flex items-center justify-between gap-4">
											<div>
												<p className="text-lg font-semibold tracking-tight">{item.name}</p>
												<p className="text-sm text-[#e6dcf5]">{item.role}</p>
											</div>
											<div className="text-right">
												<p className="text-xl font-bold">{item.rating.toFixed(1)}</p>
												<StarRating rating={item.rating} readonly size="sm" />
											</div>
										</div>

										<p className="mt-4 text-sm text-slate-200 leading-relaxed">
											“{item.feedback}”
										</p>

										{item.createdAt ? (
											<p className="mt-4 text-xs text-slate-400">
												{formatDate(item.createdAt)}
											</p>
										) : null}
									</article>
								))}
							</div>

							{/* Right Scroll Button */}
							<button
								onClick={scrollRight}
								className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-white/5 border border-white/10 backdrop-blur text-white px-3 py-2 rounded-full opacity-30 group-hover:opacity-70 transition"
							>
								›
							</button>
						</div>
					) : (
						<div className="flex items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-sm text-slate-300">
							{loading ? 'Loading ratings…' : 'No public ratings to display yet.'}
						</div>
					)}

					{loading && (
						<p className="mt-6 text-sm text-slate-400">Fetching the latest reviews…</p>
					)}
				</div>
			</div>

			{/* Custom CSS to hide scrollbar */}
			<style>{`
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
				.scrollbar-hide {
					-ms-overflow-style: none; /* IE and Edge */
					scrollbar-width: none; /* Firefox */
				}
			`}</style>
		</section>
	);
};

export default InfiniteRatingScroll;
