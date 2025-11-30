import React, { useEffect, useRef, useState } from 'react';
import Topbar from '../components/Topbar';
import { Phone, Mail, MessageCircle } from 'lucide-react';
import Footer from '../components/Footer';
import { usePlacementBanners } from '../stores/publicBannersStore';
import { getBannerAlt, getBannerImageSrc } from '../utils/bannerUtils';
import { useCustomerInquiriesStore } from '../stores/customerInquiriesStore';

const ContactPage: React.FC = () => {
  const { banners: contactBanners } = usePlacementBanners('contact');
  const heroBanner = contactBanners[0];
  const heroImageSrc = getBannerImageSrc(heroBanner);
  const heroImageAlt = getBannerAlt(heroBanner, 'Contact hero banner');
  const createInquiry = useCustomerInquiriesStore((state) => state.createInquiry);
  const creating = useCustomerInquiriesStore((state) => state.creating);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const revealTargets: Array<{ element: HTMLElement | null; onVisible: () => void }> = [
      { element: heroRef.current, onVisible: () => setHeroVisible(true) },
      { element: infoRef.current, onVisible: () => setInfoVisible(true) },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          if (entry.target === heroRef.current) {
            setHeroVisible(true);
            observer.unobserve(entry.target);
          }
          if (entry.target === infoRef.current) {
            setInfoVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    revealTargets.forEach(({ element }) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      revealTargets.forEach(({ element }) => {
        if (element) {
          observer.unobserve(element);
        }
      });
      observer.disconnect();
    };
  }, []);

  const validateForm = () => {
    if (!name.trim()) {
      setFormError('Please share your name so we know who is reaching out.');
      return false;
    }
    if (!email.trim()) {
      setFormError('Enter an email address so we can reply.');
      return false;
    }
    if (!subject.trim()) {
      setFormError('Add a subject to help us route your message.');
      return false;
    }
    if (!message.trim()) {
      setFormError('Please add a short message.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!validateForm()) {
      return;
    }

    try {
      const createdId = await createInquiry({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      if (!createdId) {
        setFormError('We could not send your message. Please try again in a moment.');
        return;
      }

      setFormSuccess('Thank you for reaching out. Someone from our team will respond soon.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Failed to submit contact inquiry', error);
      setFormError('We could not send your message. Please try again in a moment.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar active="contact" />

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative bg-[#510088] text-white overflow-hidden mt-[4rem]"
      >
        {heroImageSrc && (
          <figure className="absolute inset-0">
            <img
              src={heroImageSrc}
              alt={heroImageAlt}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(event) => {
                const target = event.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const figure = target.closest('figure');
                if (figure) {
                  (figure as HTMLElement).style.display = 'none';
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#510088]/85 via-purple-600/75 to-purple-700/65" />
          </figure>
        )}

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl animate-pulse-slow" />
          <div className="pointer-events-none absolute top-1/2 -right-32 h-80 w-80 rounded-full bg-purple-300/10 blur-3xl animate-float-gentle" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-purple-400/8 blur-3xl animate-drift" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full py-16 sm:py-24">
          <div
            className={`text-center transition-all duration-1000 ease-out ${heroVisible
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-12'
              }`}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.28em] font-bold text-purple-100/90 backdrop-blur animate-bounce-subtle">
              We would love to help
            </span>

            <h1
              className={`mt-4 text-4xl uppercase sm:text-5xl font-bold leading-tight drop-shadow-lg transition-all duration-1000 delay-200 ease-out ${heroVisible
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-12'
                }`}
            >
              Get in touch
            </h1>

            <p
              className={`mt-3 text-purple-100 max-w-2xl mx-auto text-base sm:text-lg transition-all duration-1000 delay-300 ease-out ${heroVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
                }`}
            >
              We usually reply within 24 hours. Share a few details and our team will
              reach out.
            </p>
            <div className="relative z-20 mt-10 flex justify-center gap-6">
              {/* Phone */}
              <a
                href="tel:+919943677277"
                className="p-4 rounded-full bg-white/20 border border-white/30 backdrop-blur 
                 hover:bg-white/30 transition-all duration-200 shadow-lg"
              >
                <Phone className="w-6 h-6 text-white" />
              </a>

              {/* Mail */}
              <a
                href="mailto:tovenofficial@gmail.com"
                className="p-4 rounded-full bg-white/20 border border-white/30 backdrop-blur 
                 hover:bg-white/30 transition-all duration-200 shadow-lg"
              >
                <Mail className="w-6 h-6 text-white" />
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/919943677577"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-full bg-white/20 border border-white/30 backdrop-blur 
                 hover:bg-white/30 transition-all duration-200 shadow-lg"
              >
                <MessageCircle className="w-6 h-6 text-white" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom wave divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden -bottom-[1px]">
          <svg
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            className="block w-full h-[90px] fill-white"
          >
            <path d="M0,320 V160 C360,280 1080,280 1440,160 V320 H0 Z" />
          </svg>
        </div>

      </section>



      {/* MAIN CONTENT */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid gap-14 lg:grid-cols-[0.9fr,1.1fr] items-start">
          {/* Left: Contact methods */}
          <div
            ref={infoRef}
            className={`space-y-8 transition-all duration-700 ease-out ${infoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
          >
            <header>
              <h2 className="text-2xl font-semibold text-slate-900">
                Contact information
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Get in touch with us for any inquiries or support.
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
              {[
                {
                  label: 'Phone',
                  description: '9943677277, 9943677577',
                  icon: Phone,
                  badge: 'Talk to us',
                  link: 'tel:9943677277',
                },
                {
                  label: 'Email',
                  description: 'tovenofficial@gmail.com',
                  icon: Mail,
                  badge: 'Drop a note',
                  link: 'mailto:tovenofficial@gmail.com',
                },
                {
                  label: 'WhatsApp',
                  description: '9943677577',
                  icon: MessageCircle,
                  badge: 'Chat with us',
                  link: 'https://wa.me/919943677577',
                },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-500 hover:scale-105 hover:shadow-xl cursor-pointer"
                >
                  <div className="absolute inset-px rounded-[13px] bg-gradient-to-br from-purple-50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 flex-shrink-0 shadow-inner">
                      <item.icon className="h-5 w-5" />
                    </div>

                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100/60 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-700">
                        {item.badge}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </h3>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div className="relative bg-[#510088] rounded-2xl shadow-xl ring-1 ring-black/5 p-8 sm:p-10 md:p-12 text-white">
            <h2 className="text-2xl font-semibold text-center">Send us a <span className="text-[#E6660b]">message</span></h2>
            <img src="/nline.png" alt="Curved underline" className="mx-auto w-32 -mt-6" />


            <form className="grid gap-6" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="sr-only" htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full border border-white/40 bg-white/10 text-white placeholder-white/70 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    disabled={creating}
                    required
                  />
                </div>

                <div>
                  <label className="sr-only" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full border border-white/40 bg-white/10 text-white placeholder-white/70 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    disabled={creating}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="sr-only" htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full border border-white/40 bg-white/10 text-white placeholder-white/70 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                  disabled={creating}
                  required
                />
              </div>

              <div>
                <label className="sr-only" htmlFor="message">Message</label>
                <textarea
                  id="message"
                  placeholder="Write your message..."
                  rows={6}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full border border-white/40 bg-white/10 text-white placeholder-white/70 rounded-md px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                  disabled={creating}
                  required
                />
              </div>

              {formError ? (
                <div className="rounded-md border border-red-300 bg-red-600/20 px-4 py-2 text-sm text-red-100">
                  {formError}
                </div>
              ) : null}

              {formSuccess ? (
                <div className="rounded-md border border-emerald-300 bg-emerald-600/20 px-4 py-2 text-sm text-emerald-100">
                  {formSuccess}
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full bg-[#E6660b] text-white hover:bg-gray-100 font-semibold rounded-md py-3.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70 shadow-lg"
                disabled={creating}
              >
                {creating ? 'Sending…' : 'Send now'}
              </button>
            </form>
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

      {/* FOOTER */}
      <Footer />
      <style>{`
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes floatGentle {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -15px) scale(1.03); }
          66% { transform: translate(-15px, 10px) scale(0.98); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -20px) rotate(3deg); }
          50% { transform: translate(-20px, 15px) rotate(-2deg); }
          75% { transform: translate(25px, 20px) rotate(1deg); }
        }
        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-pulse-slow {
          animation: pulseSlow 8s ease-in-out infinite;
        }
        .animate-float-gentle {
          animation: floatGentle 15s ease-in-out infinite;
        }
        .animate-drift {
          animation: drift 20s ease-in-out infinite;
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ContactPage;
