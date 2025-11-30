import React from 'react';
import { ArrowRight, ChevronDown, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { useUserRoleStore } from '../stores/userRoleStore';
import { useSignupModalStore } from '../stores/signupModalStore';
import { usePlacementBanners } from '../stores/publicBannersStore';
import { getBannerAlt, getBannerImageSrc } from '../utils/bannerUtils';
import Footer from '../components/Footer.tsx';
import CategoryCardGrid from '../components/CategoryCardGrid';
import InfiniteRatingScroll from '../components/InfiniteRatingScroll';
import { ROUTES } from '../AppRoutes';
import { useConfigStore } from '../stores/configStore';
import { DEFAULT_STUDENT_DISCOUNT_PERCENT } from '../firestore/ConfigModel';

const WHY_CHOOSE_US_ITEMS = [
  { title: 'Homemade Quality', description: 'Every meal is crafted with love, just like home.' },
  { title: 'Customizable Plans', description: 'Tailor your subscription to fit your lifestyle.' },
  { title: 'On-Time Delivery', description: 'Fresh subscription meals delivered on schedule.' },
  { title: 'Flexible Scheduling', description: 'Adjust your delivery days anytime.' },
];



// Rotating word component (Trust -> Taste -> Love -> Quality) with fade-up animation
const RotatingWord: React.FC = () => {
  const words = React.useRef(['Trust', 'Taste', 'Love', 'Quality']).current;
  const [index, setIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<'enter' | 'idle' | 'exit'>('enter');

  React.useEffect(() => {
    const idleTimer = setTimeout(() => setPhase('exit'), 1800); // stay visible
    return () => clearTimeout(idleTimer);
  }, [index]);

  React.useEffect(() => {
    if (phase === 'exit') {
      const exitTimer = setTimeout(() => {
        setIndex(i => (i + 1) % words.length);
        setPhase('enter');
      }, 300); // match exit duration
      return () => clearTimeout(exitTimer);
    }
  }, [phase, words.length]);

  const base = 'inline-block text-transparent bg-clip-text bg-[#facc15] font-bold tracking-wide text-4xl sm:text-5xl lg:text-6xl relative';
  const stateClass =
    phase === 'enter'
      ? 'opacity-0 translate-y-4 animate-[fadeUp_0.4s_ease-out_forwards]'
      : phase === 'exit'
        ? 'opacity-100 translate-y-0 animate-[fadeDown_0.3s_ease-in_forwards]'
        : 'opacity-100';

  return (
    <div className="min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] flex items-center justify-center md:justify-start select-none">
      <span className={`${base} ${stateClass}`}>{words[index]}</span>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform: translateY(1rem);} to { opacity:1; transform: translateY(0);} }
        @keyframes fadeDown { from { opacity:1; transform: translateY(0);} to { opacity:0; transform: translateY(-0.75rem);} }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes bobCard { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-14px);} }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fade-in-float {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-float-left {
          /* Only animate translateY here. Keep translateX provided by the static class (-translate-x-1/2)
             to avoid transform conflicts and initial layout jumps. */
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-float-right {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }
        
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 1s ease-out;
        }
        
        .animate-fade-in-float {
          animation: fade-in-float 0.8s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
        
        .animate-fade-in-float-left {
          animation: fade-in-float-left 0.8s ease-out;
        }
        
        .animate-fade-in-float-right {
          animation: fade-in-float-right 0.8s ease-out;
        }
        
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          50% {
            box-shadow: 0 0 40px rgba(138, 43, 226, 0.5), 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
        }
        
        @keyframes subtle-zoom {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes pulse-shadow {
          0%, 100% {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          50% {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
          }
        }
        
        @keyframes button-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          50% {
            transform: scale(1.03);
            box-shadow: 0 10px 20px -3px rgba(245, 158, 11, 0.3);
          }
        }
        
        @keyframes button-secondary {
          0%, 100% {
            transform: scale(1);
            background-color: rgba(255, 255, 255, 0.1);
          }
          50% {
            transform: scale(1.02);
            background-color: rgba(255, 255, 255, 0.15);
          }
        }

      @keyframes marqueeLoopImmediate {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}



        .animate-glow-pulse {
          animation: glow-pulse 4s ease-in-out infinite;
        }
        
        .animate-subtle-zoom {
          animation: subtle-zoom 8s ease-in-out infinite;
        }
        
        .animate-card-pulse-shadow {
          animation: pulse-shadow 3s ease-in-out infinite;
        }
        
        .animate-button-pulse {
          animation: button-pulse 2.5s ease-in-out infinite 2s;
        }
        
        .animate-button-secondary {
          animation: button-secondary 2.5s ease-in-out infinite 2.5s;
        }
      `}</style>
    </div>
  );
};

// Removed unused components Pill and FeatureCard

const LandingPage: React.FC = () => {
  const { user, loading } = useUserRoleStore();
  const { open: openSignup } = useSignupModalStore();
  const navigate = useNavigate();
  const config = useConfigStore((state) => state.config);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const loaded = useConfigStore((state) => state.loaded);

  React.useEffect(() => {
    if (!loaded) {
      void loadConfig();
    }
  }, [loaded, loadConfig]);

  const [expandedFaqIndex, setExpandedFaqIndex] = React.useState<number | null>(null);

  const handleGetStarted = () => {
    if (!user) {
      openSignup();
    } else {
      navigate(ROUTES.SUBSCRIPTION);
    }
  };

  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);

  const { banners: homeBanners } = usePlacementBanners('home');

  const studentDiscountPercent = Number(
    config?.studentDiscountPercent ?? DEFAULT_STUDENT_DISCOUNT_PERCENT,
  );
  const studentOfferEnabled = Number.isFinite(studentDiscountPercent) && studentDiscountPercent > 0;
  const studentDiscountLabel = studentOfferEnabled
    ? Number.isInteger(studentDiscountPercent)
      ? `${studentDiscountPercent}%`
      : `${studentDiscountPercent.toFixed(1)}%`
    : null;


  const homeCarouselItems = React.useMemo(
    () =>
      homeBanners
        .map((banner) => {
          const src = getBannerImageSrc(banner);
          if (!src) {
            return null;
          }
          return {
            src,
            alt: getBannerAlt(banner, 'Offer banner'),
          };
        })
        .filter((item): item is { src: string; alt: string } => item !== null),
    [homeBanners]
  );

  const carouselItems = homeCarouselItems;

  const slideCount = carouselItems.length;

  React.useEffect(() => {
    if (slideCount > 0 && currentSlide >= slideCount) {
      setCurrentSlide(0);
    }
  }, [currentSlide, slideCount]);


  const handleMouseDown = (e: React.MouseEvent) => {
    if (slideCount <= 1) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 30) {
      if (deltaX < 0 && currentSlide < slideCount - 1) {
        setCurrentSlide((prev) => Math.min(prev + 1, slideCount - 1));
      } else if (deltaX > 0 && currentSlide > 0) {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (slideCount <= 1) {
      return;
    }
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    const deltaX = e.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) > 30) {
      if (deltaX < 0 && currentSlide < slideCount - 1) {
        setCurrentSlide((prev) => Math.min(prev + 1, slideCount - 1));
      } else if (deltaX > 0 && currentSlide > 0) {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    }
  };

  // Random delays for bob animations
  const randomDelays = React.useRef(Array.from({ length: 20 }, () => (Math.random() * 4 + 0.2).toFixed(2))).current;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar active="home" variant="landing" />

      {/* HERO - Swiggy-like layout with left/right images */}
      <section className="relative bg-[#5A2D82] text-white overflow-hidden flex items-center justify-center pb-24 sm:pb-32" style={{ minHeight: 'calc(100vh - 4rem)', marginTop: '4rem' }}>
        {/* Decorative edge images (visible on all sizes, smaller on mobile) */}
        <img
          src="/banner3.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute top-[5px] left-[-125px] sm:left-[-180px] top-4 w-[200px] sm:w-[360px] md:w-[420px] lg:w-[520px] object-contain drop-shadow-xl lg:left-[-192px]"

        />
        <img
          src="/box.png"
          alt=""
          aria-hidden="true"
          className="
  pointer-events-none select-none absolute 
  right-[-150px] top-[20px] sm:-right-40 lg:-right-60 
  top-10 sm:top-2 lg:top-auto lg:bottom-0 
  w-[240px] sm:w-[300px] md:w-[460px] lg:w-[600px] 
  object-contain drop-shadow-xl rotate-[35deg]
"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full flex items-center justify-center">
          <div className="flex-1 flex flex-col justify-center h-full items-stretch sm:items-center text-center">
            <div className="flex flex-col items-stretch sm:items-center">
              <div className="animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                <RotatingWord />
              </div>
              <h1 className="text-xl sm:text-4xl lg:text-6xl font-bold leading-tight mt-4 mb-6 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                Beyond Every Bite
              </h1>
              <p className="text-base sm:text-medium text-purple-100 max-w-md animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                Customized to your taste, schedule, and lifestyle.
              </p>
              {/* Inline category cards row (max 4) */}
              <div className="mt-6 sm:mt-8 w-full max-w-6xl animate-fade-in-up" style={{ animationDelay: '0.55s', animationFillMode: 'both' }}>
                <CategoryCardGrid
                  placement="home-categories"
                  maxItems={4}
                  className="w-full"
                  mobileColumns={2}
                  variant="promoTile"
                  cardClassName="bg-white backdrop-blur-sm shadow-lg hover:shadow-2xl w-full sm:w-72"
                />
              </div>
              {/* Removed CTA buttons as requested */}
            </div>
          </div>
        </div>
      </section>

      {/* Inter-section highlight banner */}
      <div className="relative z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="relative h-0">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl">
              <div className="relative">

                {/* Background Glow */}
                <div
                  className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-r from-amber-400/70 via-white/60 to-purple-500/70 blur-xl opacity-80"
                  aria-hidden="true"
                />

                {/* Banner */}
                <div className="relative rounded-[2.5rem] border border-white/80 bg-gradient-to-r from-amber-50 via-purple-50 to-white px-6 sm:px-12 py-4 sm:py-5 shadow-[0_24px_55px_-25px_rgba(64,0,128,0.7)] overflow-hidden">

                  {/* Single moving line */}
                  <p
                    className="text-xl sm:text-base md:text-xl font-semibold text-[#5A2D82] tracking-wide whitespace-nowrap"
                    style={{
                      animation: "singleMarquee 10s linear infinite",
                    }}
                  >
                    Breakfast | Lunch | Dinner - 3 Meals at just 159/Day
                  </p>

                  {/* Animation */}
                  <style>
                    {`
                @keyframes singleMarquee {
                  0% {
                    transform: translateX(110%);
                  }
                  100% {
                    transform: translateX(-150%);
                  }
                }
              `}
                  </style>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* PRODUCT CARDS moved into hero */}

      {/* OFFERS BANNER */}
      <section className="bg-[#F7FBF9] py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <h2 className="text-center font-semibold text-2xl sm:text-3xl mb-10">Our Exciting Offers</h2>
          <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-15" />
          <div className="relative">
            <div
              className={`overflow-hidden aspect-[16/9] rounded-xl select-none ${slideCount > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-700 h-full rounded-xl"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {carouselItems.map((item, index) => (
                  <img
                    key={`${item.src}-${index}`}
                    src={item.src}
                    alt={item.alt}
                    className="min-w-full h-full object-contain pointer-events-none"
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-center mt-4 space-x-2">
              {carouselItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full ${index === currentSlide ? 'bg-[#6a0dad]' : 'bg-gray-300'}`}
                  disabled={index === currentSlide}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="relative pt-1 pb-16 bg-[#F7FBF9]">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-14">
            <h2 className="tracking-wide font-semibold text-2xl sm:text-3xl text-gray-800">
              Why <span className="text-[#5A2D82]">Choose</span> Us?
            </h2>
            <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-7" />
          </div>
          {/* Unified responsive layout */}
          <div className="relative mx-auto w-full" style={{ maxWidth: 'min(880px, 100%)', height: 'clamp(26rem, 60vw, 520px)' }}>
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-inner bg-gray-100 overflow-hidden flex items-center justify-center"
              style={{
                width: 'clamp(14rem, 48vw, 420px)',
                height: 'clamp(14rem, 48vw, 420px)',
                borderWidth: 'clamp(8px, 1.6vw, 14px)',
                borderColor: 'rgb(229, 231, 235)'
              }}
            >
              <img src="/why-choose-bg.webp" alt="Why choose us" className="w-full h-full object-cover" />
            </div>
            {/* Cards */}
            <div
              className="absolute bg-[#E6E6FA] rounded-2xl shadow-xl animate-[bobCard_6s_ease-in-out_infinite] border-4 border-[#5A2D82]"
              style={{
                top: 'clamp(-1rem, -3vw, 0rem)',
                left: 'clamp(0.5rem, 5vw, 7rem)',
                width: 'clamp(7.5rem, 35vw, 13rem)',
                padding: 'clamp(0.7rem, 2vw, 1.25rem)',
                animationDelay: `${(Number(randomDelays[8]) || 0)}s`
              }}
            >
              <h3 className="font-semibold mb-2 text-sm sm:text-base">{WHY_CHOOSE_US_ITEMS[0].title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{WHY_CHOOSE_US_ITEMS[0].description}</p>
            </div>
            <div
              className="absolute bg-[#E6E6FA] rounded-2xl shadow-xl animate-[bobCard_6s_ease-in-out_infinite] border-4 border-[#5A2D82]"
              style={{
                top: '65%',
                left: 'clamp(1.5rem, 1vw, 2rem)',
                transform: 'translateY(-50%)',
                width: 'clamp(7.5rem, 35vw, 13rem)',
                padding: 'clamp(0.7rem, 2vw, 1.25rem)',
                animationDelay: `${(Number(randomDelays[9]) || 0)}s`
              }}
            >
              <h3 className="font-semibold mb-2 text-sm sm:text-base">{WHY_CHOOSE_US_ITEMS[1].title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{WHY_CHOOSE_US_ITEMS[1].description}</p>
            </div>
            <div
              className="absolute bg-[#E6E6FA] rounded-2xl shadow-xl animate-[bobCard_6s_ease-in-out_infinite] border-4 border-[#5A2D82]"
              style={{
                top: 'clamp(-0.5rem, -2vw, 0.5rem)',
                right: 'clamp(0.5rem, 5vw, 7rem)',
                width: 'clamp(7.5rem, 35vw, 13rem)',
                padding: 'clamp(0.7rem, 2vw, 1.25rem)',
                animationDelay: `${(Number(randomDelays[10]) || 0)}s`
              }}
            >
              <h3 className="font-semibold mb-2 text-sm sm:text-base">{WHY_CHOOSE_US_ITEMS[2].title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{WHY_CHOOSE_US_ITEMS[2].description}</p>
            </div>
            <div
              className="absolute bg-[#E6E6FA] rounded-2xl shadow-xl animate-[bobCard_6s_ease-in-out_infinite] border-4 border-[#5A2D82]"
              style={{
                bottom: 'clamp(0.5rem, -2vw, 2rem)',
                right: 'clamp(0.5rem, 5vw, 4rem)',
                width: 'clamp(7.5rem, 35vw, 13rem)',
                padding: 'clamp(0.7rem, 2vw, 1.25rem)',
                animationDelay: `${(Number(randomDelays[11]) || 0)}s`
              }}
            >
              <h3 className="font-semibold mb-2 text-sm sm:text-base">{WHY_CHOOSE_US_ITEMS[3].title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{WHY_CHOOSE_US_ITEMS[3].description}</p>
            </div>
          </div>
        </div>
      </section>

      {studentOfferEnabled && studentDiscountLabel && (
        <section className="bg-[#f4efff] py-15">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 text-[#2b0b57]">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md">
                <GraduationCap className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#7a4fff]">Student benefit</p>
                <p className="text-2xl font-bold">
                  Verified students get {studentDiscountLabel} off every subscription cycle
                </p>
                <p className="text-sm text-[#4e3f68]">
                  Upload your campus ID during sign up and the discount applies automatically at checkout.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-[#d1c3ff] bg-white/70 px-4 py-3 text-sm font-semibold text-[#2b0b57] shadow-sm">
                {studentDiscountLabel} instant savings · Takes &lt; 10 mins to verify
              </div>
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 rounded-full bg-[#ffce4b] px-6 py-3 text-sm font-semibold text-[#2b0b57] shadow-md transition hover:bg-[#ffd86b]"
              >
                Claim student pricing
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEPS TO ORDER - Redesigned with awesome animations */}
      <section className="relative bg-white pt-24 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-block">
              <h2 className="text-3xl sm:text-3xl font-bold text-gray-900 mb-4">
                Steps to <span className="text-[#5A2D82]">Order</span>
              </h2>
              <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-11" />
            </div>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps and enjoy delicious meals delivered to your door
            </p>
          </div>

          {/* Steps Container */}
          <div className="relative">
            {/* Connecting Line - Desktop only */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2">
              <div className="sticky top-1/2 h-full bg-gradient-to-b from-purple-200 via-purple-300 to-purple-200 rounded-full" />
            </div>

            {/* Steps */}
            <div className="space-y-24 lg:space-y-32">
              {[
                {
                  number: '01',
                  title: 'Choose Your Meal',
                  description: 'Browse our diverse menu featuring homemade quality dishes. Filter by dietary preferences, cuisine type, or let our chef\'s recommendations guide you.',
                  image: '/step1.webp',
                  color: 'from-purple-500 to-purple-700',
                  accentColor: '#5A2D82',
                },
                {
                  number: '02',
                  title: 'Customize Your Plan',
                  description: 'Select your preferred meal combo, set delivery dates, and adjust portions. Our flexible scheduling ensures meals arrive exactly when you need them.',
                  image: '/step2.webp',
                  color: 'from-purple-600 to-purple-800',
                  accentColor: '#502883',
                },
                {
                  number: '03',
                  title: 'Enjoy Fresh Delivery',
                  description: 'Relax as your freshly prepared meals are delivered hot to your doorstep. Track your order in real-time and enjoy restaurant-quality food at home.',
                  image: '/step3.webp',
                  color: 'from-purple-500 to-purple-700',
                  accentColor: '#502883',
                },
              ].map((step, index) => {
                const isEven = index % 2 === 1;
                return (
                  <div
                    key={step.number}
                    className={`group relative flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${isEven ? 'lg:flex-row-reverse' : ''
                      }`}
                  >
                    {/* Step Number Badge - Desktop Center */}
                    <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="relative">
                        {/* Animated ring */}
                        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} opacity-20 animate-ping`} style={{ animationDuration: '3s' }} />
                        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} opacity-30 blur-xl`} />
                        {/* Badge */}
                        <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-2xl transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12`}>
                          <span className="text-2xl font-bold text-white">{step.number}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile: Single Card Container */}
                    <div className="lg:hidden w-full">
                      <div
                        className="group/card relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500"
                        style={{
                          animation: 'fadeInUp 0.8s ease-out forwards',
                          animationDelay: `${index * 0.2}s`,
                          opacity: 0,
                        }}
                      >
                        {/* Mobile Number Badge */}
                        <div className="absolute -top-4 left-8">
                          <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ring-4 ring-white`}>
                            <span className="text-xl font-bold text-white">{step.number}</span>
                          </div>
                        </div>

                        {/* Gradient border effect on hover */}
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 pointer-events-none`} />

                        <div className="relative">
                          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 mt-6">
                            {step.title}
                          </h3>
                          <p className="text-base text-gray-600 leading-relaxed mb-6">
                            {step.description}
                          </p>

                          {/* Image inside mobile card */}
                          <div className="relative mb-6">
                            <div className={`absolute -inset-2 bg-gradient-to-br ${step.color} opacity-20 blur-xl rounded-2xl`} />
                            <div className="relative rounded-xl overflow-hidden shadow-lg">
                              <div className="aspect-video bg-white rounded-xl">
                                <img
                                  src={step.image}
                                  alt={step.title}
                                  className="w-full h-full object-contain rounded-xl"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <button
                            onClick={handleGetStarted}
                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${step.color} text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300`}
                          >
                            <span>Get Started</span>
                            <ArrowRight className="w-5 h-5 transition-transform group-hover/card:translate-x-1" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop: Content Card */}
                    <div className={`hidden lg:block flex-1 ${isEven ? 'lg:text-right lg:items-end' : 'lg:text-left lg:items-start'}`}>
                      <div
                        className="group/card relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
                        style={{
                          animation: 'fadeInUp 0.8s ease-out forwards',
                          animationDelay: `${index * 0.2}s`,
                          opacity: 0,
                        }}
                      >
                        {/* Gradient border effect on hover */}
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 pointer-events-none`} />

                        <div className={`relative ${isEven ? 'lg:flex lg:flex-col lg:items-end' : ''}`}>
                          <h3 className={`text-2xl sm:text-3xl font-bold text-gray-900 mb-4 ${isEven ? 'lg:text-right' : ''}`}>
                            {step.title}
                          </h3>
                          <p className={`text-base text-gray-600 leading-relaxed mb-6 ${isEven ? 'lg:text-right' : ''}`}>
                            {step.description}
                          </p>

                          {/* CTA Button */}
                          <button
                            onClick={handleGetStarted}
                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${step.color} text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${isEven ? 'lg:flex-row-reverse' : ''
                              }`}
                          >
                            <span>Get Started</span>
                            <ArrowRight className={`w-5 h-5 transition-transform group-hover/card:translate-x-1 ${isEven ? 'lg:rotate-180 lg:group-hover/card:-translate-x-1' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop: Image Card */}
                    <div className="hidden lg:block flex-1 relative">
                      <div
                        className="relative group/img"
                        style={{
                          animation: 'fadeInUp 0.8s ease-out forwards',
                          animationDelay: `${index * 0.2 + 0.15}s`,
                          opacity: 0,
                        }}
                      >
                        {/* Glow effect */}
                        <div className={`absolute -inset-4 bg-gradient-to-br ${step.color} opacity-20 blur-2xl rounded-3xl transition-opacity duration-500 group-hover/img:opacity-40`} />

                        {/* Image container */}
                        <div className="relative rounded-2xl overflow-hidden shadow-xl transform transition-transform duration-500 group-hover/img:scale-105 group-hover/img:rotate-2 w-full max-w-md mx-auto">
                          <div className="aspect-video bg-white rounded-2xl">
                            <img
                              src={step.image}
                              alt={step.title}
                              className="w-full h-full object-contain rounded-2xl transition-transform duration-700 group-hover/img:scale-110"
                              loading="lazy"
                            />
                          </div>
                          {/* Overlay gradient on hover */}
                          <div className={`absolute inset-0 bg-gradient-to-t ${step.color} opacity-0 group-hover/img:opacity-20 transition-opacity duration-500`} />
                        </div>

                        {/* Floating badge */}
                        <div className={`absolute -bottom-4 ${isEven ? 'lg:-left-4' : 'lg:-right-4'} -right-4 lg:right-auto`}>
                          <div className={`bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 transform transition-transform duration-500 group-hover/img:scale-110`}>
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color} animate-pulse`} />
                            <span className="text-sm font-semibold text-gray-700">
                              {['Quick & Easy', 'Flexible', 'On Time'][index]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQ Section */}
          {config?.faqs && config.faqs.length > 0 && (
            <div className="mt-32">
              <div className="text-center mb-16">
                <h2
                  className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4"
                  style={{
                    animation: 'fadeInUp 0.8s ease-out forwards',
                    opacity: 0,
                  }}
                >
                  Frequently Asked Questions
                </h2>
                <p
                  className="text-lg text-gray-600 max-w-2xl mx-auto"
                  style={{
                    animation: 'fadeInUp 0.8s ease-out forwards',
                    animationDelay: '0.2s',
                    opacity: 0,
                  }}
                >
                  Got questions? We've got answers!
                </p>
              </div>

              <div className="max-w-3xl mx-auto space-y-4">
                {config.faqs.map((faq, index) => (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    style={{
                      animation: 'fadeInUp 0.8s ease-out forwards',
                      animationDelay: `${0.3 + index * 0.1}s`,
                      opacity: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIndex(expandedFaqIndex === index ? null : index)}
                      className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors duration-200"
                    >
                      <span className="text-lg font-semibold text-gray-900">{faq.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-[#502883] flex-shrink-0 transition-transform duration-300 ${expandedFaqIndex === index ? 'rotate-180' : ''
                          }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${expandedFaqIndex === index ? 'max-h-96' : 'max-h-0'
                        }`}
                    >
                      <div className="px-6 pb-5 text-gray-600 leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <InfiniteRatingScroll className="mt-32" />

        {/* Add keyframes for fade in animations */}
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};

export default LandingPage;