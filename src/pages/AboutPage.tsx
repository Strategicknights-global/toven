import React from 'react';
// Removed unused imports after footer extraction
import Footer from '../components/Footer';
import Topbar from '../components/Topbar';
import { usePlacementBanners } from '../stores/publicBannersStore';
import { getBannerAlt, getBannerImageSrc } from '../utils/bannerUtils';
import AboutUsCards from '../components/AboutUsCards';
import {
  CalendarClock,
  ChefHat,
  ClipboardCheck,
  HeartPulse,
  Package,
  SlidersHorizontal,
  Timer,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { Clock, Truck, Sandwich as Lunch } from "lucide-react";
import type { LucideIcon } from 'lucide-react';

type Differentiator = {
  title: string;
  description: string;
  icon: LucideIcon;
  accentBg: string;
  accentText: string;
  glow: string;
};


const DIFFERENTIATORS: Differentiator[] = [
  {
    title: 'Pre-Order, Zero Waste',
    description: 'We prepare only what is pre-booked, keeping every plate fresh and eliminating kitchen waste.',
    icon: ClipboardCheck,
    accentBg: 'bg-purple-100/80',
    accentText: 'text-purple-700',
    glow: 'from-purple-400/25 via-purple-300/15 to-transparent',
  },
  {
    title: 'Homemade Craftsmanship',
    description: 'Family-style recipes cooked with slow techniques that honour homely flavours.',
    icon: ChefHat,
    accentBg: 'bg-amber-100/80',
    accentText: 'text-amber-600',
    glow: 'from-amber-300/25 via-amber-200/15 to-transparent',
  },
  {
    title: 'Plans Made Yours',
    description: 'Pick cuisines, portions, and nutrition goals that match exactly how you want to eat.',
    icon: SlidersHorizontal,
    accentBg: 'bg-emerald-100/80',
    accentText: 'text-emerald-600',
    glow: 'from-emerald-300/25 via-emerald-200/15 to-transparent',
  },
  {
    title: 'Curated Add-ons & Sides',
    description: 'Top up with breakfast bowls, desserts, or extras that keep the excitement in every box.',
    icon: UtensilsCrossed,
    accentBg: 'bg-rose-100/80',
    accentText: 'text-rose-600',
    glow: 'from-rose-300/25 via-rose-200/15 to-transparent',
  },
  {
    title: 'Flexible Scheduling',
    description: 'Pause, skip, or shift delivery days in seconds when your calendar changes.',
    icon: CalendarClock,
    accentBg: 'bg-sky-100/80',
    accentText: 'text-sky-600',
    glow: 'from-sky-300/25 via-sky-200/15 to-transparent',
  },
  {
    title: 'Dependable Delivery',
    description: '98% on-time arrivals powered by mapped routes and warm insulated carriers.',
    icon: Timer,
    accentBg: 'bg-indigo-100/80',
    accentText: 'text-indigo-600',
    glow: 'from-indigo-300/25 via-indigo-200/15 to-transparent',
  },
  {
    title: 'Premium Packing',
    description: 'Leak-proof, recyclable packs that lock in aroma, heat, and hygiene for every course.',
    icon: Package,
    accentBg: 'bg-fuchsia-100/80',
    accentText: 'text-fuchsia-600',
    glow: 'from-fuchsia-300/25 via-fuchsia-200/15 to-transparent',
  },
  {
    title: 'Daily & Fitness Fuel',
    description: 'Wholesome classics and macro-counted fitness bowls — the spectrum you need to stay consistent.',
    icon: HeartPulse,
    accentBg: 'bg-teal-100/80',
    accentText: 'text-teal-600',
    glow: 'from-teal-300/25 via-teal-200/15 to-transparent',
  },
];

const revealOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px',
  threshold: 0.12,
};

const AboutPage: React.FC = () => {
  const { banners: aboutBanners } = usePlacementBanners('about');
  const heroBanner = aboutBanners[0];
  const heroImageSrc = getBannerImageSrc(heroBanner);
  const heroImageAlt = getBannerAlt(heroBanner, 'About Toven banner');

  React.useEffect(() => {
    const elements = document.querySelectorAll('[data-animate]');
    if (!elements.length) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          const target = entry.target as HTMLElement;
          if (target.dataset.animateOnce !== 'false') {
            observer.unobserve(entry.target);
          }
        }
      });
    }, revealOptions);

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar active="about" />

      {/* HERO / INTRO */}
      <section className="relative bg-gradient-to-br from-[#510088] to-purple-900 text-white overflow-hidden flex items-center justify-center mt-[4rem] min-h-[360px] sm:min-h-[420px] lg:min-h-[480px] animate-gradient-shift pb-16">
        {heroImageSrc && (
          <figure className="absolute inset-0 animate-fade-in">
            <img
              src={heroImageSrc}
              alt={heroImageAlt}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#6a0dad]/85 via-purple-800/75 to-purple-900/60" />
          </figure>
        )}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 lg:px-10 w-full text-center" data-animate>
          {/* <div className="flex justify-center gap-3 mb-8" data-animate data-animate-once="false">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-amber-200 animate-orbit-slow animate-glow-pulse text-xl" aria-hidden="true">✦</span>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-purple-200 animate-orbit-reverse animate-glow-pulse text-xl" style={{ animationDelay: '0.5s' }} aria-hidden="true">✺</span>
            </div> */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-zoom-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            About <span className="text-amber-400 animate-text-glow">Toven</span>
          </h1>
          <p className="text-base sm:text-lg text-purple-100 max-w-2xl mx-auto leading-relaxed animate-slide-in-left" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            India’s First Pre Order Only Food Ecosystem Built for Modern Indian Lifestyles
          </p>
          <div className="mt-10 flex items-center justify-center gap-6 sm:gap-10">
            <span className="p-3 bg-white/15 rounded-full backdrop-blur">
              <Clock size={26} />
            </span>

            <span className="p-3 bg-white/15 rounded-full backdrop-blur">
              <ChefHat size={26} />
            </span>

            <span className="p-3 bg-white/15 rounded-full backdrop-blur">
              <Truck size={26} />
            </span>

            <span className="p-3 bg-white/15 rounded-full backdrop-blur">
              <Lunch size={26} />
            </span>
          </div>

        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            className="relative block w-full h-[90px] fill-white"
          >
            <path
              d="M0,320 
         V160 
         C360,280 1080,280 1440,160 
         V320 
         H0 
         Z"
            />
          </svg>
        </div>

      </section>

      {/* WHY WE STARTED */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-6">

          <div className="flex justify-center animate-rotate-in" data-animate>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#510088]/15 text-[#510088] px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] animate-glow-pulse shadow-lg">
              Our Origin Story
            </span>
          </div>

          <div className="text-center">
            <h2
              className="font-semibold text-2xl sm:text-3xl mb-4 animate-zoom-in"
              data-animate
              style={{ animationDelay: "0.1s", animationFillMode: "both" }}
            >
              Why We <span className="text-[#510088]">Started?</span>
            </h2>
            <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-10" />
          </div>

          <p
            className="text-gray-600 leading-relaxed max-w-3xl mx-auto animate-slide-in-left"
            data-animate
            style={{ animationDelay: "0.15s", animationFillMode: "both" }}
          >
            TOVEN was not born out of a business plan. <br />
            It was born out of a problem we lived every single day. <br /><br />
            As students and working professionals, we struggled with the same challenges
            millions of people face:


            <ul className="text-gray-600 leading-relaxed max-w-3xl mx-auto space-y-1 list-none animate-slide-in-left"
              data-animate
              style={{ animationDelay: "0.18s", animationFillMode: "both" }}>
              <li>• Skipping meals</li>
              <li>• Eating unhealthy outside food</li>
              <li>• Spending too much in restaurants</li>
              <li>• Missing the comfort of home-cooked meals</li>
              <li>• Living on instant noodles and skipped dinner</li>
            </ul>
          </p>

          <p
            className="text-gray-600 leading-relaxed max-w-3xl mx-auto mt-4 animate-slide-in-left"
            data-animate
            style={{ animationDelay: "0.22s", animationFillMode: "both" }}
          >
            “What if good, homely food came to you… every day?” <br />
            That question became TOVEN. <br />
            We started TOVEN to build something more than just a cloud kitchen.
          </p>
          {/* ⭐ TOVEN IS FOR — #510088 ACCENTED & CENTERED BOXES ⭐ */}
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-[-31px] animate-fade-in"
            data-animate
            style={{ animationDelay: "0.3s", animationFillMode: "both" }}
          >
            <h2
              className="font-semibold text-2xl sm:text-3xl mb-4 text-center animate-zoom-in"
              data-animate
              style={{ animationDelay: "0.1s", animationFillMode: "both" }}
            >
              <span className="text-[#510088]">Toven</span> is for
            </h2>
            <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-17" />
            <div className="rounded-xl border border-[#510088]/30 bg-[#510088]/5 p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <h3 className="font-medium text-[#510088] text-base">
                Students away from home
              </h3>
            </div>

            <div className="rounded-xl border border-[#510088]/30 bg-[#510088]/5 p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <h3 className="font-medium text-[#510088] text-base">
                Gym goers & fitness-focused individuals
              </h3>
            </div>

            <div className="rounded-xl border border-[#510088]/30 bg-[#510088]/5 p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <h3 className="font-medium text-[#510088] text-base">
                Working professionals with no time to cook
              </h3>
            </div>

            <div className="rounded-xl border border-[#510088]/30 bg-[#510088]/5 p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <h3 className="font-medium text-[#510088] text-base">
                Hostellers and PG residents
              </h3>
            </div>

            <div className="rounded-xl border border-[#510088]/30 bg-[#510088]/5 p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <h3 className="font-medium text-[#510088] text-base">
                Corporate employees
              </h3>
            </div>

            <div className="rounded-xl border border-[#510088]/30 bg-[#510088]/5 p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <h3 className="font-medium text-[#510088] text-base">
                Elderly people living alone
              </h3>
            </div>
          </div>

        </div>
      </section>

      {/* VISION & MISSION */}
      <section className="py-16 md:py-20 bg-[#F7F7F7]">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 space-y-8 md:space-y-12">
          {/* Vision Card */}
          <div className="bg-[#510088] rounded-3xl text-white p-6 sm:p-8 md:p-10 flex flex-col items-center text-center shadow-xl">
            <div className="flex justify-center mb-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <Sparkles className="h-7 w-7" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-4">Our Vision</h3>
            <img src="/nline.png" alt="Curved underline" className="mx-auto w-32 -mt-10" />

            <p className="leading-relaxed text-sm md:text-base mt-2">
              To become India's most trusted and loved homely food ecosystem,
              delivering healthy, affordable, and customized meals to every
              individual, while redefining how modern India experiences
              everyday food.
            </p>
          </div>

          {/* Mission Card */}
          <div className="bg-[#510088] rounded-3xl text-white p-6 sm:p-8 md:p-10 flex flex-col items-center text-center shadow-xl">
            <div className="flex justify-center mb-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <ChefHat className="h-7 w-7" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-4">Our Mission</h3>
            <img src="/nline.png" alt="Curved underline" className="mx-auto w-32 -mt-10" />

            <p className="leading-relaxed text-sm md:text-base mt-2">
              To simplify daily eating with fresh, homely meals through
              a smart pre-order system — offering flexible plans, premium
              packaging, on-time delivery, and personalized choices for
              students, professionals, families, and seniors.
            </p>
          </div>
        </div>
      </section>


      {/* WHAT MAKES US DIFFERENT */}
      <section className="relative py-24 bg-white -mt-12 overflow-hidden">
        <div className="absolute inset-x-0 top-16 -z-10 mx-auto h-[520px] w-[520px] rounded-full bg-purple-100/35 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.05fr,1fr] items-start">
            <div>
              <div>
                <h2 className="text-center font-semibold text-2xl sm:text-3xl mb-8 animate-zoom-in" data-animate style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>Why makes us <span className="text-[#510088]">Different</span></h2>
                <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-15" />
              </div>
              <p className="mt-4 text-base leading-relaxed text-slate-600" data-animate style={{ animationDelay: '0.2s' }}>
                Not just a meal service – A complete food ecosystem built around your lifestyle
              </p>
              <div className="mt-10 grid gap-4 grid-cols-2">
                {/* Card 1 */}
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-purple-200/60 bg-white/75 p-4 shadow-sm transition-all duration-500 hover:shadow-2xl hover:scale-105 aspect-square">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100/80 text-purple-700 font-semibold text-lg">
                    8+
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-900">Reasons you'll stay</p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      From pre-planning to mindful packaging, every step is designed with you in mind.
                    </p>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-200/60 bg-white/75 p-4 shadow-sm transition-all duration-500 hover:shadow-2xl hover:scale-105 aspect-square">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100/80 text-amber-600 font-semibold text-lg">
                    98%
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-900">On-time delivery score</p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Precision routing keeps your meals hot, safe, and right on schedule.
                    </p>
                  </div>
                </div>
              </div>


            </div>
            <div className="relative">
              <div className="grid gap-6 sm:grid-cols-2">
                {DIFFERENTIATORS.map((feature, index) => {
                  const Icon = feature.icon;
                  const offsetClass = index % 2 === 1 ? 'lg:-translate-y-6' : '';
                  const transitionDelay = `${0.1 + index * 0.12}s`;
                  const pulseDelay = `${2 + index * 0.3}s`;
                  const cardStyle: React.CSSProperties & Record<'--pulse-delay', string> = {
                    transitionDelay,
                    '--pulse-delay': pulseDelay,
                  };
                  return (
                    <div
                      key={feature.title}
                      className={`group relative rounded-3xl border border-white/70 bg-white/90 p-6 sm:p-7 shadow-sm backdrop-blur transition-all duration-500 hover-zoom hover:shadow-2xl ${offsetClass}`}
                      style={cardStyle}
                      data-animate
                    >
                      <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.glow} opacity-10 group-hover:opacity-25 transition-opacity duration-500 animate-glow-fade`} aria-hidden="true" />
                      <div className="relative flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.accentBg} ${feature.accentText} ring-2 ring-white/70 shadow-sm transition-transform duration-300 group-hover:scale-125 animate-icon-float`}
                            style={{ animationDelay: pulseDelay }}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400 group-hover:text-purple-600 transition-colors">0{index + 1}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 leading-snug group-hover:text-purple-700 transition-colors">{feature.title}</h3>
                        <p className="text-sm leading-relaxed text-slate-600 group-hover:text-slate-700 transition-colors">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE OFFER - PRODUCT CARDS */}
      <section className="py-1 mt-[-49px] bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10" data-animate>
          <div>
            <h2 className="text-center font-semibold text-2xl sm:text-3xl mb-4 animate-zoom-in" data-animate style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>What We <span className="text-[#510088]">Offer</span></h2>
            <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-12" />

          </div>
          <div className="relative animate-slide-in-left" data-animate style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-purple-100/70" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl">
              <AboutUsCards variant="promoTile" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-2 bg-[#f7f7f7]">
        <div className="max-w-4xl mx-auto px-6 text-left">

          {/* Main heading */}
          <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-400 leading-tight">
            Live <br />
            it up!
          </h2>

          {/* Subtitle */}
          <p className="mt-6 text-gray-500 text-lg flex items-center gap-2">
            Crafted with
            <span className="text-red-500 text-xl">❤️</span>
            in Coimbatore, India
          </p>

          {/* Back to top button */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-10 inline-flex items-center gap-2 bg-[#111] text-white px-5 py-2 rounded-full shadow-md hover:bg-black transition"
          >
            <span className="text-sm">↑ Back to top</span>
          </button>

        </div>
      </section>



      {/* FOOTER (copied from landing for consistency) */}
      <Footer />

      {/* Animation Styles */}
      <style>{`
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
          
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
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
          
          .animate-fade-in {
            animation: fade-in 1s ease-out;
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
          
          .animate-gradient-shift {
            background-size: 200% 200%;
            animation: gradient-shift 15s ease infinite;
          }
          
          @keyframes card-lift {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-4px);
            }
          }
          
          @keyframes glow-fade {
            0%, 100% {
              opacity: 0.15;
            }
            50% {
              opacity: 0.35;
            }
          }
          
          @keyframes icon-bounce {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.15);
            }
          }
          
          @keyframes stat-pulse {
            0%, 100% {
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            }
            50% {
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
          }
          
          @keyframes number-pop {
            0%, 90%, 100% {
              transform: scale(1);
            }
            95% {
              transform: scale(1.2);
            }
          }
          
          @keyframes vision-glow {
            0%, 100% {
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            50% {
              box-shadow: 0 10px 25px -5px rgba(106, 13, 173, 0.15);
            }
          }
          
          @keyframes mission-glow {
            0%, 100% {
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            50% {
              box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.15);
            }
          }
          
          .animate-card-lift {
            animation: card-lift 4s ease-in-out infinite;
            animation-delay: var(--pulse-delay, 2s);
          }
          
          .animate-glow-fade {
            animation: glow-fade 4s ease-in-out infinite;
          }
          
          .animate-icon-bounce {
            animation: icon-bounce 3s ease-in-out infinite;
          }
          
          .animate-stat-pulse {
            animation: stat-pulse 3s ease-in-out infinite 2s;
          }
          
          .animate-number-pop {
            animation: number-pop 3s ease-in-out infinite;
          }
          
          .animate-vision-glow {
            animation: vision-glow 4s ease-in-out infinite 2s;
          }
          
          .animate-mission-glow {
            animation: mission-glow 4s ease-in-out infinite 2.5s;
          }

          .animate-team-pulse {
            animation: team-pulse 6s ease-in-out infinite;
          }

          .animate-orbit-slow {
            animation: orbit 9s linear infinite;
          }

          .animate-orbit-reverse {
            animation: orbit-reverse 11s linear infinite;
          }

          [data-animate] {
            --translate-y: 32px;
            --reveal-scale: 0.98;
            --hover-scale: 1;
            opacity: 0;
            transform: translateY(var(--translate-y)) scale(var(--reveal-scale)) scale(var(--hover-scale));
            transition: opacity 0.6s ease, transform 0.6s ease;
          }

          [data-animate].is-visible {
            opacity: 1;
            --translate-y: 0px;
            --reveal-scale: 1;
          }

          .hover-zoom {
            --hover-scale: 1;
            --hover-scale-target: 1.05;
            transition: transform 0.5s ease, box-shadow 0.5s ease;
            will-change: transform;
          }

          .hover-zoom:hover {
            --hover-scale: var(--hover-scale-target);
          }

          .hover-zoom:not([data-animate]) {
            transform: scale(var(--hover-scale));
          }

          @keyframes team-pulse {
            0%, 100% {
              box-shadow: 0 25px 50px -12px rgba(88, 28, 135, 0.25);
              transform: scale(1);
            }
            40% {
              box-shadow: 0 35px 65px -20px rgba(168, 85, 247, 0.4);
              transform: scale(1.03);
            }
            70% {
              box-shadow: 0 20px 40px -16px rgba(59, 130, 246, 0.25);
              transform: scale(0.995);
            }
          }

          @keyframes orbit {
            0% {
              transform: rotate(0deg) translateX(10px) rotate(0deg);
            }
            100% {
              transform: rotate(360deg) translateX(10px) rotate(-360deg);
            }
          }

          @keyframes orbit-reverse {
            0% {
              transform: rotate(0deg) translateX(-10px) rotate(0deg);
            }
            100% {
              transform: rotate(-360deg) translateX(-10px) rotate(360deg);
            }
          }

          /* ===== ENHANCED ANIMATIONS ===== */

          /* Hero Section - Letter reveal effect */
          @keyframes letter-slide {
            from {
              opacity: 0;
              transform: translateY(20px) rotateX(-90deg);
            }
            to {
              opacity: 1;
              transform: translateY(0) rotateX(0);
            }
          }

          .animate-letter-slide {
            animation: letter-slide 0.6s ease-out forwards;
          }

          /* Floating animation for team members */
          @keyframes float-subtle {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-12px);
            }
          }

          .animate-float {
            animation: float-subtle 4s ease-in-out infinite;
          }

          /* Staggered entrance from left */
          @keyframes slide-in-left {
            from {
              opacity: 0;
              transform: translateX(-40px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-slide-in-left {
            animation: slide-in-left 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          /* Staggered entrance from right */
          @keyframes slide-in-right {
            from {
              opacity: 0;
              transform: translateX(40px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-slide-in-right {
            animation: slide-in-right 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          /* Rotate entrance */
          @keyframes rotate-in {
            from {
              opacity: 0;
              transform: rotate(-10deg) scale(0.9);
            }
            to {
              opacity: 1;
              transform: rotate(0) scale(1);
            }
          }

          .animate-rotate-in {
            animation: rotate-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          /* Glow pulse on elements */
          @keyframes glow-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 0px rgba(168, 85, 247, 0.3));
            }
            50% {
              filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.6));
            }
          }

          .animate-glow-pulse {
            animation: glow-pulse 3s ease-in-out infinite;
          }

          /* Shimmer effect */
          @keyframes shimmer {
            0% {
              background-position: -1000px 0;
            }
            100% {
              background-position: 1000px 0;
            }
          }

          .animate-shimmer {
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
          }

          /* Enhanced feature card entrance */
          @keyframes card-entrance {
            from {
              opacity: 0;
              transform: translateY(30px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .animate-card-entrance {
            animation: card-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          /* Icon float animation */
          @keyframes icon-float {
            0%, 100% {
              transform: translateY(0px) translateX(0px);
            }
            33% {
              transform: translateY(-8px) translateX(2px);
            }
            66% {
              transform: translateY(-4px) translateX(-2px);
            }
          }

          .animate-icon-float {
            animation: icon-float 3s ease-in-out infinite;
          }

          /* Text highlight animation */
          @keyframes text-glow {
            0%, 100% {
              text-shadow: 0 0 0px rgba(251, 146, 60, 0);
            }
            50% {
              text-shadow: 0 0 10px rgba(251, 146, 60, 0.8);
            }
          }

          .animate-text-glow {
            animation: text-glow 3s ease-in-out infinite;
          }

          /* Parallax-like zoom entrance */
          @keyframes zoom-in {
            from {
              opacity: 0;
              transform: scale(0.85);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          .animate-zoom-in {
            animation: zoom-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          /* Counter animation for numbers */
          @keyframes counter-pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }

          .animate-counter {
            animation: counter-pulse 2s ease-in-out infinite;
          }

          /* Rotating background orb */
          @keyframes rotate-slow {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          .animate-rotate-slow {
            animation: rotate-slow 20s linear infinite;
          }

          /* Hover lift effect */
          .hover-lift {
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .hover-lift:hover {
            --hover-scale: 1.05;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          }

          /* Text reveal animation */
          @keyframes text-reveal {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-text-reveal {
            animation: text-reveal 0.6s ease-out forwards;
          }

          /* Blob animation */
          @keyframes blob-bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          .animate-blob-bounce {
            animation: blob-bounce 6s ease-in-out infinite;
          }

          /* Enhanced team glow */
          @keyframes team-glow-enhanced {
            0%, 100% {
              box-shadow: 0 0 20px rgba(168, 85, 247, 0.3), 0 25px 50px -12px rgba(88, 28, 135, 0.25);
            }
            50% {
              box-shadow: 0 0 40px rgba(168, 85, 247, 0.6), 0 35px 65px -20px rgba(168, 85, 247, 0.4);
            }
          }

          .animate-team-glow {
            animation: team-glow-enhanced 5s ease-in-out infinite;
          }
        `}</style>
    </div>
  );
};

export default AboutPage;
